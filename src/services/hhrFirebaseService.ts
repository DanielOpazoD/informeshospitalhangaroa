import { getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import {
    getAuth,
    GoogleAuthProvider,
    onAuthStateChanged,
    signInWithPopup,
    signOut,
    type Auth,
    type User,
} from 'firebase/auth';
import { doc, getFirestore, onSnapshot, setDoc, type Firestore } from 'firebase/firestore';
import type {
    HhrAuthenticatedUser,
    HhrClinicalDocumentSaveResult,
    HhrClinicalSyncState,
    HhrCensusPatient,
} from '../hhrTypes';
import { buildHhrClinicalDocumentSave, mapHospitalCensusPatients } from '../utils/hhrIntegration';
import type { ClinicalRecord } from '../types';
import {
    getHhrFirebaseRuntimeConfig,
    getHhrHospitalId,
    isHhrFirebaseConfigured,
} from '../infrastructure/hhr/hhrConfig';

interface HhrFirebaseServices {
    app: FirebaseApp;
    auth: Auth;
    db: Firestore;
}

export interface HhrHospitalCensusSnapshot {
    dateKey: string;
    exists: boolean;
    patients: HhrCensusPatient[];
}

let cachedServices: HhrFirebaseServices | null = null;

const normalizeEmail = (value: string | null | undefined): string => (value || '').trim().toLowerCase();

const buildAuthenticatedUser = async (user: User): Promise<HhrAuthenticatedUser> => {
    const tokenResult = await user.getIdTokenResult();
    const roleClaim = typeof tokenResult.claims.role === 'string' ? tokenResult.claims.role : null;
    return {
        uid: user.uid,
        email: normalizeEmail(user.email),
        displayName: user.displayName || user.email || 'Usuario HHR',
        photoURL: user.photoURL || '',
        role: roleClaim,
    };
};

const getHhrFirebaseServices = (): HhrFirebaseServices => {
    if (cachedServices) {
        return cachedServices;
    }

    if (!isHhrFirebaseConfigured()) {
        throw new Error('La integración HHR requiere variables de entorno de Firebase.');
    }

    const runtimeConfig = getHhrFirebaseRuntimeConfig();
    const app = getApps().find(existingApp => existingApp.name === 'hhr-integration')
        || initializeApp(runtimeConfig.firebase as FirebaseOptions, 'hhr-integration');

    cachedServices = {
        app,
        auth: getAuth(app),
        db: getFirestore(app),
    };

    return cachedServices;
};

export const subscribeToHhrAuthState = (
    onResolvedUser: (user: HhrAuthenticatedUser | null) => void,
    onError?: (error: Error) => void
): (() => void) => {
    if (!isHhrFirebaseConfigured()) {
        onResolvedUser(null);
        return () => {};
    }

    const { auth } = getHhrFirebaseServices();
    return onAuthStateChanged(
        auth,
        user => {
            if (!user) {
                onResolvedUser(null);
                return;
            }

            void buildAuthenticatedUser(user)
                .then(onResolvedUser)
                .catch(error => onError?.(error instanceof Error ? error : new Error(String(error))));
        },
        error => onError?.(error instanceof Error ? error : new Error(String(error)))
    );
};

export const signInToHhrWithGoogle = async (): Promise<HhrAuthenticatedUser> => {
    const { auth } = getHhrFirebaseServices();
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const credential = await signInWithPopup(auth, provider);
    return buildAuthenticatedUser(credential.user);
};

export const signOutFromHhr = async (): Promise<void> => {
    const { auth } = getHhrFirebaseServices();
    await signOut(auth);
};

export const subscribeToHospitalCensus = (
    dateKey: string,
    onPatientsChange: (patients: HhrCensusPatient[]) => void,
    onError?: (error: Error) => void
): (() => void) => {
    return subscribeToHospitalCensusSnapshot(
        dateKey,
        snapshot => onPatientsChange(snapshot.exists ? snapshot.patients : []),
        onError,
    );
};

export const subscribeToHospitalCensusSnapshot = (
    dateKey: string,
    onSnapshotChange: (snapshot: HhrHospitalCensusSnapshot) => void,
    onError?: (error: Error) => void
): (() => void) => {
    const { db } = getHhrFirebaseServices();
    const snapshotRef = doc(db, 'hospitals', getHhrHospitalId(), 'dailyRecords', dateKey);

    return onSnapshot(
        snapshotRef,
        snapshot => {
            if (!snapshot.exists()) {
                onSnapshotChange({
                    dateKey,
                    exists: false,
                    patients: [],
                });
                return;
            }

            onSnapshotChange({
                dateKey,
                exists: true,
                patients: mapHospitalCensusPatients(snapshot.data(), dateKey),
            });
        },
        error => onError?.(error instanceof Error ? error : new Error(String(error)))
    );
};

export const saveClinicalDocumentToHhr = async ({
    record,
    actor,
    sourcePatient,
    syncState,
}: {
    record: ClinicalRecord;
    actor: HhrAuthenticatedUser;
    sourcePatient: HhrCensusPatient | null;
    syncState: HhrClinicalSyncState | null;
}): Promise<HhrClinicalDocumentSaveResult> => {
    const { db } = getHhrFirebaseServices();
    const built = buildHhrClinicalDocumentSave({
        record,
        actor,
        hospitalId: getHhrHospitalId(),
        sourcePatient,
        syncState,
    });

    await setDoc(
        doc(db, 'hospitals', getHhrHospitalId(), 'clinicalDocuments', built.documentId),
        built.payload,
        { merge: true }
    );

    return built.result;
};

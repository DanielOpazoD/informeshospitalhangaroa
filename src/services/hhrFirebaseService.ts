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

const REQUIRED_ENV_KEYS = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_APP_ID',
] as const;

type RequiredEnvKey = (typeof REQUIRED_ENV_KEYS)[number];

interface HhrFirebaseServices {
    app: FirebaseApp;
    auth: Auth;
    db: Firestore;
}

let cachedServices: HhrFirebaseServices | null = null;

const getImportMetaEnv = (): Record<string, string | undefined> =>
    typeof import.meta !== 'undefined'
        ? ((import.meta as { env?: Record<string, string | undefined> }).env ?? {})
        : {};

const normalizeEmail = (value: string | null | undefined): string => (value || '').trim().toLowerCase();

const readFirebaseConfig = (): FirebaseOptions => {
    const env = getImportMetaEnv();
    return {
        apiKey: env.VITE_FIREBASE_API_KEY,
        authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: env.VITE_FIREBASE_APP_ID,
    };
};

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

export const getHhrFirebaseMissingEnvKeys = (): RequiredEnvKey[] => {
    const env = getImportMetaEnv();
    return REQUIRED_ENV_KEYS.filter(key => !env[key]);
};

export const isHhrFirebaseConfigured = (): boolean => getHhrFirebaseMissingEnvKeys().length === 0;

export const getHhrHospitalId = (): string => getImportMetaEnv().VITE_HHR_FIREBASE_HOSPITAL_ID || 'hanga_roa';

const getHhrFirebaseServices = (): HhrFirebaseServices => {
    if (cachedServices) {
        return cachedServices;
    }

    if (!isHhrFirebaseConfigured()) {
        throw new Error('La integración HHR requiere variables de entorno de Firebase.');
    }

    const app = getApps().find(existingApp => existingApp.name === 'hhr-integration')
        || initializeApp(readFirebaseConfig(), 'hhr-integration');

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
    const { db } = getHhrFirebaseServices();
    const snapshotRef = doc(db, 'hospitals', getHhrHospitalId(), 'dailyRecords', dateKey);

    return onSnapshot(
        snapshotRef,
        snapshot => {
            if (!snapshot.exists()) {
                onPatientsChange([]);
                return;
            }

            onPatientsChange(mapHospitalCensusPatients(snapshot.data(), dateKey));
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

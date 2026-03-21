import type { AppResult, ClinicalRecord } from '../../types';
import type {
    HhrAuthenticatedUser,
    HhrClinicalDocumentSaveResult,
    HhrClinicalSyncState,
    HhrCensusPatient,
} from '../../hhrTypes';
import {
    saveClinicalDocumentToHhr,
    signInToHhrWithGoogle,
    signOutFromHhr,
    subscribeToHhrAuthState,
} from '../../services/hhrFirebaseService';

const toHhrError = (error: unknown, fallbackMessage: string, code: string): AppResult<never> => ({
    ok: false,
    error: {
        source: 'hhr',
        code,
        message: error instanceof Error ? error.message : fallbackMessage,
        retryable: true,
    },
});

export interface HhrGateway {
    signIn: () => Promise<AppResult<HhrAuthenticatedUser>>;
    signOut: () => Promise<AppResult<void>>;
    subscribeAuthState: (
        onUser: (user: HhrAuthenticatedUser | null) => void,
        onError: (error: Error) => void,
    ) => () => void;
    saveClinicalDocument: (params: {
        record: ClinicalRecord;
        actor: HhrAuthenticatedUser;
        sourcePatient: HhrCensusPatient | null;
        syncState: HhrClinicalSyncState | null;
    }) => Promise<AppResult<HhrClinicalDocumentSaveResult>>;
}

export const createHhrGateway = (): HhrGateway => ({
    signIn: async () => {
        try {
            return { ok: true, data: await signInToHhrWithGoogle() };
        } catch (error) {
            return toHhrError(error, 'No fue posible iniciar sesión en HHR.', 'sign_in');
        }
    },
    signOut: async () => {
        try {
            await signOutFromHhr();
            return { ok: true, data: undefined };
        } catch (error) {
            return toHhrError(error, 'No fue posible cerrar sesión en HHR.', 'sign_out');
        }
    },
    subscribeAuthState: (onUser, onError) => subscribeToHhrAuthState(onUser, onError),
    saveClinicalDocument: async (params) => {
        try {
            return { ok: true, data: await saveClinicalDocumentToHhr(params) };
        } catch (error) {
            return toHhrError(error, 'No fue posible guardar el documento clínico en HHR.', 'save_document');
        }
    },
});

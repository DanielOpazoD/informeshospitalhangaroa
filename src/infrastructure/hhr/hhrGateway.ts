import type { AppResult, ClinicalRecord } from '../../types';
import { GATEWAY_RETRY_ATTEMPTS, GATEWAY_TIMEOUT_MS } from '../../appConstants';
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
import { runWithResilience } from '../shared/resilience';

const isRetryableHhrError = (error: unknown): boolean => {
    const message = error instanceof Error ? error.message.toLowerCase() : '';
    return !message.includes('permission') && !message.includes('unauthorized');
};

const toHhrError = (error: unknown, fallbackMessage: string, code: string): AppResult<never> => ({
    ok: false,
    error: {
        source: 'hhr',
        code,
        message: error instanceof Error ? error.message : fallbackMessage,
        retryable: isRetryableHhrError(error),
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
            return {
                ok: true,
                data: await runWithResilience(
                    () => signInToHhrWithGoogle(),
                    {
                        attempts: GATEWAY_RETRY_ATTEMPTS,
                        timeoutMs: GATEWAY_TIMEOUT_MS,
                        label: 'Inicio de sesión HHR',
                        shouldRetry: isRetryableHhrError,
                    },
                ),
            };
        } catch (error) {
            return toHhrError(error, 'No fue posible iniciar sesión en HHR.', 'sign_in');
        }
    },
    signOut: async () => {
        try {
            await runWithResilience(
                () => signOutFromHhr(),
                {
                    attempts: GATEWAY_RETRY_ATTEMPTS,
                    timeoutMs: GATEWAY_TIMEOUT_MS,
                    label: 'Cierre de sesión HHR',
                    shouldRetry: isRetryableHhrError,
                },
            );
            return { ok: true, data: undefined };
        } catch (error) {
            return toHhrError(error, 'No fue posible cerrar sesión en HHR.', 'sign_out');
        }
    },
    subscribeAuthState: (onUser, onError) => subscribeToHhrAuthState(onUser, onError),
    saveClinicalDocument: async (params) => {
        try {
            return {
                ok: true,
                data: await runWithResilience(
                    () => saveClinicalDocumentToHhr(params),
                    {
                        attempts: GATEWAY_RETRY_ATTEMPTS,
                        timeoutMs: GATEWAY_TIMEOUT_MS,
                        label: 'Guardado clínico HHR',
                        shouldRetry: isRetryableHhrError,
                    },
                ),
            };
        } catch (error) {
            return toHhrError(error, 'No fue posible guardar el documento clínico en HHR.', 'save_document');
        }
    },
});

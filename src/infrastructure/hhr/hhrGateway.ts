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
import { appLogger } from '../shared/logger';

const getErrorMessage = (error: unknown, fallbackMessage: string): string =>
    error instanceof Error ? error.message : fallbackMessage;

const getErrorCode = (error: unknown): string =>
    typeof (error as { code?: unknown })?.code === 'string' ? String((error as { code: string }).code) : '';

const isCancelledHhrAuthError = (error: unknown): boolean => {
    const code = getErrorCode(error);
    return code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request';
};

const getHhrSignInErrorMessage = (error: unknown, fallbackMessage: string): string => {
    const code = getErrorCode(error);
    switch (code) {
        case 'auth/popup-blocked':
            return 'El navegador bloqueó la ventana de inicio de sesión HHR.';
        case 'auth/popup-closed-by-user':
        case 'auth/cancelled-popup-request':
            return 'Inicio de sesión HHR cancelado.';
        default:
            return getErrorMessage(error, fallbackMessage);
    }
};

const isRetryableHhrError = (error: unknown): boolean => {
    if (isCancelledHhrAuthError(error)) {
        return false;
    }

    const message = error instanceof Error ? error.message.toLowerCase() : '';
    return !message.includes('permission') && !message.includes('unauthorized');
};

const toHhrError = (
    error: unknown,
    fallbackMessage: string,
    operation: string,
    code: string,
    options?: {
        status?: 'timeout' | 'cancelled' | 'error';
        message?: string;
        retryable?: boolean;
        transient?: boolean;
    },
): AppResult<never> => ({
    ok: false,
    status: options?.status ?? (error instanceof Error && error.message.toLowerCase().includes('tiempo de espera') ? 'timeout' : 'error'),
    error: {
        source: 'hhr',
        code,
        operation,
        message: options?.message ?? getErrorMessage(error, fallbackMessage),
        transient: options?.transient ?? isRetryableHhrError(error),
        retryable: options?.retryable ?? isRetryableHhrError(error),
        httpStatus: typeof (error as { status?: unknown })?.status === 'number' ? (error as { status: number }).status : undefined,
        details: [fallbackMessage],
    },
});

const logGatewayEvent = (label: string) => (event: { type: string; attempt: number; error?: string }) => {
    if (event.type === 'start' || event.type === 'success') {
        return;
    }

    const suffix = event.error ? ` (${event.error})` : '';
    appLogger.warn('hhr-gateway', `${label} :: ${event.type} intento ${event.attempt}${suffix}`);
};

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
                status: 'complete',
                data: await signInToHhrWithGoogle(),
            };
        } catch (error) {
            if (isCancelledHhrAuthError(error)) {
                return toHhrError(
                    error,
                    'Inicio de sesión HHR cancelado.',
                    'sign_in',
                    'sign_in_cancelled',
                    {
                        status: 'cancelled',
                        message: getHhrSignInErrorMessage(error, 'Inicio de sesión HHR cancelado.'),
                        retryable: false,
                        transient: false,
                    },
                );
            }

            return toHhrError(error, 'No fue posible iniciar sesión en HHR.', 'sign_in', 'sign_in');
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
                    onEvent: logGatewayEvent('sign_out'),
                },
            );
            return { ok: true, data: undefined };
        } catch (error) {
            return toHhrError(error, 'No fue posible cerrar sesión en HHR.', 'sign_out', 'sign_out');
        }
    },
    subscribeAuthState: (onUser, onError) => subscribeToHhrAuthState(onUser, onError),
    saveClinicalDocument: async (params) => {
        try {
            return {
                ok: true,
                status: 'complete',
                data: await runWithResilience(
                    () => saveClinicalDocumentToHhr(params),
                    {
                        attempts: GATEWAY_RETRY_ATTEMPTS,
                        timeoutMs: GATEWAY_TIMEOUT_MS,
                        label: 'Guardado clínico HHR',
                        shouldRetry: isRetryableHhrError,
                        onEvent: logGatewayEvent('save_document'),
                    },
                ),
            };
        } catch (error) {
            return toHhrError(error, 'No fue posible guardar el documento clínico en HHR.', 'save_document', 'save_document');
        }
    },
});

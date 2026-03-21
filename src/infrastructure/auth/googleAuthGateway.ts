import type {
    AppResult,
    GoogleTokenClient,
    GoogleTokenResponse,
    GoogleUserProfile,
} from '../../types';
import { GATEWAY_RETRY_ATTEMPTS, GATEWAY_TIMEOUT_MS } from '../../appConstants';
import { decodeIdToken } from '../../utils/googleAuth';
import { runWithResilience } from '../shared/resilience';

const isRetryableAuthError = (error: unknown): boolean => {
    const message = error instanceof Error ? error.message.toLowerCase() : '';
    return !message.includes('init') && !message.includes('popup_closed_by_user');
};

const toAuthError = (error: unknown, fallbackMessage: string, operation: string, code: string): AppResult<never> => ({
    ok: false,
    error: {
        source: 'auth',
        code,
        operation,
        message: error instanceof Error ? error.message : fallbackMessage,
        transient: isRetryableAuthError(error),
        retryable: isRetryableAuthError(error),
        httpStatus: typeof (error as { status?: unknown })?.status === 'number' ? (error as { status: number }).status : undefined,
        details: [fallbackMessage],
    },
});

const logGatewayEvent = (label: string) => (event: { type: string; attempt: number; error?: string }) => {
    const suffix = event.error ? ` (${event.error})` : '';
    console.warn(`[auth-gateway] ${label} :: ${event.type} intento ${event.attempt}${suffix}`);
};

export interface GoogleAuthGateway {
    createTokenClient: (clientId: string, scope: string, callback: (response: GoogleTokenResponse) => void) => AppResult<GoogleTokenClient>;
    setAccessToken: (accessToken: string) => void;
    clearAccessToken: () => void;
    revoke: (email: string) => void;
    fetchUserProfile: (accessToken: string, idToken?: string) => Promise<AppResult<GoogleUserProfile>>;
}

export const createGoogleAuthGateway = (): GoogleAuthGateway => ({
    createTokenClient: (clientId, scope, callback) => {
        try {
            const client = window.google.accounts.oauth2.initTokenClient({
                client_id: clientId,
                scope,
                ux_mode: 'popup',
                callback,
            });
            return { ok: true, data: client };
        } catch (error) {
            return toAuthError(error, 'No se pudo inicializar el cliente de Google.', 'init_token_client', 'init_token_client');
        }
    },
    setAccessToken: (accessToken) => {
        window.gapi?.client?.setToken?.({ access_token: accessToken });
    },
    clearAccessToken: () => {
        window.gapi?.client?.setToken?.(null);
    },
    revoke: (email) => {
        if (email) {
            window.google?.accounts?.id?.revoke?.(email, () => {});
        }
    },
    fetchUserProfile: async (accessToken, idToken) => {
        try {
            const response = await runWithResilience(
                () => fetch('https://www.googleapis.com/oauth2/v1/userinfo?alt=json', {
                    headers: { Authorization: `Bearer ${accessToken}` },
                }),
                {
                    attempts: GATEWAY_RETRY_ATTEMPTS,
                    timeoutMs: GATEWAY_TIMEOUT_MS,
                    label: 'Perfil de Google',
                    shouldRetry: isRetryableAuthError,
                    onEvent: logGatewayEvent('fetch_profile'),
                },
            );
            if (!response.ok) {
                const authError = new Error(`Google profile request failed with status ${response.status}`);
                Object.assign(authError, { status: response.status });
                throw authError;
            }
            const profile = await response.json();
            const fallback = decodeIdToken(idToken);
            return {
                ok: true,
                data: {
                    name: profile?.name || fallback.name || '',
                    email: profile?.email || fallback.email || '',
                    picture: profile?.picture || fallback.picture || '',
                },
            };
        } catch (error) {
            const fallback = decodeIdToken(idToken);
            if (fallback.email || fallback.name || fallback.picture) {
                return {
                    ok: true,
                    data: {
                        name: fallback.name || '',
                        email: fallback.email || '',
                        picture: fallback.picture || '',
                    },
                    warnings: ['Se usó el ID token local para completar el perfil de usuario.'],
                };
            }
            return toAuthError(error, 'No se pudo obtener el perfil de Google.', 'fetch_profile', 'fetch_profile');
        }
    },
});

import type {
    AppResult,
    GoogleTokenClient,
    GoogleTokenResponse,
    GoogleUserProfile,
} from '../../types';
import { decodeIdToken } from '../../utils/googleAuth';

const toAuthError = (error: unknown, fallbackMessage: string, code: string): AppResult<never> => ({
    ok: false,
    error: {
        source: 'auth',
        code,
        message: error instanceof Error ? error.message : fallbackMessage,
        retryable: true,
    },
});

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
            return toAuthError(error, 'No se pudo inicializar el cliente de Google.', 'init_token_client');
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
            const response = await fetch('https://www.googleapis.com/oauth2/v1/userinfo?alt=json', {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
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
            return toAuthError(error, 'No se pudo obtener el perfil de Google.', 'fetch_profile');
        }
    },
});

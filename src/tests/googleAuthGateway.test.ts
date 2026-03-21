import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createGoogleAuthGateway } from '../infrastructure/auth/googleAuthGateway';
import type { GoogleTokenClient } from '../types';

describe('googleAuthGateway', () => {
    beforeEach(() => {
        const tokenClient: GoogleTokenClient = {
            requestAccessToken: vi.fn(),
        };

        window.google = {
            accounts: {
                oauth2: {
                    initTokenClient: vi.fn().mockReturnValue(tokenClient),
                },
                id: {
                    revoke: vi.fn(),
                },
            },
            picker: undefined as never,
        };
        window.gapi = {
            load: vi.fn(),
            client: {
                load: vi.fn(),
                getToken: vi.fn(),
                setToken: vi.fn(),
                drive: {
                    files: {
                        list: vi.fn(),
                        get: vi.fn(),
                        create: vi.fn(),
                    },
                },
            },
        };
    });

    it('crea el token client y delega el callback', () => {
        const gateway = createGoogleAuthGateway();
        const callback = vi.fn();
        const result = gateway.createTokenClient('client-id', 'scope-a', callback);

        expect(result.ok).toBe(true);
        expect(window.google.accounts.oauth2.initTokenClient).toHaveBeenCalledWith(expect.objectContaining({
            client_id: 'client-id',
            scope: 'scope-a',
            callback,
        }));
    });

    it('obtiene el perfil y usa fallback del id token cuando fetch falla', async () => {
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')));
        const payload = window.btoa(JSON.stringify({
            name: 'Test User',
            email: 'test@example.com',
            picture: 'https://image.test/pic.png',
        }));

        const gateway = createGoogleAuthGateway();
        const result = await gateway.fetchUserProfile('token-1', `x.${payload}.y`);

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.data.email).toBe('test@example.com');
            expect(result.warnings).toEqual(['Se usó el ID token local para completar el perfil de usuario.']);
        }
    });
});

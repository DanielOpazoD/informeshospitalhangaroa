import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import type { ReactNode } from 'react';
import type { GoogleTokenClient } from '../types';

vi.mock('../hooks/useGoogleApiBootstrap', () => ({
    useGoogleApiBootstrap: () => ({
        isGapiReady: false,
        isGisReady: false,
        isPickerApiReady: false,
    }),
}));

describe('AuthContext', () => {
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

    const wrapper = ({ children }: { children: ReactNode }) => (
        <AuthProvider clientId="fake-client-id" showToast={vi.fn()}>{children}</AuthProvider>
    );

    it('should initialize with default unauthenticated state', () => {
        const { result } = renderHook(() => useAuth(), { wrapper });

        expect(result.current.isSignedIn).toBe(false);
        expect(result.current.userProfile).toBeNull();
        expect(result.current.isGapiReady).toBe(false);
        expect(result.current.isGisReady).toBe(false);
    });

    it('should attempt to sign out', () => {
        const { result } = renderHook(() => useAuth(), { wrapper });

        // Verify the sign-out function runs without throwing when state is mostly mocked/empty
        expect(() => result.current.handleSignOut()).not.toThrow();
    });
});

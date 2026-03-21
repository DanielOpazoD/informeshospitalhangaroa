import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { GoogleUserProfile, GoogleTokenClient, GoogleTokenResponse, ToastFn } from '../types';
import { useGoogleApiBootstrap } from '../hooks/useGoogleApiBootstrap';
import { createGoogleAuthGateway } from '../infrastructure/auth/googleAuthGateway';

interface AuthContextValue {
    isSignedIn: boolean;
    userProfile: GoogleUserProfile | null;
    tokenClient: GoogleTokenClient | null;
    isGapiReady: boolean;
    isGisReady: boolean;
    isPickerApiReady: boolean;
    handleSignIn: () => void;
    handleSignOut: () => void;
    handleChangeUser: () => void;
}

interface AuthProviderProps {
    clientId: string;
    showToast: ToastFn;
    children: React.ReactNode;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const SCOPES = [
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
    'openid'
].join(' ');

export const AuthProvider: React.FC<AuthProviderProps> = ({ clientId, showToast, children }) => {
    const [isSignedIn, setIsSignedIn] = useState(false);
    const [userProfile, setUserProfile] = useState<GoogleUserProfile | null>(null);
    const [tokenClient, setTokenClient] = useState<GoogleTokenClient | null>(null);
    const googleAuthGateway = useMemo(() => createGoogleAuthGateway(), []);
    const {
        isGapiReady,
        isGisReady,
        isPickerApiReady,
    } = useGoogleApiBootstrap(showToast);

    const fetchUserProfile = useCallback(async (accessToken: string, idToken?: string) => {
        const profileResult = await googleAuthGateway.fetchUserProfile(accessToken, idToken);
        if (profileResult.ok) {
            setUserProfile(profileResult.data);
            return;
        }
        console.error('Error fetching user profile:', profileResult.error.message);
    }, [googleAuthGateway]);

    useEffect(() => {
        if (isGisReady && clientId) {
            const clientResult = googleAuthGateway.createTokenClient(clientId, SCOPES, (tokenResponse: GoogleTokenResponse) => {
                if (tokenResponse.error) {
                    console.error('Token response error:', tokenResponse.error);
                    return;
                }
                if (tokenResponse.access_token) {
                    googleAuthGateway.setAccessToken(tokenResponse.access_token);
                    setIsSignedIn(true);
                    void fetchUserProfile(tokenResponse.access_token, tokenResponse.id_token);
                }
            });
            if (clientResult.ok) {
                setTokenClient(clientResult.data);
            } else {
                console.error('Error initializing token client:', clientResult.error.message);
                showToast(clientResult.error.message, 'error');
            }
        }
    }, [clientId, fetchUserProfile, googleAuthGateway, isGisReady, showToast]);

    const handleSignIn = useCallback(() => {
        if (tokenClient) {
            tokenClient.requestAccessToken({ prompt: '' });
        } else {
            showToast('El cliente de Google no está listo. Por favor, inténtelo de nuevo.', 'error');
        }
    }, [showToast, tokenClient]);

    const handleChangeUser = useCallback(() => {
        if (tokenClient) {
            tokenClient.requestAccessToken({ prompt: 'select_account' });
        }
    }, [tokenClient]);

    const handleSignOut = useCallback(() => {
        setIsSignedIn(false);
        setUserProfile(null);
        googleAuthGateway.clearAccessToken();
        googleAuthGateway.revoke(userProfile?.email || '');
    }, [googleAuthGateway, userProfile?.email]);

    const value = useMemo(
        () => ({
            isSignedIn,
            userProfile,
            tokenClient,
            isGapiReady,
            isGisReady,
            isPickerApiReady,
            handleSignIn,
            handleSignOut,
            handleChangeUser,
        }),
        [handleChangeUser, handleSignIn, handleSignOut, isGapiReady, isGisReady, isPickerApiReady, isSignedIn, tokenClient, userProfile],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

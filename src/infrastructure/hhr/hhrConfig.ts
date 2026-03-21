import type { FirebaseOptions } from 'firebase/app';

const REQUIRED_ENV_KEYS = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_APP_ID',
] as const;

export type RequiredEnvKey = (typeof REQUIRED_ENV_KEYS)[number];

export interface HhrFirebaseRuntimeConfig {
    firebase: FirebaseOptions;
    hospitalId: string;
    missingEnvKeys: RequiredEnvKey[];
    configured: boolean;
}

const getImportMetaEnv = (): Record<string, string | undefined> =>
    typeof import.meta !== 'undefined'
        ? ((import.meta as { env?: Record<string, string | undefined> }).env ?? {})
        : {};

export const resolveHhrFirebaseRuntimeConfig = (
    env: Record<string, string | undefined> = getImportMetaEnv(),
): HhrFirebaseRuntimeConfig => {
    const missingEnvKeys = REQUIRED_ENV_KEYS.filter(key => !env[key]);

    return {
        firebase: {
            apiKey: env.VITE_FIREBASE_API_KEY,
            authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
            projectId: env.VITE_FIREBASE_PROJECT_ID,
            storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
            messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
            appId: env.VITE_FIREBASE_APP_ID,
        },
        hospitalId: env.VITE_HHR_FIREBASE_HOSPITAL_ID || 'hanga_roa',
        missingEnvKeys,
        configured: missingEnvKeys.length === 0,
    };
};

let cachedRuntimeConfig: HhrFirebaseRuntimeConfig | null = null;

export const getHhrFirebaseRuntimeConfig = (): HhrFirebaseRuntimeConfig => {
    if (cachedRuntimeConfig) {
        return cachedRuntimeConfig;
    }

    cachedRuntimeConfig = resolveHhrFirebaseRuntimeConfig();
    return cachedRuntimeConfig;
};

export const getHhrFirebaseMissingEnvKeys = (): RequiredEnvKey[] => getHhrFirebaseRuntimeConfig().missingEnvKeys;
export const isHhrFirebaseConfigured = (): boolean => getHhrFirebaseRuntimeConfig().configured;
export const getHhrHospitalId = (): string => getHhrFirebaseRuntimeConfig().hospitalId;

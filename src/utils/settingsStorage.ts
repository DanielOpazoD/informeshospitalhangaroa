import { DEFAULT_GOOGLE_CLIENT_ID, LOCAL_STORAGE_KEYS } from '../appConstants';
import { normalizeGeminiModelId } from './env';
import {
    getBrowserSessionStorageAdapter,
    getBrowserStorageAdapter,
    type StorageAdapter,
} from './storageAdapter';

export interface PersistedSettings {
    googleClientId: string;
    geminiProjectId: string;
    geminiModel: string;
}

export interface RuntimeSettings extends PersistedSettings {
    googleApiKey: string;
    geminiApiKey: string;
}

export interface LoadedSettings extends Partial<RuntimeSettings> {
    migratedSensitiveKeys: boolean;
}

const sanitizeValue = (value: string | null): string => value?.trim() ?? '';

export const loadPersistedSettings = (
    storage: StorageAdapter | null = getBrowserStorageAdapter(),
    sessionStorage: StorageAdapter | null = getBrowserSessionStorageAdapter(),
): LoadedSettings => {
    if (!storage && !sessionStorage) {
        return { migratedSensitiveKeys: false };
    }

    const localGoogleApiKey = sanitizeValue(storage?.getItem(LOCAL_STORAGE_KEYS.googleApiKey) ?? null);
    const localGeminiApiKey = sanitizeValue(storage?.getItem(LOCAL_STORAGE_KEYS.geminiApiKey) ?? null);
    const sessionGoogleApiKey = sanitizeValue(sessionStorage?.getItem(LOCAL_STORAGE_KEYS.googleApiKey) ?? null);
    const sessionGeminiApiKey = sanitizeValue(sessionStorage?.getItem(LOCAL_STORAGE_KEYS.geminiApiKey) ?? null);
    const googleClientId = sanitizeValue(storage?.getItem(LOCAL_STORAGE_KEYS.googleClientId) ?? null);
    const geminiProjectId = sanitizeValue(storage?.getItem(LOCAL_STORAGE_KEYS.geminiProjectId) ?? null);
    const geminiModel = sanitizeValue(storage?.getItem(LOCAL_STORAGE_KEYS.geminiModel) ?? null);
    const googleApiKey = sessionGoogleApiKey || localGoogleApiKey;
    const geminiApiKey = sessionGeminiApiKey || localGeminiApiKey;

    return {
        ...(googleApiKey ? { googleApiKey } : {}),
        ...(googleClientId ? { googleClientId } : {}),
        ...(geminiApiKey ? { geminiApiKey } : {}),
        ...(geminiProjectId ? { geminiProjectId } : {}),
        ...(geminiModel ? { geminiModel } : {}),
        migratedSensitiveKeys: Boolean((localGoogleApiKey || localGeminiApiKey) && !sessionGoogleApiKey && !sessionGeminiApiKey),
    };
};

export const persistSettings = (
    settings: Partial<RuntimeSettings>,
    storage: StorageAdapter | null = getBrowserStorageAdapter(),
    sessionStorage: StorageAdapter | null = getBrowserSessionStorageAdapter(),
): void => {
    if (!storage && !sessionStorage) {
        return;
    }

    const localEntries: Array<[keyof PersistedSettings, string]> = [
        ['googleClientId', LOCAL_STORAGE_KEYS.googleClientId],
        ['geminiProjectId', LOCAL_STORAGE_KEYS.geminiProjectId],
        ['geminiModel', LOCAL_STORAGE_KEYS.geminiModel],
    ];

    localEntries.forEach(([field, key]) => {
        const sanitized = sanitizeValue(settings[field] ?? null);
        if (!sanitized) {
            storage?.removeItem(key);
            return;
        }

        const valueToStore = field === 'geminiModel' ? normalizeGeminiModelId(sanitized) : sanitized;
        storage?.setItem(key, valueToStore);
    });

    const sensitiveEntries: Array<['googleApiKey' | 'geminiApiKey', string]> = [
        ['googleApiKey', LOCAL_STORAGE_KEYS.googleApiKey],
        ['geminiApiKey', LOCAL_STORAGE_KEYS.geminiApiKey],
    ];

    sensitiveEntries.forEach(([field, key]) => {
        storage?.removeItem(key);
        const sanitized = sanitizeValue(settings[field] ?? null);
        if (!sanitized) {
            sessionStorage?.removeItem(key);
            return;
        }

        sessionStorage?.setItem(key, sanitized);
    });
};

export const clearPersistedSettings = (
    storage: StorageAdapter | null = getBrowserStorageAdapter(),
    sessionStorage: StorageAdapter | null = getBrowserSessionStorageAdapter(),
): void => {
    if (!storage && !sessionStorage) {
        return;
    }

    storage?.removeItem(LOCAL_STORAGE_KEYS.googleApiKey);
    storage?.removeItem(LOCAL_STORAGE_KEYS.googleClientId);
    storage?.removeItem(LOCAL_STORAGE_KEYS.geminiApiKey);
    storage?.removeItem(LOCAL_STORAGE_KEYS.geminiProjectId);
    storage?.removeItem(LOCAL_STORAGE_KEYS.geminiModel);
    sessionStorage?.removeItem(LOCAL_STORAGE_KEYS.googleApiKey);
    sessionStorage?.removeItem(LOCAL_STORAGE_KEYS.geminiApiKey);
};

export const resolveClientId = (savedClientId?: string): string => {
    const sanitized = sanitizeValue(savedClientId ?? null);
    return sanitized || DEFAULT_GOOGLE_CLIENT_ID;
};

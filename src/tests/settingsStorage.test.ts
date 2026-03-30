
import { afterEach, describe, it, expect } from 'vitest';
import { DEFAULT_GOOGLE_CLIENT_ID, LOCAL_STORAGE_KEYS } from '../appConstants';
import {
    clearPersistedSettings,
    loadPersistedSettings,
    persistSettings,
    resolveClientId,
} from '../utils/settingsStorage';

type StorageMap = Map<string, string>;

const createMockStorage = () => {
    const values: StorageMap = new Map();

    const storage: Storage = {
        get length() {
            return values.size;
        },
        clear: () => values.clear(),
        getItem: (key: string) => values.get(key) ?? null,
        key: (index: number) => Array.from(values.keys())[index] ?? null,
        removeItem: (key: string) => {
            values.delete(key);
        },
        setItem: (key: string, value: string) => {
            values.set(key, value);
        },
    };

    return { storage, values };
};

const installMockWindow = () => {
    const { storage, values } = createMockStorage();
    const { storage: sessionStorage, values: sessionValues } = createMockStorage();
    const previousWindow = (globalThis as { window?: Window }).window;
    Object.assign(globalThis, { window: { localStorage: storage, sessionStorage } });

    return {
        values,
        sessionValues,
        restore: () => {
            if (previousWindow) {
                Object.assign(globalThis, { window: previousWindow });
            } else {
                Reflect.deleteProperty(globalThis, 'window');
            }
        },
    };
};

afterEach(() => {
    Reflect.deleteProperty(globalThis, 'window');
});

describe('settingsStorage', () => {
    it('guarda API keys en sessionStorage y persistencia estable en localStorage', () => {
        const { values, sessionValues, restore } = installMockWindow();

        persistSettings({
            googleApiKey: '  api-key  ',
            googleClientId: '  client-123  ',
            geminiApiKey: ' gem-key ',
            geminiProjectId: ' 12345 ',
            geminiModel: ' gemini-2.0-flash @v1beta ',
        });

        const saved = loadPersistedSettings();
        expect(saved).toEqual({
            googleApiKey: 'api-key',
            googleClientId: 'client-123',
            geminiApiKey: 'gem-key',
            geminiProjectId: '12345',
            geminiModel: 'gemini-2.0-flash@v1beta',
            migratedSensitiveKeys: false,
        });
        expect(values.has(LOCAL_STORAGE_KEYS.googleApiKey)).toBe(false);
        expect(values.has(LOCAL_STORAGE_KEYS.geminiApiKey)).toBe(false);
        expect(sessionValues.get(LOCAL_STORAGE_KEYS.googleApiKey)).toBe('api-key');
        expect(sessionValues.get(LOCAL_STORAGE_KEYS.geminiApiKey)).toBe('gem-key');
        expect(values.get(LOCAL_STORAGE_KEYS.geminiModel)).toBe('gemini-2.0-flash@v1beta');

        restore();
    });

    it('migra claves sensibles heredadas desde localStorage solo para la sesión activa', () => {
        const { storage, values } = createMockStorage();
        const { storage: sessionStorage, values: sessionValues } = createMockStorage();
        values.set(LOCAL_STORAGE_KEYS.googleApiKey, 'existing');
        values.set(LOCAL_STORAGE_KEYS.geminiApiKey, 'existing');
        Object.assign(globalThis, { window: { localStorage: storage, sessionStorage } });

        const loaded = loadPersistedSettings();

        expect(loaded.googleApiKey).toBe('existing');
        expect(loaded.geminiApiKey).toBe('existing');
        expect(loaded.migratedSensitiveKeys).toBe(true);
        expect(sessionValues.has(LOCAL_STORAGE_KEYS.googleApiKey)).toBe(false);
    });

    it('limpia toda la configuración persistida', () => {
        const { storage, values } = createMockStorage();
        const { storage: sessionStorage, values: sessionValues } = createMockStorage();
        Object.values(LOCAL_STORAGE_KEYS).forEach(key => values.set(key, 'value'));
        Object.assign(globalThis, { window: { localStorage: storage, sessionStorage } });
        sessionValues.set(LOCAL_STORAGE_KEYS.googleApiKey, 'value');
        sessionValues.set(LOCAL_STORAGE_KEYS.geminiApiKey, 'value');

        clearPersistedSettings();

        expect(values.has(LOCAL_STORAGE_KEYS.googleApiKey)).toBe(false);
        expect(values.has(LOCAL_STORAGE_KEYS.googleClientId)).toBe(false);
        expect(values.has(LOCAL_STORAGE_KEYS.geminiApiKey)).toBe(false);
        expect(values.has(LOCAL_STORAGE_KEYS.geminiProjectId)).toBe(false);
        expect(values.has(LOCAL_STORAGE_KEYS.geminiModel)).toBe(false);
        expect(sessionValues.has(LOCAL_STORAGE_KEYS.googleApiKey)).toBe(false);
        expect(sessionValues.has(LOCAL_STORAGE_KEYS.geminiApiKey)).toBe(false);
    });

    it('retorna fallback del client id cuando no hay valor guardado', () => {
        expect(resolveClientId('')).toBe(DEFAULT_GOOGLE_CLIENT_ID);
        expect(resolveClientId(' custom-client ')).toBe('custom-client');
    });
});

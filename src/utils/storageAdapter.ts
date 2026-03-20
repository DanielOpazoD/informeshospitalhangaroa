export interface StorageAdapter {
    getItem: (key: string) => string | null;
    setItem: (key: string, value: string) => void;
    removeItem: (key: string) => void;
}

export const getBrowserStorageAdapter = (): StorageAdapter | null => {
    if (typeof window === 'undefined' || !window.localStorage) {
        return null;
    }

    return window.localStorage;
};

export const readStoredJson = <T>(storage: StorageAdapter | null, key: string): T | null => {
    if (!storage) {
        return null;
    }

    const raw = storage.getItem(key);
    if (!raw) {
        return null;
    }

    return JSON.parse(raw) as T;
};

export const writeStoredJson = (storage: StorageAdapter | null, key: string, value: unknown): void => {
    if (!storage) {
        return;
    }

    storage.setItem(key, JSON.stringify(value));
};

export type StorageMap = Map<string, string>;

export const createMockStorage = () => {
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

export const installMockWindowStorage = () => {
    const { storage, values } = createMockStorage();
    const { storage: sessionStorage, values: sessionValues } = createMockStorage();
    const previousStorage = window.localStorage;
    const previousSessionStorage = window.sessionStorage;
    Object.defineProperty(window, 'localStorage', {
        configurable: true,
        value: storage,
    });
    Object.defineProperty(window, 'sessionStorage', {
        configurable: true,
        value: sessionStorage,
    });

    return {
        storage,
        values,
        sessionStorage,
        sessionValues,
        restore: () => {
            Object.defineProperty(window, 'localStorage', {
                configurable: true,
                value: previousStorage,
            });
            Object.defineProperty(window, 'sessionStorage', {
                configurable: true,
                value: previousSessionStorage,
            });
        },
    };
};

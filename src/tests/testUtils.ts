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
    const previousStorage = window.localStorage;
    Object.defineProperty(window, 'localStorage', {
        configurable: true,
        value: storage,
    });

    return {
        storage,
        values,
        restore: () => {
            Object.defineProperty(window, 'localStorage', {
                configurable: true,
                value: previousStorage,
            });
        },
    };
};

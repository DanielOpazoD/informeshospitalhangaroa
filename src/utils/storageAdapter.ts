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

export const getBrowserSessionStorageAdapter = (): StorageAdapter | null => {
    if (typeof window === 'undefined' || !window.sessionStorage) {
        return null;
    }

    return window.sessionStorage;
};

/**
 * Lee y parsea JSON desde storage. Retorna null si no existe, si el JSON
 * es inválido, o si el storage no está disponible. Nunca lanza excepciones.
 */
export const readStoredJson = <T>(storage: StorageAdapter | null, key: string): T | null => {
    if (!storage) return null;

    let raw: string | null;
    try {
        raw = storage.getItem(key);
    } catch {
        // getItem puede fallar en contextos de storage bloqueado (ej. incógnito restrictivo)
        return null;
    }

    if (!raw) return null;

    try {
        return JSON.parse(raw) as T;
    } catch {
        // JSON corrupto o truncado — descartamos silenciosamente
        console.warn(`[storage] JSON inválido en clave "${key}" — dato descartado.`);
        return null;
    }
};

/**
 * Serializa y escribe en storage. Maneja QuotaExceededError cuando el
 * almacenamiento está lleno. Nunca lanza excepciones.
 * @returns true si se guardó correctamente, false si falló.
 */
export const writeStoredJson = (storage: StorageAdapter | null, key: string, value: unknown): boolean => {
    if (!storage) return false;

    let serialized: string;
    try {
        serialized = JSON.stringify(value);
    } catch {
        console.warn(`[storage] No se pudo serializar el valor para clave "${key}".`);
        return false;
    }

    try {
        storage.setItem(key, serialized);
        return true;
    } catch (error) {
        // DOMException: QuotaExceededError cuando localStorage está lleno
        const isQuotaError =
            error instanceof DOMException &&
            (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED');

        if (isQuotaError) {
            console.warn(`[storage] Cuota de almacenamiento excedida al escribir "${key}". Considera limpiar datos antiguos.`);
        } else {
            console.warn(`[storage] Error al escribir "${key}":`, error);
        }
        return false;
    }
};

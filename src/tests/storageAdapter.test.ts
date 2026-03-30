import { describe, expect, it } from 'vitest';
import {
    getBrowserStorageAdapter,
    getBrowserSessionStorageAdapter,
    readStoredJson,
    writeStoredJson,
} from '../utils/storageAdapter';
import type { StorageAdapter } from '../utils/storageAdapter';

// ── In-memory adapter helper ─────────────────────────────────────────────────
const createMemoryStorage = (): StorageAdapter => {
    const store = new Map<string, string>();
    return {
        getItem: key => store.get(key) ?? null,
        setItem: (key, value) => store.set(key, value),
        removeItem: key => store.delete(key),
    };
};

// ── readStoredJson ───────────────────────────────────────────────────────────
describe('readStoredJson', () => {
    it('retorna null cuando el storage es null', () => {
        expect(readStoredJson(null, 'any')).toBeNull();
    });

    it('retorna null cuando la clave no existe', () => {
        const storage = createMemoryStorage();
        expect(readStoredJson(storage, 'missing')).toBeNull();
    });

    it('parsea y retorna JSON válido', () => {
        const storage = createMemoryStorage();
        storage.setItem('key', JSON.stringify({ hello: 'world' }));
        expect(readStoredJson<{ hello: string }>(storage, 'key')).toEqual({ hello: 'world' });
    });

    it('retorna null y no lanza para JSON truncado/corrupto', () => {
        const storage = createMemoryStorage();
        storage.setItem('key', '{"hello": "wor'); // truncated
        expect(() => readStoredJson(storage, 'key')).not.toThrow();
        expect(readStoredJson(storage, 'key')).toBeNull();
    });

    it('retorna null y no lanza cuando getItem lanza excepción', () => {
        const storage: StorageAdapter = {
            getItem: () => { throw new DOMException('Blocked'); },
            setItem: () => {},
            removeItem: () => {},
        };
        expect(() => readStoredJson(storage, 'key')).not.toThrow();
        expect(readStoredJson(storage, 'key')).toBeNull();
    });

    it('retorna valores primitivos válidos (number, array, etc.)', () => {
        const storage = createMemoryStorage();
        storage.setItem('num', JSON.stringify(42));
        storage.setItem('arr', JSON.stringify([1, 2, 3]));
        expect(readStoredJson<number>(storage, 'num')).toBe(42);
        expect(readStoredJson<number[]>(storage, 'arr')).toEqual([1, 2, 3]);
    });
});

// ── writeStoredJson ──────────────────────────────────────────────────────────
describe('writeStoredJson', () => {
    it('retorna false cuando el storage es null', () => {
        expect(writeStoredJson(null, 'key', { x: 1 })).toBe(false);
    });

    it('escribe JSON y retorna true en condiciones normales', () => {
        const storage = createMemoryStorage();
        const result = writeStoredJson(storage, 'key', { hello: 'world' });
        expect(result).toBe(true);
        expect(storage.getItem('key')).toBe(JSON.stringify({ hello: 'world' }));
    });

    it('retorna false y no lanza cuando setItem lanza QuotaExceededError', () => {
        const quotaError = new DOMException('quota', 'QuotaExceededError');
        const storage: StorageAdapter = {
            getItem: () => null,
            setItem: () => { throw quotaError; },
            removeItem: () => {},
        };
        expect(() => writeStoredJson(storage, 'key', { x: 1 })).not.toThrow();
        expect(writeStoredJson(storage, 'key', { x: 1 })).toBe(false);
    });

    it('retorna false y no lanza cuando setItem lanza NS_ERROR_DOM_QUOTA_REACHED', () => {
        const quotaError = new DOMException('quota', 'NS_ERROR_DOM_QUOTA_REACHED');
        const storage: StorageAdapter = {
            getItem: () => null,
            setItem: () => { throw quotaError; },
            removeItem: () => {},
        };
        expect(() => writeStoredJson(storage, 'key', {})).not.toThrow();
        expect(writeStoredJson(storage, 'key', {})).toBe(false);
    });

    it('retorna false y no lanza cuando setItem lanza error genérico', () => {
        const storage: StorageAdapter = {
            getItem: () => null,
            setItem: () => { throw new Error('unexpected'); },
            removeItem: () => {},
        };
        expect(() => writeStoredJson(storage, 'key', {})).not.toThrow();
        expect(writeStoredJson(storage, 'key', {})).toBe(false);
    });

    it('retorna false y no lanza cuando el valor no es serializable', () => {
        const storage = createMemoryStorage();
        const circular: Record<string, unknown> = {};
        circular.self = circular; // circular reference — JSON.stringify will throw
        expect(() => writeStoredJson(storage, 'key', circular)).not.toThrow();
        expect(writeStoredJson(storage, 'key', circular)).toBe(false);
    });
});

// ── getBrowserStorageAdapter / getBrowserSessionStorageAdapter ───────────────
describe('getBrowserStorageAdapter', () => {
    it('retorna un adapter cuando localStorage está disponible (entorno de test)', () => {
        // jsdom provides localStorage
        const adapter = getBrowserStorageAdapter();
        expect(adapter).not.toBeNull();
    });
});

describe('getBrowserSessionStorageAdapter', () => {
    it('retorna un adapter cuando sessionStorage está disponible (entorno de test)', () => {
        const adapter = getBrowserSessionStorageAdapter();
        expect(adapter).not.toBeNull();
    });
});

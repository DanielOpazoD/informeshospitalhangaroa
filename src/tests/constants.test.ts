import { describe, it, expect } from 'vitest';
import { generateSectionId } from '../constants';
import { FIELD_IDS, LOCAL_STORAGE_KEYS, MAX_HISTORY_ENTRIES } from '../appConstants';

describe('generateSectionId', () => {
    it('returns a string starting with "s-"', () => {
        const id = generateSectionId();
        expect(id).toMatch(/^s-/);
    });

    it('generates unique IDs on consecutive calls', () => {
        const ids = Array.from({ length: 100 }, () => generateSectionId());
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(100);
    });
});

describe('FIELD_IDS', () => {
    it('includes all expected patient field identifiers', () => {
        expect(FIELD_IDS.nombre).toBe('nombre');
        expect(FIELD_IDS.rut).toBe('rut');
        expect(FIELD_IDS.edad).toBe('edad');
        expect(FIELD_IDS.fecnac).toBe('fecnac');
        expect(FIELD_IDS.fing).toBe('fing');
        expect(FIELD_IDS.finf).toBe('finf');
        expect(FIELD_IDS.hinf).toBe('hinf');
    });

    it('is frozen (no runtime mutations)', () => {
        expect(Object.isFrozen(FIELD_IDS)).toBe(true);
    });
});

describe('LOCAL_STORAGE_KEYS', () => {
    it('is frozen (no runtime mutations)', () => {
        expect(Object.isFrozen(LOCAL_STORAGE_KEYS)).toBe(true);
    });
});

describe('MAX_HISTORY_ENTRIES', () => {
    it('is a positive integer', () => {
        expect(MAX_HISTORY_ENTRIES).toBeGreaterThan(0);
        expect(Number.isInteger(MAX_HISTORY_ENTRIES)).toBe(true);
    });
});

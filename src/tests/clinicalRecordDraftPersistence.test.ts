import { describe, expect, it } from 'vitest';
import { createStorageDraftPersistence } from '../hooks/clinicalRecord/draftPersistence';
import { readRecordBootstrap } from '../hooks/clinicalRecord/bootstrap';
import type { StorageAdapter } from '../utils/storageAdapter';
import type { VersionHistoryEntry } from '../types';

const createMemoryStorage = (): StorageAdapter => {
    const values = new Map<string, string>();
    return {
        getItem: key => values.get(key) ?? null,
        setItem: (key, value) => {
            values.set(key, value);
        },
        removeItem: key => {
            values.delete(key);
        },
    };
};

const buildEntry = (id: string): VersionHistoryEntry => ({
    id,
    timestamp: 123,
    record: {
        version: 'v14',
        templateId: '3',
        title: id,
        patientFields: [],
        sections: [],
        medico: '',
        especialidad: '',
    },
    metadata: {
        commandType: 'save_manual',
        commandCategory: 'persistence',
        summary: id,
        changed: true,
    },
});

describe('clinicalRecord draft persistence', () => {
    it('persiste y lee draft e historial desde storage', () => {
        const persistence = createStorageDraftPersistence(createMemoryStorage());
        persistence.writeDraft({
            timestamp: 123,
            record: buildEntry('draft').record,
        });
        persistence.writeHistory([buildEntry('one')]);

        expect(persistence.readDraft()?.record.title).toBe('draft');
        expect(persistence.readHistory()?.[0]?.id).toBe('one');
    });

    it('reporta warnings al bootstrap cuando el storage está corrupto', () => {
        const brokenPersistence = {
            readDraft: () => {
                throw new Error('draft broken');
            },
            writeDraft: () => true,
            readHistory: () => {
                throw new Error('history broken');
            },
            writeHistory: () => true,
        };

        const result = readRecordBootstrap(brokenPersistence);

        expect(result.draft).toBeNull();
        expect(result.historyEntries).toEqual([]);
        expect(result.warnings).toHaveLength(2);
    });

    // ── Schema validation ─────────────────────────────────────────────────
    it('readDraft devuelve null cuando el JSON no tiene la forma esperada', () => {
        const storage = createMemoryStorage();
        storage.setItem('clinical_draft', JSON.stringify({ not: 'a record' }));
        const persistence = createStorageDraftPersistence(storage);
        expect(persistence.readDraft()).toBeNull();
    });

    it('readDraft devuelve null cuando el valor no es un objeto', () => {
        const storage = createMemoryStorage();
        storage.setItem('clinical_draft', JSON.stringify(42));
        const persistence = createStorageDraftPersistence(storage);
        expect(persistence.readDraft()).toBeNull();
    });

    it('readDraft devuelve null cuando sections no es array', () => {
        const storage = createMemoryStorage();
        const badRecord = {
            timestamp: 1,
            record: {
                version: 'v14',
                templateId: '3',
                title: 'X',
                patientFields: [],
                sections: 'not-an-array',
                medico: '',
                especialidad: '',
            },
        };
        storage.setItem('clinical_draft', JSON.stringify(badRecord));
        const persistence = createStorageDraftPersistence(storage);
        expect(persistence.readDraft()).toBeNull();
    });

    // ── Corrupt data ──────────────────────────────────────────────────────
    it('readDraft devuelve null cuando el JSON está truncado', () => {
        const storage = createMemoryStorage();
        storage.setItem('clinical_draft', '{"timestamp":1,"record":{"version":"v14"'); // truncated
        const persistence = createStorageDraftPersistence(storage);
        expect(persistence.readDraft()).toBeNull();
    });

    it('readHistory filtra entradas inválidas y conserva las válidas', () => {
        const storage = createMemoryStorage();
        const persistence = createStorageDraftPersistence(storage);
        const validEntry = buildEntry('valid');
        const invalidEntry = { id: 'bad', record: null };  // invalid shape
        // Populate via writeHistory so the correct storage key is always used
        persistence.writeHistory([validEntry]);
        // Manually inject an invalid entry alongside the valid one using the same key
        const raw = JSON.parse(storage.getItem('hhr-version-history')!);
        raw.push(invalidEntry);
        storage.setItem('hhr-version-history', JSON.stringify(raw));

        const history = persistence.readHistory();
        expect(history).toHaveLength(1);
        expect(history![0].id).toBe('valid');
    });

    it('readHistory devuelve null cuando el JSON no es array', () => {
        const storage = createMemoryStorage();
        storage.setItem('hhr-version-history', JSON.stringify({ not: 'array' }));
        const persistence = createStorageDraftPersistence(storage);
        // readHistory returns null when the stored value is not an array (as per implementation)
        expect(persistence.readHistory()).toBeNull();
    });
});

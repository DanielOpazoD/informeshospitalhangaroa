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
            writeDraft: () => {},
            readHistory: () => {
                throw new Error('history broken');
            },
            writeHistory: () => {},
        };

        const result = readRecordBootstrap(brokenPersistence);

        expect(result.draft).toBeNull();
        expect(result.historyEntries).toEqual([]);
        expect(result.warnings).toHaveLength(2);
    });
});

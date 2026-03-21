import { LOCAL_STORAGE_KEYS } from '../../appConstants';
import type { ClinicalRecord, VersionHistoryEntry } from '../../types';
import { readStoredJson, writeStoredJson, type StorageAdapter } from '../../utils/storageAdapter';

export interface StoredDraftSnapshot {
    timestamp: number;
    record: ClinicalRecord;
}

export interface DraftPersistencePort {
    readDraft: () => StoredDraftSnapshot | null;
    writeDraft: (snapshot: StoredDraftSnapshot) => void;
    readHistory: () => VersionHistoryEntry[] | null;
    writeHistory: (entries: VersionHistoryEntry[]) => void;
}

export const createStorageDraftPersistence = (storage: StorageAdapter | null): DraftPersistencePort => ({
    readDraft: () => {
        const parsed = readStoredJson<{ timestamp?: number; record?: ClinicalRecord }>(storage, LOCAL_STORAGE_KEYS.draft);
        if (!parsed?.record || typeof parsed.timestamp !== 'number') {
            return null;
        }

        return {
            timestamp: parsed.timestamp,
            record: parsed.record,
        };
    },
    writeDraft: snapshot => {
        writeStoredJson(storage, LOCAL_STORAGE_KEYS.draft, snapshot);
    },
    readHistory: () => readStoredJson<VersionHistoryEntry[]>(storage, LOCAL_STORAGE_KEYS.history),
    writeHistory: entries => {
        writeStoredJson(storage, LOCAL_STORAGE_KEYS.history, entries);
    },
});

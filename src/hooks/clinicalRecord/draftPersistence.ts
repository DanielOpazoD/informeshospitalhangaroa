import { LOCAL_STORAGE_KEYS } from '../../appConstants';
import type { ClinicalRecord, VersionHistoryEntry } from '../../types';
import { readStoredJson, writeStoredJson, type StorageAdapter } from '../../utils/storageAdapter';

export interface StoredDraftSnapshot {
    timestamp: number;
    record: ClinicalRecord;
}

export interface DraftPersistencePort {
    readDraft: () => StoredDraftSnapshot | null;
    /** Returns true if the write succeeded, false if storage was full or unavailable. */
    writeDraft: (snapshot: StoredDraftSnapshot) => boolean;
    readHistory: () => VersionHistoryEntry[] | null;
    /** Returns true if the write succeeded. */
    writeHistory: (entries: VersionHistoryEntry[]) => boolean;
}

/**
 * Valida que el objeto leído desde localStorage tiene la estructura mínima
 * de un ClinicalRecord. Protege contra datos corruptos o de versiones antiguas
 * incompatibles que podrían causar errores en tiempo de ejecución.
 */
const isValidClinicalRecord = (value: unknown): value is ClinicalRecord => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const obj = value as Record<string, unknown>;
    return (
        typeof obj.version === 'string' &&
        typeof obj.templateId === 'string' &&
        typeof obj.title === 'string' &&
        Array.isArray(obj.patientFields) &&
        Array.isArray(obj.sections) &&
        typeof obj.medico === 'string' &&
        typeof obj.especialidad === 'string'
    );
};

/**
 * Valida que una entrada de historial tiene los campos mínimos esperados.
 */
const isValidHistoryEntry = (value: unknown): value is VersionHistoryEntry => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const obj = value as Record<string, unknown>;
    return (
        typeof obj.id === 'string' &&
        typeof obj.timestamp === 'number' &&
        isValidClinicalRecord(obj.record)
    );
};

export const createStorageDraftPersistence = (storage: StorageAdapter | null): DraftPersistencePort => ({
    readDraft: () => {
        const parsed = readStoredJson<{ timestamp?: number; record?: unknown }>(storage, LOCAL_STORAGE_KEYS.draft);
        if (!parsed || typeof parsed.timestamp !== 'number') return null;
        if (!isValidClinicalRecord(parsed.record)) {
            // Datos corruptos o de versión incompatible — descartar silenciosamente
            return null;
        }

        return {
            timestamp: parsed.timestamp,
            record: parsed.record,
        };
    },
    writeDraft: snapshot => writeStoredJson(storage, LOCAL_STORAGE_KEYS.draft, snapshot),
    readHistory: () => {
        const entries = readStoredJson<unknown[]>(storage, LOCAL_STORAGE_KEYS.history);
        if (!Array.isArray(entries)) return null;
        // Filtra entradas inválidas en lugar de fallar todo el historial
        return entries.filter(isValidHistoryEntry);
    },
    writeHistory: entries => writeStoredJson(storage, LOCAL_STORAGE_KEYS.history, entries),
});

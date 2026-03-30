import type { VersionHistoryEntry } from '../../types';
import type { DraftPersistencePort, StoredDraftSnapshot } from './draftPersistence';

export interface RecordBootstrapResult {
    draft: StoredDraftSnapshot | null;
    historyEntries: VersionHistoryEntry[];
    warnings: string[];
}

export const readRecordBootstrap = (persistence: DraftPersistencePort): RecordBootstrapResult => {
    const warnings: string[] = [];
    let draft: StoredDraftSnapshot | null = null;
    let historyEntries: VersionHistoryEntry[] = [];

    try {
        draft = persistence.readDraft();
    } catch (error) {
        warnings.push(`No se pudo restaurar el borrador local: ${error instanceof Error ? error.message : String(error)}`);
    }

    try {
        historyEntries = persistence.readHistory() ?? [];
    } catch (error) {
        warnings.push(`No se pudo leer el historial local: ${error instanceof Error ? error.message : String(error)}`);
    }

    return { draft, historyEntries, warnings };
};

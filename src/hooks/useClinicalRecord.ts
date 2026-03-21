import { useCallback, useEffect, useReducer, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import type { ClinicalRecord, EditorWorkflowState, ToastFn, VersionHistoryEntry } from '../types';
import { AUTO_SAVE_IDLE_DELAY, AUTO_SAVE_INTERVAL, LOCAL_STORAGE_KEYS, MAX_HISTORY_ENTRIES } from '../appConstants';
import { useConfirmDialog } from './useConfirmDialog';
import { getBrowserStorageAdapter, readStoredJson, writeStoredJson, type StorageAdapter } from '../utils/storageAdapter';
import { normalizePatientFields } from '../utils/recordTemplates';
import { createTemplateBaseline } from '../utils/recordTemplates';
import {
    importRecordFromJson,
    restoreHistoryEntry as restoreHistoryEntryUseCase,
    saveDraftSnapshot,
} from '../application/clinicalRecordUseCases';
import { editorWorkflowReducer, initialEditorWorkflowState } from '../application/editorWorkflow';

interface UseClinicalRecordOptions {
    onToast: ToastFn;
    storage?: StorageAdapter | null;
}

export const useClinicalRecord = ({ onToast, storage = getBrowserStorageAdapter() }: UseClinicalRecordOptions) => {
    const { confirm } = useConfirmDialog();
    const [record, setRecord] = useState<ClinicalRecord>(() => createTemplateBaseline('2'));
    const [lastLocalSave, setLastLocalSave] = useState<number | null>(null);
    const [versionHistory, setVersionHistory] = useState<VersionHistoryEntry[]>([]);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [workflowState, dispatchWorkflow] = useReducer(editorWorkflowReducer, initialEditorWorkflowState);
    const suppressedRecordChangeCountRef = useRef(1);

    const normalizeRecord = useCallback((snapshot: ClinicalRecord): ClinicalRecord => {
        return saveDraftSnapshot(snapshot, normalizePatientFields);
    }, []);

    const markRecordAsReplaced = useCallback(() => {
        suppressedRecordChangeCountRef.current += 1;
    }, []);

    const getRecordSnapshot = useCallback(() => {
        return structuredClone(record);
    }, [record]);

    const pushHistory = useCallback((snapshot: ClinicalRecord, timestamp: number) => {
        setVersionHistory(prev => {
            const newEntry: VersionHistoryEntry = {
                id: `${timestamp}`,
                timestamp,
                record: snapshot,
            };
            const newHistory = [newEntry, ...prev.filter(entry => entry.id !== newEntry.id)].slice(0, MAX_HISTORY_ENTRIES);
            writeStoredJson(storage, LOCAL_STORAGE_KEYS.history, newHistory);
            return newHistory;
        });
    }, [storage]);

    const saveDraft = useCallback((reason: 'auto' | 'manual' | 'import', overrideRecord?: ClinicalRecord) => {
        dispatchWorkflow({ type: 'SAVE_REQUESTED' });
        const snapshot = overrideRecord
            ? structuredClone(overrideRecord)
            : getRecordSnapshot();
        const normalizedSnapshot = normalizeRecord(snapshot);
        const timestamp = Date.now();
        writeStoredJson(storage, LOCAL_STORAGE_KEYS.draft, { timestamp, record: normalizedSnapshot });
        setLastLocalSave(timestamp);
        dispatchWorkflow({ type: 'SAVE_SUCCEEDED' });
        pushHistory(normalizedSnapshot, timestamp);
        if (reason === 'manual') {
            onToast('Borrador guardado localmente.');
        }
    }, [getRecordSnapshot, normalizeRecord, onToast, pushHistory, storage]);

    useEffect(() => {
        try {
            const parsed = readStoredJson<{ timestamp?: number; record?: ClinicalRecord }>(storage, LOCAL_STORAGE_KEYS.draft);
            if (parsed?.record) {
                const loaded = importRecordFromJson(parsed.record, normalizePatientFields);
                if (loaded.record) {
                    markRecordAsReplaced();
                    setRecord(loaded.record);
                    if (parsed.timestamp) setLastLocalSave(parsed.timestamp);
                    dispatchWorkflow({ type: 'SET_UNSAVED_CHANGES', value: false });
                    onToast('Borrador recuperado automáticamente.', 'success');
                }
            }
        } catch (error) {
            console.warn('No se pudo restaurar el borrador local:', error);
        }

        try {
            const parsedHistory = readStoredJson<VersionHistoryEntry[]>(storage, LOCAL_STORAGE_KEYS.history);
            if (parsedHistory) {
                setVersionHistory(
                    parsedHistory
                        .slice(0, MAX_HISTORY_ENTRIES)
                        .map(entry => ({ ...entry, record: normalizeRecord(entry.record) }))
                );
            }
        } catch (error) {
            console.warn('No se pudo leer el historial local:', error);
        }
    }, [markRecordAsReplaced, normalizeRecord, onToast, storage]);

    useEffect(() => {
        if (suppressedRecordChangeCountRef.current > 0) {
            suppressedRecordChangeCountRef.current -= 1;
            return;
        }
        dispatchWorkflow({ type: 'EDITED' });
    }, [record]);

    useEffect(() => {
        if (!workflowState.hasUnsavedChanges) return;
        const timeout = window.setTimeout(() => {
            saveDraft('auto');
        }, AUTO_SAVE_IDLE_DELAY);
        return () => window.clearTimeout(timeout);
    }, [record, saveDraft, workflowState.hasUnsavedChanges]);

    useEffect(() => {
        if (!workflowState.hasUnsavedChanges) return;
        const interval = window.setInterval(() => {
            saveDraft('auto');
        }, AUTO_SAVE_INTERVAL);
        return () => window.clearInterval(interval);
    }, [saveDraft, workflowState.hasUnsavedChanges]);

    const handleRestoreHistoryEntry = useCallback((entry: VersionHistoryEntry) => {
        void (async () => {
            const confirmed = await confirm({
                title: 'Restaurar versión anterior',
                message: '¿Desea restaurar esta versión? Se reemplazarán los datos actuales.',
                confirmLabel: 'Restaurar',
                cancelLabel: 'Cancelar',
                tone: 'warning',
            });
            if (!confirmed) return;
            dispatchWorkflow({ type: 'RESTORE_STARTED' });
            const restored = restoreHistoryEntryUseCase(entry, normalizePatientFields);
            if (!restored.record) {
                dispatchWorkflow({ type: 'RESTORE_FAILED', error: restored.errors.join('\n') || 'No se pudo restaurar la versión.' });
                onToast('No se pudo restaurar la versión seleccionada.', 'error');
                return;
            }
            markRecordAsReplaced();
            setRecord(restored.record);
            setLastLocalSave(entry.timestamp);
            writeStoredJson(storage, LOCAL_STORAGE_KEYS.draft, { timestamp: entry.timestamp, record: restored.record });
            dispatchWorkflow({ type: 'RESTORE_SUCCEEDED' });
            onToast('Versión restaurada desde el historial.');
            setIsHistoryModalOpen(false);
        })();
    }, [confirm, markRecordAsReplaced, onToast, storage]);

    const setHasUnsavedChanges = useCallback<Dispatch<SetStateAction<boolean>>>((value) => {
        const nextValue = typeof value === 'function'
            ? (value as (previousState: boolean) => boolean)(workflowState.hasUnsavedChanges)
            : value;
        dispatchWorkflow({ type: 'SET_UNSAVED_CHANGES', value: nextValue });
    }, [workflowState.hasUnsavedChanges]);

    return {
        record,
        setRecord,
        lastLocalSave,
        hasUnsavedChanges: workflowState.hasUnsavedChanges,
        setHasUnsavedChanges,
        versionHistory,
        isHistoryModalOpen,
        setIsHistoryModalOpen,
        saveDraft,
        handleRestoreHistoryEntry,
        markRecordAsReplaced,
        workflowState: workflowState as EditorWorkflowState,
        dispatchWorkflow,
    };
};

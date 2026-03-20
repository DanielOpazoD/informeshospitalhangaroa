import { useCallback, useEffect, useRef, useState } from 'react';
import { getDefaultPatientFieldsByTemplate, getDefaultSectionsByTemplate } from '../constants';
import type { ClinicalRecord, ToastFn, VersionHistoryEntry } from '../types';
import { AUTO_SAVE_IDLE_DELAY, AUTO_SAVE_INTERVAL, LOCAL_STORAGE_KEYS, MAX_HISTORY_ENTRIES } from '../appConstants';
import { useConfirmDialog } from './useConfirmDialog';
import { getBrowserStorageAdapter, readStoredJson, writeStoredJson, type StorageAdapter } from '../utils/storageAdapter';

interface UseClinicalRecordOptions {
    onToast: ToastFn;
    storage?: StorageAdapter | null;
}

export const useClinicalRecord = ({ onToast, storage = getBrowserStorageAdapter() }: UseClinicalRecordOptions) => {
    const { confirm } = useConfirmDialog();
    const [record, setRecord] = useState<ClinicalRecord>({
        version: 'v14',
        templateId: '2',
        title: '',
        patientFields: getDefaultPatientFieldsByTemplate('2'),
        sections: getDefaultSectionsByTemplate('2'),
        medico: '',
        especialidad: '',
    });
    const [lastLocalSave, setLastLocalSave] = useState<number | null>(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [versionHistory, setVersionHistory] = useState<VersionHistoryEntry[]>([]);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const skipUnsavedRef = useRef(true);

    const markRecordAsReplaced = useCallback(() => {
        skipUnsavedRef.current = true;
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
        const snapshot = overrideRecord
            ? structuredClone(overrideRecord)
            : getRecordSnapshot();
        const timestamp = Date.now();
        writeStoredJson(storage, LOCAL_STORAGE_KEYS.draft, { timestamp, record: snapshot });
        setLastLocalSave(timestamp);
        setHasUnsavedChanges(false);
        pushHistory(snapshot, timestamp);
        if (reason === 'manual') {
            onToast('Borrador guardado localmente.');
        }
    }, [getRecordSnapshot, onToast, pushHistory, storage]);

    useEffect(() => {
        try {
            const parsed = readStoredJson<{ timestamp?: number; record?: ClinicalRecord }>(storage, LOCAL_STORAGE_KEYS.draft);
            if (parsed?.record) {
                markRecordAsReplaced();
                setRecord(parsed.record);
                if (parsed.timestamp) setLastLocalSave(parsed.timestamp);
                setHasUnsavedChanges(false);
                onToast('Borrador recuperado automáticamente.', 'success');
            }
        } catch (error) {
            console.warn('No se pudo restaurar el borrador local:', error);
        }

        try {
            const parsedHistory = readStoredJson<VersionHistoryEntry[]>(storage, LOCAL_STORAGE_KEYS.history);
            if (parsedHistory) {
                setVersionHistory(parsedHistory.slice(0, MAX_HISTORY_ENTRIES));
            }
        } catch (error) {
            console.warn('No se pudo leer el historial local:', error);
        }
    }, [markRecordAsReplaced, onToast, storage]);

    useEffect(() => {
        if (skipUnsavedRef.current) {
            skipUnsavedRef.current = false;
            return;
        }
        setHasUnsavedChanges(true);
    }, [record]);

    useEffect(() => {
        if (!hasUnsavedChanges) return;
        const timeout = window.setTimeout(() => {
            saveDraft('auto');
        }, AUTO_SAVE_IDLE_DELAY);
        return () => window.clearTimeout(timeout);
    }, [hasUnsavedChanges, record, saveDraft]);

    useEffect(() => {
        if (!hasUnsavedChanges) return;
        const interval = window.setInterval(() => {
            saveDraft('auto');
        }, AUTO_SAVE_INTERVAL);
        return () => window.clearInterval(interval);
    }, [hasUnsavedChanges, saveDraft]);

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
            const snapshot = structuredClone(entry.record);
            markRecordAsReplaced();
            setRecord(snapshot);
            setHasUnsavedChanges(false);
            setLastLocalSave(entry.timestamp);
            writeStoredJson(storage, LOCAL_STORAGE_KEYS.draft, { timestamp: entry.timestamp, record: snapshot });
            onToast('Versión restaurada desde el historial.');
            setIsHistoryModalOpen(false);
        })();
    }, [confirm, markRecordAsReplaced, onToast, storage]);

    return {
        record,
        setRecord,
        lastLocalSave,
        hasUnsavedChanges,
        setHasUnsavedChanges,
        versionHistory,
        isHistoryModalOpen,
        setIsHistoryModalOpen,
        saveDraft,
        handleRestoreHistoryEntry,
        markRecordAsReplaced,
    };
};

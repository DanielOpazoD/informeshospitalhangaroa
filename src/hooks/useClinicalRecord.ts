import { useCallback, useEffect, useReducer, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import type {
    ClinicalRecord,
    EditorWorkflowState,
    HistoryStacks,
    ToastFn,
    VersionHistoryEntry,
} from '../types';
import {
    AUTO_SAVE_IDLE_DELAY,
    AUTO_SAVE_INTERVAL,
    HISTORY_GROUP_WINDOW_MS,
    LOCAL_STORAGE_KEYS,
    MAX_HISTORY_ENTRIES,
} from '../appConstants';
import { useConfirmDialog } from './useConfirmDialog';
import { getBrowserStorageAdapter, readStoredJson, writeStoredJson, type StorageAdapter } from '../utils/storageAdapter';
import { createTemplateBaseline, DEFAULT_TEMPLATE_ID } from '../utils/recordTemplates';
import { editorWorkflowReducer, initialEditorWorkflowState, type EditorWorkflowAction } from '../application/editorWorkflow';
import type { ClinicalRecordCommand, ClinicalRecordCommandResult } from '../application/clinicalRecordCommands';
import {
    buildHistoryMetadata,
    canExecuteClinicalRecordCommand,
    executeClinicalRecordCommand,
} from '../application/clinicalRecordCommands';
import { interpretEditorEffects } from '../application/editorEffects';
import {
    executeImportRecord,
    executeRestoreHistoryEntry,
    executeSaveDraft,
    type EditorUseCaseResult,
} from '../application/editorUseCases';

interface UseClinicalRecordOptions {
    onToast: ToastFn;
    storage?: StorageAdapter | null;
}

const serializeRecord = (record: ClinicalRecord) => JSON.stringify(record);

const normalizeVersionHistoryEntry = (entry: VersionHistoryEntry): VersionHistoryEntry => ({
    ...entry,
    record: executeSaveDraft(entry.record, 'auto').snapshot ?? entry.record,
    metadata: entry.metadata ?? buildHistoryMetadata('save_auto', 'persistence', 'Historial legado', true, 'legacy-history'),
});

const flattenHistoryStacks = (stacks: HistoryStacks): VersionHistoryEntry[] =>
    Array.from(
        new Map(
            [stacks.present, ...stacks.past, ...stacks.future]
                .filter((entry): entry is VersionHistoryEntry => Boolean(entry))
                .sort((left, right) => right.timestamp - left.timestamp)
                .map(entry => [entry.id, entry]),
        ).values(),
    );

const updateHistoryStacksOnPush = (
    stacks: HistoryStacks,
    nextEntry: VersionHistoryEntry,
): HistoryStacks => ({
    past: stacks.present ? [stacks.present, ...stacks.past].slice(0, MAX_HISTORY_ENTRIES - 1) : stacks.past,
    present: nextEntry,
    future: [],
});

const updateHistoryStacksOnRestore = (
    stacks: HistoryStacks,
    restored: VersionHistoryEntry,
): HistoryStacks => ({
    past: stacks.present && stacks.present.id !== restored.id
        ? [stacks.present, ...stacks.past.filter(entry => entry.id !== restored.id)].slice(0, MAX_HISTORY_ENTRIES - 1)
        : stacks.past,
    present: restored,
    future: stacks.present && stacks.present.id !== restored.id
        ? [stacks.present, ...stacks.future].slice(0, MAX_HISTORY_ENTRIES - 1)
        : stacks.future,
});

const updateHistoryStacksOnUndo = (stacks: HistoryStacks): HistoryStacks => {
    const [target, ...remainingPast] = stacks.past;
    if (!target) {
        return stacks;
    }

    return {
        past: remainingPast,
        present: target,
        future: stacks.present ? [stacks.present, ...stacks.future].slice(0, MAX_HISTORY_ENTRIES - 1) : stacks.future,
    };
};

const updateHistoryStacksOnRedo = (stacks: HistoryStacks): HistoryStacks => {
    const [target, ...remainingFuture] = stacks.future;
    if (!target) {
        return stacks;
    }

    return {
        past: stacks.present ? [stacks.present, ...stacks.past].slice(0, MAX_HISTORY_ENTRIES - 1) : stacks.past,
        present: target,
        future: remainingFuture,
    };
};

export const useClinicalRecord = ({ onToast, storage = getBrowserStorageAdapter() }: UseClinicalRecordOptions) => {
    const { confirm } = useConfirmDialog();
    const [record, setRecord] = useState<ClinicalRecord>(() => createTemplateBaseline(DEFAULT_TEMPLATE_ID));
    const recordRef = useRef(record);
    const [lastLocalSave, setLastLocalSave] = useState<number | null>(null);
    const [versionHistory, setVersionHistory] = useState<VersionHistoryEntry[]>([]);
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);
    const historyStacksRef = useRef<HistoryStacks>({ past: [], present: null, future: [] });
    const lastPersistedSnapshotRef = useRef<string | null>(null);
    const lastCommandResultRef = useRef<ClinicalRecordCommandResult | null>(null);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [workflowState, dispatchWorkflow] = useReducer(editorWorkflowReducer, initialEditorWorkflowState);
    const suppressedRecordChangeCountRef = useRef(1);
    const workflowStateRef = useRef(workflowState);

    const markRecordAsReplaced = useCallback(() => {
        suppressedRecordChangeCountRef.current += 1;
    }, []);

    const getRecordSnapshot = useCallback(() => structuredClone(recordRef.current), []);

    const interpretEffects = useCallback((result: { effects: EditorUseCaseResult['effects'] | ClinicalRecordCommandResult['effects'] }) => {
        interpretEditorEffects(result.effects, {
            onShowWarning: (message) => onToast(message, 'warning'),
            onShowToast: (message, tone) => onToast(message, tone),
            onCloseModal: (modal) => {
                if (modal === 'history') {
                    setIsHistoryModalOpen(false);
                }
            },
            onLogAuditEvent: (effect) => {
                console.warn(`[editor-audit] ${effect.event}`, effect.details ?? '');
            },
        });
    }, [onToast]);

    const syncHistoryState = useCallback((nextStacks: HistoryStacks, persist = true) => {
        historyStacksRef.current = nextStacks;
        const flattened = flattenHistoryStacks(nextStacks);
        setVersionHistory(flattened);
        setCanUndo(nextStacks.past.length > 0);
        setCanRedo(nextStacks.future.length > 0);
        if (persist) {
            writeStoredJson(storage, LOCAL_STORAGE_KEYS.history, flattened);
        }
    }, [storage]);

    const applyWorkflowActions = useCallback((actions: EditorWorkflowAction[]) => {
        actions.forEach(action => dispatchWorkflow(action));
    }, []);

    const applyCommandResult = useCallback((result: ClinicalRecordCommandResult) => {
        lastCommandResultRef.current = result;
        if (result.ok && result.changed) {
            recordRef.current = result.record;
            setRecord(result.record);
        }
        interpretEffects(result);
        return result;
    }, [interpretEffects]);

    const pushHistory = useCallback((snapshot: ClinicalRecord, timestamp: number, entry: VersionHistoryEntry) => {
        const serializedSnapshot = serializeRecord(snapshot);
        if (serializedSnapshot === lastPersistedSnapshotRef.current) {
            return;
        }

        lastPersistedSnapshotRef.current = serializedSnapshot;
        const currentStacks = historyStacksRef.current;
        const latest = currentStacks.present;
        const shouldGroup = Boolean(
            latest?.metadata?.groupKey &&
            latest.metadata.groupKey === entry.metadata?.groupKey &&
            timestamp - latest.timestamp <= HISTORY_GROUP_WINDOW_MS,
        );
        const nextStacks = shouldGroup
            ? { ...currentStacks, present: entry, future: [] }
            : updateHistoryStacksOnPush(currentStacks, entry);
        syncHistoryState(nextStacks);
    }, [syncHistoryState]);

    const dispatchRecordCommand = useCallback((command: ClinicalRecordCommand): ClinicalRecordCommandResult => {
        const snapshot = getRecordSnapshot();
        const policyDecision = canExecuteClinicalRecordCommand(command, workflowStateRef.current.status);
        if (!policyDecision.allowed) {
            return {
                ok: false,
                record: snapshot,
                errors: [policyDecision.reason],
                warnings: [],
                changed: false,
                effects: [],
                metadata: buildHistoryMetadata('save_manual', 'persistence', 'Operación bloqueada', false, 'blocked'),
            };
        }

        return applyCommandResult(executeClinicalRecordCommand(snapshot, command));
    }, [applyCommandResult, getRecordSnapshot]);

    const saveDraft = useCallback((reason: 'auto' | 'manual' | 'import', overrideRecord?: ClinicalRecord) => {
        const useCase = executeSaveDraft(getRecordSnapshot(), reason, overrideRecord);
        applyWorkflowActions(useCase.workflowActions);
        interpretEffects(useCase);

        const snapshot = useCase.snapshot ?? useCase.commandResult.record;
        const timestamp = Date.now();
        writeStoredJson(storage, LOCAL_STORAGE_KEYS.draft, { timestamp, record: snapshot });
        setLastLocalSave(timestamp);

        const historyEntry: VersionHistoryEntry = {
            id: `${timestamp}`,
            timestamp,
            record: snapshot,
            metadata: useCase.historyMetadata ?? useCase.commandResult.metadata,
        };
        pushHistory(snapshot, timestamp, historyEntry);

        if (useCase.userMessage) {
            onToast(useCase.userMessage);
        }
    }, [applyWorkflowActions, getRecordSnapshot, interpretEffects, onToast, pushHistory, storage]);

    useEffect(() => {
        recordRef.current = record;
    }, [record]);

    useEffect(() => {
        workflowStateRef.current = workflowState;
    }, [workflowState]);

    useEffect(() => {
        try {
            const parsed = readStoredJson<{ timestamp?: number; record?: ClinicalRecord }>(storage, LOCAL_STORAGE_KEYS.draft);
            if (parsed?.record) {
                markRecordAsReplaced();
                const useCase = executeImportRecord(getRecordSnapshot(), workflowStateRef.current, parsed.record, 'bootstrap');
                const loaded = applyCommandResult(useCase.commandResult);
                if (loaded.ok) {
                    if (parsed.timestamp) {
                        setLastLocalSave(parsed.timestamp);
                        lastPersistedSnapshotRef.current = serializeRecord(loaded.record);
                    }
                    dispatchWorkflow({ type: 'SET_UNSAVED_CHANGES', value: false });
                    if (useCase.userMessage) {
                        onToast(useCase.userMessage, 'success');
                    }
                }
            }
        } catch (error) {
            console.warn('No se pudo restaurar el borrador local:', error);
        }

        try {
            const parsedHistory = readStoredJson<VersionHistoryEntry[]>(storage, LOCAL_STORAGE_KEYS.history);
            if (parsedHistory) {
                const normalizedHistory = parsedHistory
                    .slice(0, MAX_HISTORY_ENTRIES)
                    .map(normalizeVersionHistoryEntry);
                syncHistoryState({
                    present: normalizedHistory[0] ?? null,
                    past: normalizedHistory.slice(1),
                    future: [],
                }, false);
            }
        } catch (error) {
            console.warn('No se pudo leer el historial local:', error);
        }
    }, [applyCommandResult, getRecordSnapshot, markRecordAsReplaced, onToast, storage, syncHistoryState]);

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

    const applyHistoryTransition = useCallback((
        entry: VersionHistoryEntry,
        nextStacks: HistoryStacks,
        useCase: EditorUseCaseResult,
        errorMessage: string,
    ) => {
        markRecordAsReplaced();
        applyWorkflowActions(useCase.workflowActions);
        const restored = applyCommandResult(useCase.commandResult);
        if (!restored.ok) {
            onToast(errorMessage, 'error');
            return false;
        }

        setLastLocalSave(entry.timestamp);
        writeStoredJson(storage, LOCAL_STORAGE_KEYS.draft, { timestamp: entry.timestamp, record: restored.record });
        lastPersistedSnapshotRef.current = serializeRecord(restored.record);
        syncHistoryState(nextStacks);
        return true;
    }, [applyCommandResult, applyWorkflowActions, markRecordAsReplaced, onToast, storage, syncHistoryState]);

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

            const normalizedEntry = normalizeVersionHistoryEntry(entry);
            const nextStacks = updateHistoryStacksOnRestore(historyStacksRef.current, normalizedEntry);
            const useCase = executeRestoreHistoryEntry(getRecordSnapshot(), workflowStateRef.current, normalizedEntry);
            applyHistoryTransition(normalizedEntry, nextStacks, useCase, 'No se pudo restaurar la versión seleccionada.');
        })();
    }, [applyHistoryTransition, confirm, getRecordSnapshot]);

    const undo = useCallback(() => {
        const currentStacks = historyStacksRef.current;
        const target = currentStacks.past[0];
        if (!target) {
            onToast('No hay cambios previos para deshacer.', 'warning');
            return;
        }

        const normalizedTarget = normalizeVersionHistoryEntry(target);
        const nextStacks = updateHistoryStacksOnUndo(currentStacks);
        const useCase = executeRestoreHistoryEntry(getRecordSnapshot(), workflowStateRef.current, normalizedTarget, {
            closeHistoryModal: false,
            successToast: 'Se deshizo el último cambio persistido.',
            auditEvent: 'editor.undo',
        });
        applyHistoryTransition(normalizedTarget, nextStacks, useCase, 'No se pudo deshacer el último cambio.');
    }, [applyHistoryTransition, getRecordSnapshot, onToast]);

    const redo = useCallback(() => {
        const currentStacks = historyStacksRef.current;
        const target = currentStacks.future[0];
        if (!target) {
            onToast('No hay cambios posteriores para rehacer.', 'warning');
            return;
        }

        const normalizedTarget = normalizeVersionHistoryEntry(target);
        const nextStacks = updateHistoryStacksOnRedo(currentStacks);
        const useCase = executeRestoreHistoryEntry(getRecordSnapshot(), workflowStateRef.current, normalizedTarget, {
            closeHistoryModal: false,
            successToast: 'Se rehizo el cambio seleccionado.',
            auditEvent: 'editor.redo',
        });
        applyHistoryTransition(normalizedTarget, nextStacks, useCase, 'No se pudo rehacer el cambio.');
    }, [applyHistoryTransition, getRecordSnapshot, onToast]);

    const setHasUnsavedChanges = useCallback<Dispatch<SetStateAction<boolean>>>((value) => {
        const nextValue = typeof value === 'function'
            ? (value as (previousState: boolean) => boolean)(workflowState.hasUnsavedChanges)
            : value;
        dispatchWorkflow({ type: 'SET_UNSAVED_CHANGES', value: nextValue });
    }, [workflowState.hasUnsavedChanges]);

    return {
        record,
        setRecord,
        dispatchRecordCommand,
        lastLocalSave,
        hasUnsavedChanges: workflowState.hasUnsavedChanges,
        setHasUnsavedChanges,
        versionHistory,
        canUndo,
        canRedo,
        isHistoryModalOpen,
        setIsHistoryModalOpen,
        saveDraft,
        handleRestoreHistoryEntry,
        undo,
        redo,
        markRecordAsReplaced,
        workflowState: workflowState as EditorWorkflowState,
        dispatchWorkflow,
    };
};

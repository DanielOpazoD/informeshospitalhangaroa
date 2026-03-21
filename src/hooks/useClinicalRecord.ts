import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import type {
    ClinicalRecord,
    EditorWorkflowState,
    ToastFn,
    VersionHistoryEntry,
} from '../types';
import {
    AUTO_SAVE_IDLE_DELAY,
    AUTO_SAVE_INTERVAL,
} from '../appConstants';
import { useConfirmDialog } from './useConfirmDialog';
import { getBrowserStorageAdapter, type StorageAdapter } from '../utils/storageAdapter';
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
import {
    buildHistoryStateFromEntries,
    flattenHistoryState,
    pushHistoryEntry,
    redoHistoryState,
    restoreHistoryEntryState,
    type HistoryState,
    undoHistoryState,
} from './clinicalRecord/historyState';
import {
    createStorageDraftPersistence,
    type DraftPersistencePort,
} from './clinicalRecord/draftPersistence';
import { readRecordBootstrap } from './clinicalRecord/bootstrap';
import { systemTimeSource, type TimeSource } from './clinicalRecord/timeSource';
import { appLogger } from '../infrastructure/shared/logger';

interface UseClinicalRecordOptions {
    onToast: ToastFn;
    storage?: StorageAdapter | null;
    persistence?: DraftPersistencePort;
    timeSource?: TimeSource;
}

const serializeRecord = (record: ClinicalRecord) => JSON.stringify(record);

const normalizeVersionHistoryEntry = (entry: VersionHistoryEntry): VersionHistoryEntry => ({
    ...entry,
    record: executeSaveDraft(entry.record, 'auto').snapshot ?? entry.record,
    metadata: entry.metadata ?? buildHistoryMetadata('save_auto', 'persistence', 'Historial legado', true, 'legacy-history'),
});

export const useClinicalRecord = ({
    onToast,
    storage = getBrowserStorageAdapter(),
    persistence,
    timeSource = systemTimeSource,
}: UseClinicalRecordOptions) => {
    const { confirm } = useConfirmDialog();
    const draftPersistence = useMemo(
        () => persistence ?? createStorageDraftPersistence(storage),
        [persistence, storage],
    );
    const [record, setRecord] = useState<ClinicalRecord>(() => createTemplateBaseline(DEFAULT_TEMPLATE_ID));
    const recordRef = useRef(record);
    const [lastLocalSave, setLastLocalSave] = useState<number | null>(null);
    const [versionHistory, setVersionHistory] = useState<VersionHistoryEntry[]>([]);
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);
    const historyStacksRef = useRef<HistoryState>({ past: [], present: null, future: [] });
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
                appLogger.warn('editor-audit', effect.event, effect.details ?? '');
            },
        });
    }, [onToast]);

    const syncHistoryState = useCallback((nextStacks: HistoryState, persist = true) => {
        historyStacksRef.current = nextStacks;
        const flattened = flattenHistoryState(nextStacks);
        setVersionHistory(flattened);
        setCanUndo(nextStacks.past.length > 0);
        setCanRedo(nextStacks.future.length > 0);
        if (persist) {
            draftPersistence.writeHistory(flattened);
        }
    }, [draftPersistence]);

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

    const pushHistory = useCallback((snapshot: ClinicalRecord, entry: VersionHistoryEntry) => {
        const serializedSnapshot = serializeRecord(snapshot);
        if (serializedSnapshot === lastPersistedSnapshotRef.current) {
            return;
        }

        lastPersistedSnapshotRef.current = serializedSnapshot;
        const nextStacks = pushHistoryEntry(historyStacksRef.current, entry);
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
        const timestamp = timeSource.now();
        draftPersistence.writeDraft({ timestamp, record: snapshot });
        setLastLocalSave(timestamp);

        const historyEntry: VersionHistoryEntry = {
            id: `${timestamp}`,
            timestamp,
            record: snapshot,
            metadata: useCase.historyMetadata ?? useCase.commandResult.metadata,
        };
        pushHistory(snapshot, historyEntry);

        if (useCase.userMessage) {
            onToast(useCase.userMessage);
        }
    }, [applyWorkflowActions, draftPersistence, getRecordSnapshot, interpretEffects, onToast, pushHistory, timeSource]);

    useEffect(() => {
        recordRef.current = record;
    }, [record]);

    useEffect(() => {
        workflowStateRef.current = workflowState;
    }, [workflowState]);

    useEffect(() => {
        const bootstrap = readRecordBootstrap(draftPersistence);
        bootstrap.warnings.forEach(message => appLogger.warn('clinical-record-bootstrap', message));

        if (bootstrap.draft) {
            markRecordAsReplaced();
            const useCase = executeImportRecord(getRecordSnapshot(), workflowStateRef.current, bootstrap.draft.record, 'bootstrap');
            const loaded = applyCommandResult(useCase.commandResult);
            if (loaded.ok) {
                setLastLocalSave(bootstrap.draft.timestamp);
                lastPersistedSnapshotRef.current = serializeRecord(loaded.record);
                dispatchWorkflow({ type: 'SET_UNSAVED_CHANGES', value: false });
                if (useCase.userMessage) {
                    onToast(useCase.userMessage, 'success');
                }
            }
        }

        if (bootstrap.historyEntries.length > 0) {
            const normalizedHistory = bootstrap.historyEntries
                .slice(0)
                .map(normalizeVersionHistoryEntry);
            syncHistoryState(buildHistoryStateFromEntries(normalizedHistory), false);
        }
    }, [applyCommandResult, draftPersistence, getRecordSnapshot, markRecordAsReplaced, onToast, syncHistoryState]);

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
        nextStacks: HistoryState,
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
        draftPersistence.writeDraft({ timestamp: entry.timestamp, record: restored.record });
        lastPersistedSnapshotRef.current = serializeRecord(restored.record);
        syncHistoryState(nextStacks);
        return true;
    }, [applyCommandResult, applyWorkflowActions, draftPersistence, markRecordAsReplaced, onToast, syncHistoryState]);

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
            const nextStacks = restoreHistoryEntryState(historyStacksRef.current, normalizedEntry);
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
        const nextStacks = undoHistoryState(currentStacks);
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
        const nextStacks = redoHistoryState(currentStacks);
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

import type { EditorWorkflowAction } from './editorWorkflow';
import {
    buildHistoryMetadata,
    canExecuteClinicalRecordCommand,
    executeClinicalRecordCommand,
    normalizeClinicalRecordSnapshot,
    type ClinicalRecordCommandResult,
} from './clinicalRecordCommands';
import type { ClinicalRecord, EditorEffect, EditorWorkflowState, HistoryEntryMetadata, VersionHistoryEntry } from '../types';
import type { HhrCensusPatient } from '../hhrTypes';

export interface EditorUseCaseResult {
    commandResult: ClinicalRecordCommandResult;
    workflowActions: EditorWorkflowAction[];
    effects: EditorEffect[];
    userMessage?: string;
    snapshot?: ClinicalRecord;
    historyMetadata?: HistoryEntryMetadata;
}

const buildBlockedResult = (
    record: ClinicalRecord,
    metadata: HistoryEntryMetadata,
    error: string,
): ClinicalRecordCommandResult => ({
    ok: false,
    record,
    errors: [error],
    warnings: [],
    changed: false,
    effects: [],
    metadata: { ...metadata, changed: false },
});

const runWorkflowAwareCommand = (
    record: ClinicalRecord,
    workflowState: EditorWorkflowState,
    command: Parameters<typeof executeClinicalRecordCommand>[1],
): ClinicalRecordCommandResult => {
    const decision = canExecuteClinicalRecordCommand(command, workflowState.status);
    if (!decision.allowed) {
        return buildBlockedResult(record, buildHistoryMetadata('save_manual', 'persistence', 'Operación bloqueada', false), decision.reason);
    }

    return executeClinicalRecordCommand(record, command);
};

export const executeImportRecord = (
    record: ClinicalRecord,
    workflowState: EditorWorkflowState,
    value: unknown,
    source: 'local' | 'drive' | 'bootstrap',
): EditorUseCaseResult => {
    const commandResult = runWorkflowAwareCommand(record, workflowState, { type: 'replace_record_from_import', value });
    const effects = [
        ...commandResult.effects,
        ...(source === 'drive' ? [{ type: 'close_open_modal' as const }] : []),
    ];

    return {
        commandResult: { ...commandResult, effects },
        workflowActions: source === 'bootstrap'
            ? []
            : commandResult.ok
                ? [{ type: 'IMPORT_STARTED' }, { type: 'IMPORT_SUCCEEDED' }]
                : [{ type: 'IMPORT_STARTED' }, { type: 'IMPORT_FAILED', error: commandResult.errors.join('\n') || 'No se pudo importar el registro.' }],
        effects,
        userMessage: commandResult.ok
            ? source === 'bootstrap'
                ? 'Borrador recuperado automáticamente.'
                : 'Borrador importado correctamente.'
            : undefined,
    };
};

export const executeRestoreHistoryEntry = (
    record: ClinicalRecord,
    workflowState: EditorWorkflowState,
    entry: VersionHistoryEntry,
): EditorUseCaseResult => {
    const commandResult = runWorkflowAwareCommand(record, workflowState, { type: 'replace_record_from_history', entry });
    const effects = [...commandResult.effects, { type: 'close_history_modal' as const }];

    return {
        commandResult: { ...commandResult, effects },
        workflowActions: commandResult.ok
            ? [{ type: 'RESTORE_STARTED' }, { type: 'RESTORE_SUCCEEDED' }]
            : [{ type: 'RESTORE_STARTED' }, { type: 'RESTORE_FAILED', error: commandResult.errors.join('\n') || 'No se pudo restaurar la versión.' }],
        effects,
        userMessage: commandResult.ok ? 'Versión restaurada desde el historial.' : undefined,
    };
};

export const executeResetRecord = (
    record: ClinicalRecord,
    workflowState: EditorWorkflowState,
    templateId: string,
): EditorUseCaseResult => {
    const commandResult = runWorkflowAwareCommand(record, workflowState, { type: 'reset_record', templateId });
    return {
        commandResult,
        workflowActions: [],
        effects: commandResult.effects,
        userMessage: commandResult.ok ? 'Formulario restablecido.' : undefined,
    };
};

export const executeApplyHhrPatient = (
    record: ClinicalRecord,
    workflowState: EditorWorkflowState,
    patient: HhrCensusPatient,
    todayKey: string,
): EditorUseCaseResult => {
    const commandResult = runWorkflowAwareCommand(record, workflowState, { type: 'apply_hhr_patient', patient, todayKey });
    return {
        commandResult,
        workflowActions: [],
        effects: commandResult.effects,
        userMessage: commandResult.ok ? `Paciente ${patient.patientName} cargado desde HHR.` : undefined,
    };
};

export const executeSaveDraft = (
    record: ClinicalRecord,
    reason: 'auto' | 'manual' | 'import',
    overrideRecord?: ClinicalRecord,
): EditorUseCaseResult => {
    const snapshot = normalizeClinicalRecordSnapshot(overrideRecord ? structuredClone(overrideRecord) : structuredClone(record));
    const historyMetadata = buildHistoryMetadata(
        reason === 'manual' ? 'save_manual' : reason === 'auto' ? 'save_auto' : 'save_import',
        'persistence',
        reason === 'manual'
            ? 'Guardado manual'
            : reason === 'auto'
                ? 'Autoguardado'
                : 'Importación persistida',
        snapshot.changed,
        `save:${reason}`,
    );

    return {
        commandResult: { ...snapshot, metadata: historyMetadata },
        workflowActions: [{ type: 'SAVE_REQUESTED' }, { type: 'SAVE_SUCCEEDED' }],
        effects: snapshot.effects,
        snapshot: snapshot.record,
        historyMetadata,
        userMessage: reason === 'manual' ? 'Borrador guardado localmente.' : undefined,
    };
};

export const executeSyncToHhr = (
    workflowState: EditorWorkflowState,
    canSave: boolean,
    disabledReason?: string,
): { allowed: boolean; workflowActions: EditorWorkflowAction[]; userMessage?: string } => {
    if (!canSave) {
        return {
            allowed: false,
            workflowActions: [],
            userMessage: disabledReason || 'No se puede guardar en HHR en este momento.',
        };
    }

    if (workflowState.status !== 'idle' && workflowState.status !== 'dirty' && workflowState.status !== 'error') {
        return {
            allowed: false,
            workflowActions: [],
            userMessage: 'El editor está ocupado y no puede sincronizar con HHR ahora.',
        };
    }

    return {
        allowed: true,
        workflowActions: [{ type: 'SYNC_STARTED' }],
    };
};

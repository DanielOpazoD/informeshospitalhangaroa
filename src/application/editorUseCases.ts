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
        ...(source === 'drive' ? [{ type: 'close_modal' as const, modal: 'open' as const, priority: 60 }] : []),
        ...(commandResult.ok
            ? [{
                type: 'show_toast' as const,
                message: source === 'bootstrap' ? 'Borrador recuperado automáticamente.' : 'Borrador importado correctamente.',
                tone: 'success' as const,
                dedupeKey: `import:${source}`,
                priority: 80,
            }]
            : []),
        ...(commandResult.ok && source !== 'bootstrap'
            ? [{ type: 'request_focus' as const, target: 'record-title' as const, priority: 50 }]
            : []),
        ...(commandResult.ok
            ? [{ type: 'log_audit_event' as const, event: `editor.import.${source}`, priority: 10 }]
            : []),
    ];

    return {
        commandResult: { ...commandResult, effects },
        workflowActions: source === 'bootstrap'
            ? []
            : commandResult.ok
                ? [{ type: 'IMPORT_STARTED' }, { type: 'IMPORT_SUCCEEDED' }]
                : [{ type: 'IMPORT_STARTED' }, { type: 'IMPORT_FAILED', error: commandResult.errors.join('\n') || 'No se pudo importar el registro.' }],
        effects,
        userMessage: undefined,
    };
};

export const executeRestoreHistoryEntry = (
    record: ClinicalRecord,
    workflowState: EditorWorkflowState,
    entry: VersionHistoryEntry,
    options?: {
        closeHistoryModal?: boolean;
        successToast?: string;
        auditEvent?: string;
    },
): EditorUseCaseResult => {
    const commandResult = runWorkflowAwareCommand(record, workflowState, { type: 'replace_record_from_history', entry });
    const effects = [
        ...commandResult.effects.filter(effect => options?.closeHistoryModal !== false || effect.type !== 'close_modal'),
        ...(options?.closeHistoryModal === false ? [] : [{ type: 'close_modal' as const, modal: 'history' as const, priority: 60 }]),
        {
            type: 'show_toast' as const,
            message: options?.successToast || 'Versión restaurada desde el historial.',
            tone: 'success' as const,
            dedupeKey: `${options?.auditEvent || 'restore'}:${entry.id}`,
            priority: 80,
        },
        {
            type: 'log_audit_event' as const,
            event: options?.auditEvent || 'editor.restore_history',
            details: entry.id,
            priority: 10,
        },
    ];

    return {
        commandResult: { ...commandResult, effects },
        workflowActions: commandResult.ok
            ? [{ type: 'RESTORE_STARTED' }, { type: 'RESTORE_SUCCEEDED' }]
            : [{ type: 'RESTORE_STARTED' }, { type: 'RESTORE_FAILED', error: commandResult.errors.join('\n') || 'No se pudo restaurar la versión.' }],
        effects,
        userMessage: undefined,
    };
};

export const executeResetRecord = (
    record: ClinicalRecord,
    workflowState: EditorWorkflowState,
    templateId: string,
): EditorUseCaseResult => {
    const commandResult = runWorkflowAwareCommand(record, workflowState, { type: 'reset_record', templateId });
    return {
        commandResult: {
            ...commandResult,
            effects: commandResult.ok
                ? [
                    ...commandResult.effects,
                    {
                        type: 'show_toast' as const,
                        message: 'Formulario restablecido.',
                        tone: 'warning' as const,
                        dedupeKey: `reset:${templateId}`,
                        priority: 80,
                    },
                ]
                : commandResult.effects,
        },
        workflowActions: [],
        effects: commandResult.ok
            ? [
                ...commandResult.effects,
                {
                    type: 'show_toast' as const,
                    message: 'Formulario restablecido.',
                    tone: 'warning' as const,
                    dedupeKey: `reset:${templateId}`,
                    priority: 80,
                },
            ]
            : commandResult.effects,
        userMessage: undefined,
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
        commandResult: {
            ...commandResult,
            effects: commandResult.ok
                ? [
                    ...commandResult.effects,
                    {
                        type: 'show_toast' as const,
                        message: `Paciente ${patient.patientName} cargado desde HHR.`,
                        tone: 'success' as const,
                        dedupeKey: `hhr:${patient.rut}`,
                        priority: 80,
                    },
                    {
                        type: 'request_focus' as const,
                        target: 'patient' as const,
                        priority: 50,
                    },
                ]
                : commandResult.effects,
        },
        workflowActions: [],
        effects: commandResult.ok
            ? [
                ...commandResult.effects,
                {
                    type: 'show_toast' as const,
                    message: `Paciente ${patient.patientName} cargado desde HHR.`,
                    tone: 'success' as const,
                    dedupeKey: `hhr:${patient.rut}`,
                    priority: 80,
                },
                {
                    type: 'request_focus' as const,
                    target: 'patient' as const,
                    priority: 50,
                },
            ]
            : commandResult.effects,
        userMessage: undefined,
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
        effects: reason === 'manual'
            ? [
                ...snapshot.effects,
                {
                    type: 'show_toast' as const,
                    message: 'Borrador guardado localmente.',
                    tone: 'success' as const,
                    dedupeKey: 'save:manual',
                    priority: 80,
                },
            ]
            : snapshot.effects,
        snapshot: snapshot.record,
        historyMetadata,
        userMessage: undefined,
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

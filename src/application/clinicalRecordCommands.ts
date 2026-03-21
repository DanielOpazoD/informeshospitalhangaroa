import { generateSectionId } from '../constants';
import type { HhrCensusPatient } from '../hhrTypes';
import type {
    ClinicalRecord,
    ClinicalSectionData,
    ClinicalRecordCommandCategory,
    ClinicalRecordCommandType,
    EditorEffect,
    EditorWorkflowStatus,
    HistoryEntryMetadata,
    PatientField,
    VersionHistoryEntry,
} from '../types';
import { loadClinicalRecord } from '../domain/clinicalRecord';
import { calcEdadY } from '../utils/dateUtils';
import { applyHhrPatientToRecord } from '../utils/hhrIntegration';
import {
    createTemplateBaseline,
    getAutoTitleForTemplate,
    getReportDateValue,
    normalizePatientFields,
    remapPatientFieldsForTemplate,
} from '../utils/recordTemplates';

export type ClinicalRecordCommand =
    | { type: 'edit_patient_field'; index: number; value: string }
    | { type: 'edit_patient_label'; index: number; label: string }
    | { type: 'edit_section_content'; index: number; content: string }
    | { type: 'edit_section_title'; index: number; title: string }
    | { type: 'update_section_meta'; index: number; meta: Partial<ClinicalSectionData> }
    | { type: 'add_section'; section: ClinicalSectionData }
    | { type: 'remove_section'; index: number }
    | { type: 'add_patient_field'; field: PatientField }
    | { type: 'remove_patient_field'; index: number }
    | { type: 'change_template'; templateId: string }
    | { type: 'change_record_title'; title: string }
    | { type: 'edit_professional_field'; field: 'medico' | 'especialidad'; value: string }
    | { type: 'reset_record'; templateId: string }
    | { type: 'apply_hhr_patient'; patient: HhrCensusPatient; todayKey: string }
    | { type: 'replace_record_from_import'; value: unknown }
    | { type: 'replace_record_from_history'; entry: VersionHistoryEntry };

export type ClinicalRecordCommandResult =
    | {
        ok: true;
        record: ClinicalRecord;
        warnings: string[];
        changed: boolean;
        effects: EditorEffect[];
        metadata: HistoryEntryMetadata;
    }
    | {
        ok: false;
        record: ClinicalRecord;
        errors: string[];
        warnings: string[];
        changed: false;
        effects: EditorEffect[];
        metadata: HistoryEntryMetadata;
    };

export interface ClinicalRecordCommandPolicy {
    category: ClinicalRecordCommandCategory;
    mutatesDocument: boolean;
    allowedStatuses: EditorWorkflowStatus[];
    blockedReason: string;
}

export const buildHistoryMetadata = (
    commandType: ClinicalRecordCommandType,
    commandCategory: ClinicalRecordCommandCategory,
    summary: string,
    changed = true,
    groupKey?: string,
): HistoryEntryMetadata => ({
    commandType,
    commandCategory,
    changed,
    summary,
    ...(groupKey ? { groupKey } : {}),
});

const warningEffects = (warnings: string[]): EditorEffect[] =>
    warnings.map(message => ({ type: 'show_warning', message, dedupeKey: message, priority: 70 }));

const success = (
    record: ClinicalRecord,
    metadata: HistoryEntryMetadata,
    warnings: string[] = [],
    changed = true,
    effects: EditorEffect[] = [],
): ClinicalRecordCommandResult => ({
    ok: true,
    record,
    warnings,
    changed,
    effects: [...warningEffects(warnings), ...effects],
    metadata: { ...metadata, changed },
});

const failure = (
    record: ClinicalRecord,
    metadata: HistoryEntryMetadata,
    errors: string[],
    warnings: string[] = [],
    effects: EditorEffect[] = [],
): ClinicalRecordCommandResult => ({
    ok: false,
    record,
    errors,
    warnings,
    changed: false,
    effects: [...warningEffects(warnings), ...effects],
    metadata: { ...metadata, changed: false },
});

const serializeClinicalRecord = (record: ClinicalRecord): string => JSON.stringify(record);

const didRecordChange = (currentRecord: ClinicalRecord, nextRecord: ClinicalRecord): boolean =>
    serializeClinicalRecord(currentRecord) !== serializeClinicalRecord(nextRecord);

const getCommandMetadata = (command: ClinicalRecordCommand): HistoryEntryMetadata => {
    switch (command.type) {
        case 'edit_patient_field':
            return buildHistoryMetadata(command.type, 'document_edit', 'Edición de campo del paciente', true, `patient-field:${command.index}`);
        case 'edit_patient_label':
            return buildHistoryMetadata(command.type, 'document_edit', 'Edición de etiqueta del paciente', true, `patient-label:${command.index}`);
        case 'edit_section_content':
            return buildHistoryMetadata(command.type, 'document_edit', 'Edición de contenido clínico', true, `section-content:${command.index}`);
        case 'edit_section_title':
            return buildHistoryMetadata(command.type, 'document_edit', 'Edición de título de sección', true, `section-title:${command.index}`);
        case 'update_section_meta':
            return buildHistoryMetadata(command.type, 'document_edit', 'Actualización de metadatos de sección', true, `section-meta:${command.index}`);
        case 'add_section':
            return buildHistoryMetadata(command.type, 'document_structure', 'Se agregó una sección clínica', true, 'section-structure');
        case 'remove_section':
            return buildHistoryMetadata(command.type, 'document_structure', 'Se eliminó una sección clínica', true, 'section-structure');
        case 'add_patient_field':
            return buildHistoryMetadata(command.type, 'document_structure', 'Se agregó un campo del paciente', true, 'patient-structure');
        case 'remove_patient_field':
            return buildHistoryMetadata(command.type, 'document_structure', 'Se eliminó un campo del paciente', true, 'patient-structure');
        case 'change_template':
            return buildHistoryMetadata(command.type, 'document_structure', 'Se cambió la plantilla del documento', true, 'template');
        case 'change_record_title':
            return buildHistoryMetadata(command.type, 'document_edit', 'Se actualizó el título del documento', true, 'record-title');
        case 'edit_professional_field':
            return buildHistoryMetadata(command.type, 'document_edit', `Se actualizó ${command.field}`, true, `professional:${command.field}`);
        case 'reset_record':
            return buildHistoryMetadata(command.type, 'document_structure', 'Se restableció la plantilla', true, 'reset');
        case 'apply_hhr_patient':
            return buildHistoryMetadata(command.type, 'external_sync', 'Se cargaron datos del paciente desde HHR', true, 'hhr-patient');
        case 'replace_record_from_import':
            return buildHistoryMetadata(command.type, 'document_replace', 'Se importó un registro clínico', true, 'import');
        case 'replace_record_from_history':
            return buildHistoryMetadata(command.type, 'document_replace', 'Se restauró una versión del historial', true, 'restore');
        default:
            return buildHistoryMetadata('save_manual', 'persistence', 'Operación clínica', true);
    }
};

export const getClinicalRecordCommandPolicy = (command: ClinicalRecordCommand): ClinicalRecordCommandPolicy => {
    switch (command.type) {
        case 'replace_record_from_import':
            return {
                category: 'document_replace',
                mutatesDocument: true,
                allowedStatuses: ['idle', 'dirty', 'error', 'importing'],
                blockedReason: 'No se puede importar un registro mientras otra operación crítica está en curso.',
            };
        case 'replace_record_from_history':
            return {
                category: 'document_replace',
                mutatesDocument: true,
                allowedStatuses: ['idle', 'dirty', 'error', 'restoring'],
                blockedReason: 'No se puede restaurar una versión mientras otra operación crítica está en curso.',
            };
        case 'apply_hhr_patient':
            return {
                category: 'external_sync',
                mutatesDocument: true,
                allowedStatuses: ['idle', 'dirty', 'error'],
                blockedReason: 'No se puede aplicar datos desde HHR mientras el editor está ocupado.',
            };
        case 'change_template':
        case 'reset_record':
            return {
                category: 'document_structure',
                mutatesDocument: true,
                allowedStatuses: ['idle', 'dirty', 'error'],
                blockedReason: 'No se puede cambiar la estructura del documento mientras el editor está ocupado.',
            };
        default:
            return {
                category: 'document_edit',
                mutatesDocument: true,
                allowedStatuses: ['idle', 'dirty', 'error'],
                blockedReason: 'No se puede editar el documento mientras el editor está ocupado.',
            };
    }
};

export const canExecuteClinicalRecordCommand = (
    command: ClinicalRecordCommand,
    workflowStatus: EditorWorkflowStatus,
): { allowed: true; policy: ClinicalRecordCommandPolicy } | { allowed: false; policy: ClinicalRecordCommandPolicy; reason: string } => {
    const policy = getClinicalRecordCommandPolicy(command);
    if (policy.allowedStatuses.includes(workflowStatus)) {
        return { allowed: true, policy };
    }

    return {
        allowed: false,
        policy,
        reason: policy.blockedReason,
    };
};

const getFieldAtIndex = (record: ClinicalRecord, index: number): PatientField | null =>
    index >= 0 && index < record.patientFields.length ? record.patientFields[index] : null;

const getSectionAtIndex = (record: ClinicalRecord, index: number): ClinicalSectionData | null =>
    index >= 0 && index < record.sections.length ? record.sections[index] : null;

const syncAutoTitle = (record: ClinicalRecord): ClinicalRecord => (
    record.titleMode === 'auto'
        ? {
            ...record,
            title: getAutoTitleForTemplate(record.templateId, getReportDateValue(record)),
            titleMode: 'auto',
        }
        : record
);

const syncDerivedPatientFields = (fields: PatientField[]): PatientField[] => {
    const nextFields = [...fields];
    const birthDateField = nextFields.find(field => field.id === 'fecnac');
    const reportDateField = nextFields.find(field => field.id === 'finf');
    const ageIndex = nextFields.findIndex(field => field.id === 'edad');

    if (ageIndex !== -1) {
        nextFields[ageIndex] = {
            ...nextFields[ageIndex],
            value: calcEdadY(birthDateField?.value || '', reportDateField?.value),
        };
    }

    return nextFields;
};

const finalizeRecord = (
    currentRecord: ClinicalRecord,
    candidateRecord: ClinicalRecord,
    metadata: HistoryEntryMetadata,
    effects: EditorEffect[] = [],
): ClinicalRecordCommandResult => {
    const loaded = loadClinicalRecord(candidateRecord, normalizePatientFields);
    if (!loaded.record) {
        return failure(currentRecord, metadata, loaded.errors, loaded.warnings, effects);
    }

    const nextRecord = syncAutoTitle(loaded.record);
    return success(nextRecord, metadata, loaded.warnings, didRecordChange(currentRecord, nextRecord), effects);
};

const finalizeLoadedRecord = (
    currentRecord: ClinicalRecord,
    value: unknown,
    metadata: HistoryEntryMetadata,
    effects: EditorEffect[] = [],
): ClinicalRecordCommandResult => {
    const loaded = loadClinicalRecord(value, normalizePatientFields);
    if (!loaded.record) {
        return failure(currentRecord, metadata, loaded.errors, loaded.warnings, effects);
    }

    const nextRecord = syncAutoTitle(loaded.record);
    return success(nextRecord, metadata, loaded.warnings, didRecordChange(currentRecord, nextRecord), effects);
};

export const normalizeClinicalRecordSnapshot = (record: ClinicalRecord): ClinicalRecordCommandResult =>
    finalizeRecord(
        record,
        record,
        buildHistoryMetadata('save_auto', 'persistence', 'Normalización de snapshot', true, 'snapshot'),
    );

export const executeClinicalRecordCommand = (
    record: ClinicalRecord,
    command: ClinicalRecordCommand,
): ClinicalRecordCommandResult => {
    const metadata = getCommandMetadata(command);

    switch (command.type) {
        case 'edit_patient_field': {
            const field = getFieldAtIndex(record, command.index);
            if (!field) {
                return failure(record, metadata, ['El campo de paciente que intenta editar no existe.']);
            }

            const patientFields = [...record.patientFields];
            patientFields[command.index] = { ...field, value: command.value };
            return finalizeRecord(record, {
                ...record,
                patientFields: syncDerivedPatientFields(patientFields),
            }, metadata);
        }
        case 'edit_patient_label': {
            const field = getFieldAtIndex(record, command.index);
            if (!field) {
                return failure(record, metadata, ['El campo de paciente que intenta renombrar no existe.']);
            }

            const patientFields = [...record.patientFields];
            patientFields[command.index] = { ...field, label: command.label };
            return finalizeRecord(record, { ...record, patientFields }, metadata);
        }
        case 'edit_section_content': {
            const section = getSectionAtIndex(record, command.index);
            if (!section) {
                return failure(record, metadata, ['La sección que intenta editar no existe.']);
            }

            const sections = [...record.sections];
            sections[command.index] = { ...section, content: command.content };
            return finalizeRecord(record, { ...record, sections }, metadata);
        }
        case 'edit_section_title': {
            const section = getSectionAtIndex(record, command.index);
            if (!section) {
                return failure(record, metadata, ['La sección que intenta renombrar no existe.']);
            }

            const sections = [...record.sections];
            sections[command.index] = { ...section, title: command.title };
            return finalizeRecord(record, { ...record, sections }, metadata);
        }
        case 'update_section_meta': {
            const section = getSectionAtIndex(record, command.index);
            if (!section) {
                return failure(record, metadata, ['La sección que intenta actualizar no existe.']);
            }

            const sections = [...record.sections];
            sections[command.index] = { ...section, ...command.meta };
            return finalizeRecord(record, { ...record, sections }, metadata);
        }
        case 'add_section':
            return finalizeRecord(record, {
                ...record,
                sections: [...record.sections, { ...command.section, id: command.section.id || generateSectionId() }],
            }, metadata);
        case 'remove_section':
            if (!getSectionAtIndex(record, command.index)) {
                return failure(record, metadata, ['La sección que intenta eliminar no existe.']);
            }

            return finalizeRecord(record, {
                ...record,
                sections: record.sections.filter((_, index) => index !== command.index),
            }, metadata);
        case 'add_patient_field':
            return finalizeRecord(record, {
                ...record,
                patientFields: syncDerivedPatientFields([...record.patientFields, command.field]),
            }, metadata);
        case 'remove_patient_field':
            if (!getFieldAtIndex(record, command.index)) {
                return failure(record, metadata, ['El campo de paciente que intenta eliminar no existe.']);
            }

            return finalizeRecord(record, {
                ...record,
                patientFields: syncDerivedPatientFields(record.patientFields.filter((_, index) => index !== command.index)),
            }, metadata);
        case 'change_template': {
            const baseline = createTemplateBaseline(command.templateId);
            const shouldKeepCustomTitle = record.titleMode === 'custom' || command.templateId === '5';

            return finalizeRecord(record, {
                ...record,
                templateId: baseline.templateId,
                title: shouldKeepCustomTitle ? record.title : baseline.title,
                titleMode: shouldKeepCustomTitle ? 'custom' : baseline.titleMode,
                patientFields: remapPatientFieldsForTemplate(record.patientFields, baseline.templateId),
                sections: baseline.sections,
            }, metadata, [{ type: 'reset_hhr_sync' }]);
        }
        case 'change_record_title':
            return finalizeRecord(record, {
                ...record,
                title: command.title,
                titleMode: 'custom',
            }, metadata);
        case 'edit_professional_field':
            return finalizeRecord(record, {
                ...record,
                [command.field]: command.value,
            }, metadata);
        case 'reset_record':
            return finalizeRecord(record, createTemplateBaseline(command.templateId), metadata, [
                { type: 'reset_hhr_sync', priority: 40 },
                { type: 'log_audit_event', event: 'record.reset', details: `template:${command.templateId}`, priority: 10 },
            ]);
        case 'apply_hhr_patient':
            return finalizeRecord(record, applyHhrPatientToRecord(record, command.patient, command.todayKey), metadata, [
                { type: 'reset_hhr_sync', priority: 40 },
                { type: 'log_audit_event', event: 'hhr.patient_applied', details: command.patient.patientName, priority: 10 },
            ]);
        case 'replace_record_from_import':
            return finalizeLoadedRecord(record, command.value, metadata, [
                { type: 'log_audit_event', event: 'record.imported', priority: 10 },
            ]);
        case 'replace_record_from_history':
            return finalizeLoadedRecord(record, command.entry.record, metadata, [
                { type: 'close_modal', modal: 'history', priority: 60 },
                { type: 'reset_hhr_sync', priority: 40 },
                { type: 'log_audit_event', event: 'record.restored', details: command.entry.id, priority: 10 },
            ]);
        default:
            return failure(record, metadata, ['El comando clínico solicitado no está soportado.']);
    }
};

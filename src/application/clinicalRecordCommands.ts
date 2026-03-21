import { generateSectionId } from '../constants';
import type { HhrCensusPatient } from '../hhrTypes';
import type { ClinicalRecord, ClinicalSectionData, PatientField, VersionHistoryEntry } from '../types';
import { loadClinicalRecord } from '../domain/clinicalRecord';
import { calcEdadY } from '../utils/dateUtils';
import {
    applyHhrPatientToRecord,
} from '../utils/hhrIntegration';
import {
    createTemplateBaseline,
    getAutoTitleForTemplate,
    getReportDateValue,
    normalizePatientFields,
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
    | { ok: true; record: ClinicalRecord; warnings: string[] }
    | { ok: false; record: ClinicalRecord; errors: string[]; warnings: string[] };

const success = (record: ClinicalRecord, warnings: string[] = []): ClinicalRecordCommandResult => ({
    ok: true,
    record,
    warnings,
});

const failure = (record: ClinicalRecord, errors: string[], warnings: string[] = []): ClinicalRecordCommandResult => ({
    ok: false,
    record,
    errors,
    warnings,
});

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

const finalizeRecord = (currentRecord: ClinicalRecord, candidateRecord: ClinicalRecord): ClinicalRecordCommandResult => {
    const loaded = loadClinicalRecord(candidateRecord, normalizePatientFields);
    if (!loaded.record) {
        return failure(currentRecord, loaded.errors, loaded.warnings);
    }

    return success(syncAutoTitle(loaded.record), loaded.warnings);
};

const finalizeLoadedRecord = (currentRecord: ClinicalRecord, value: unknown): ClinicalRecordCommandResult => {
    const loaded = loadClinicalRecord(value, normalizePatientFields);
    if (!loaded.record) {
        return failure(currentRecord, loaded.errors, loaded.warnings);
    }

    return success(syncAutoTitle(loaded.record), loaded.warnings);
};

export const normalizeClinicalRecordSnapshot = (record: ClinicalRecord): ClinicalRecordCommandResult =>
    finalizeRecord(record, record);

export const executeClinicalRecordCommand = (
    record: ClinicalRecord,
    command: ClinicalRecordCommand,
): ClinicalRecordCommandResult => {
    switch (command.type) {
        case 'edit_patient_field': {
            const field = getFieldAtIndex(record, command.index);
            if (!field) {
                return failure(record, ['El campo de paciente que intenta editar no existe.']);
            }

            const patientFields = [...record.patientFields];
            patientFields[command.index] = { ...field, value: command.value };
            return finalizeRecord(record, {
                ...record,
                patientFields: syncDerivedPatientFields(patientFields),
            });
        }
        case 'edit_patient_label': {
            const field = getFieldAtIndex(record, command.index);
            if (!field) {
                return failure(record, ['El campo de paciente que intenta renombrar no existe.']);
            }

            const patientFields = [...record.patientFields];
            patientFields[command.index] = { ...field, label: command.label };
            return finalizeRecord(record, { ...record, patientFields });
        }
        case 'edit_section_content': {
            const section = getSectionAtIndex(record, command.index);
            if (!section) {
                return failure(record, ['La sección que intenta editar no existe.']);
            }

            const sections = [...record.sections];
            sections[command.index] = { ...section, content: command.content };
            return finalizeRecord(record, { ...record, sections });
        }
        case 'edit_section_title': {
            const section = getSectionAtIndex(record, command.index);
            if (!section) {
                return failure(record, ['La sección que intenta renombrar no existe.']);
            }

            const sections = [...record.sections];
            sections[command.index] = { ...section, title: command.title };
            return finalizeRecord(record, { ...record, sections });
        }
        case 'update_section_meta': {
            const section = getSectionAtIndex(record, command.index);
            if (!section) {
                return failure(record, ['La sección que intenta actualizar no existe.']);
            }

            const sections = [...record.sections];
            sections[command.index] = { ...section, ...command.meta };
            return finalizeRecord(record, { ...record, sections });
        }
        case 'add_section':
            return finalizeRecord(record, {
                ...record,
                sections: [...record.sections, { ...command.section, id: command.section.id || generateSectionId() }],
            });
        case 'remove_section':
            if (!getSectionAtIndex(record, command.index)) {
                return failure(record, ['La sección que intenta eliminar no existe.']);
            }

            return finalizeRecord(record, {
                ...record,
                sections: record.sections.filter((_, index) => index !== command.index),
            });
        case 'add_patient_field':
            return finalizeRecord(record, {
                ...record,
                patientFields: syncDerivedPatientFields([...record.patientFields, command.field]),
            });
        case 'remove_patient_field':
            if (!getFieldAtIndex(record, command.index)) {
                return failure(record, ['El campo de paciente que intenta eliminar no existe.']);
            }

            return finalizeRecord(record, {
                ...record,
                patientFields: syncDerivedPatientFields(record.patientFields.filter((_, index) => index !== command.index)),
            });
        case 'change_template': {
            const baseline = createTemplateBaseline(command.templateId);
            const shouldKeepCustomTitle = record.titleMode === 'custom' || command.templateId === '5';

            return finalizeRecord(record, {
                ...record,
                templateId: baseline.templateId,
                title: shouldKeepCustomTitle ? record.title : baseline.title,
                titleMode: shouldKeepCustomTitle ? 'custom' : baseline.titleMode,
                patientFields: baseline.patientFields,
                sections: baseline.sections,
            });
        }
        case 'change_record_title':
            return finalizeRecord(record, {
                ...record,
                title: command.title,
                titleMode: 'custom',
            });
        case 'edit_professional_field':
            return finalizeRecord(record, {
                ...record,
                [command.field]: command.value,
            });
        case 'reset_record':
            return finalizeRecord(record, createTemplateBaseline(command.templateId));
        case 'apply_hhr_patient':
            return finalizeRecord(record, applyHhrPatientToRecord(record, command.patient, command.todayKey));
        case 'replace_record_from_import':
            return finalizeLoadedRecord(record, command.value);
        case 'replace_record_from_history':
            return finalizeLoadedRecord(record, command.entry.record);
        default:
            return failure(record, ['El comando clínico solicitado no está soportado.']);
    }
};

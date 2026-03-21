import {
    executeClinicalRecordCommand,
    normalizeClinicalRecordSnapshot,
} from './clinicalRecordCommands';
import type { ClinicalRecord, VersionHistoryEntry } from '../types';
import { type LoadClinicalRecordResult } from '../domain/clinicalRecord';
import type { HhrCensusPatient } from '../hhrTypes';
import {
    getAutoTitleForTemplate,
    getReportDateValue,
    normalizePatientFields,
} from '../utils/recordTemplates';

const toLoadResult = (result: ReturnType<typeof executeClinicalRecordCommand>): LoadClinicalRecordResult => (
    result.ok
        ? { record: result.record, warnings: result.warnings, errors: [] }
        : { record: null, warnings: result.warnings, errors: result.errors }
);

export const applyAutoTitle = (record: ClinicalRecord): ClinicalRecord => {
    if (record.titleMode !== 'auto') {
        return record;
    }

    return { ...record, title: getAutoTitleForTemplate(record.templateId, getReportDateValue(record)) };
};

export const changeTemplate = (record: ClinicalRecord, templateId: string): ClinicalRecord => {
    const result = executeClinicalRecordCommand(record, { type: 'change_template', templateId });
    return result.record;
};

export const changeRecordTitle = (record: ClinicalRecord, title: string): ClinicalRecord =>
    executeClinicalRecordCommand(record, { type: 'change_record_title', title }).record;

export const importRecordFromJson = (
    value: unknown,
    _customNormalizePatientFields?: (fields: ClinicalRecord['patientFields']) => ClinicalRecord['patientFields'],
): LoadClinicalRecordResult =>
    toLoadResult(
        executeClinicalRecordCommand(
            {
                version: 'v14',
                templateId: '2',
                title: '',
                patientFields: normalizePatientFields([]),
                sections: [],
                medico: '',
                especialidad: '',
            },
            { type: 'replace_record_from_import', value },
        ),
    );

export const importRecordFromDrive = (
    value: unknown,
    _customNormalizePatientFields?: (fields: ClinicalRecord['patientFields']) => ClinicalRecord['patientFields'],
): LoadClinicalRecordResult => importRecordFromJson(value);

export const restoreHistoryEntry = (
    entry: VersionHistoryEntry,
    _customNormalizePatientFields?: (fields: ClinicalRecord['patientFields']) => ClinicalRecord['patientFields'],
): LoadClinicalRecordResult =>
    toLoadResult(executeClinicalRecordCommand(entry.record, { type: 'replace_record_from_history', entry }));

export const saveDraftSnapshot = (
    record: ClinicalRecord,
    _customNormalizePatientFields?: (fields: ClinicalRecord['patientFields']) => ClinicalRecord['patientFields'],
): ClinicalRecord => {
    const result = normalizeClinicalRecordSnapshot(record);
    return result.record;
};

export const resetRecord = (templateId: string, currentRecord?: ClinicalRecord): ClinicalRecord => {
    if (!currentRecord) {
        return executeClinicalRecordCommand({
            version: 'v14',
            templateId,
            title: '',
            patientFields: normalizePatientFields([]),
            sections: [],
            medico: '',
            especialidad: '',
        }, { type: 'reset_record', templateId }).record;
    }
    return executeClinicalRecordCommand(currentRecord, { type: 'reset_record', templateId }).record;
};

export const syncRecordWithHhr = (
    record: ClinicalRecord,
    patient: HhrCensusPatient,
    todayKey: string,
): ClinicalRecord => executeClinicalRecordCommand(record, { type: 'apply_hhr_patient', patient, todayKey }).record;

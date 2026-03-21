import type { ClinicalRecord, VersionHistoryEntry } from '../types';
import {
    loadClinicalRecord,
    type LoadClinicalRecordResult,
} from '../domain/clinicalRecord';
import {
    createTemplateBaseline,
    getAutoTitleForTemplate,
    getReportDateValue,
    inferTitleMode,
    normalizePatientFields,
} from '../utils/recordTemplates';
import type { HhrCensusPatient } from '../hhrTypes';
import { applyHhrPatientToRecord } from '../utils/hhrIntegration';

const ensureLoadedRecord = (
    value: unknown,
    customNormalizePatientFields?: (fields: ClinicalRecord['patientFields']) => ClinicalRecord['patientFields'],
): LoadClinicalRecordResult =>
    loadClinicalRecord(value, customNormalizePatientFields || normalizePatientFields);

export const applyAutoTitle = (record: ClinicalRecord): ClinicalRecord => {
    if (inferTitleMode(record) !== 'auto') {
        return {
            ...record,
            titleMode: 'custom',
        };
    }

    return {
        ...record,
        title: getAutoTitleForTemplate(record.templateId, getReportDateValue(record)),
        titleMode: 'auto',
    };
};

export const changeTemplate = (record: ClinicalRecord, templateId: string): ClinicalRecord => {
    const baseline = createTemplateBaseline(templateId);
    const shouldKeepCustomTitle = inferTitleMode(record) === 'custom' || templateId === '5';

    return {
        ...record,
        templateId: baseline.templateId,
        title: shouldKeepCustomTitle ? record.title : baseline.title,
        titleMode: shouldKeepCustomTitle ? 'custom' : baseline.titleMode,
        patientFields: baseline.patientFields,
        sections: baseline.sections,
    };
};

export const changeRecordTitle = (record: ClinicalRecord, title: string): ClinicalRecord => ({
    ...record,
    title,
    titleMode: 'custom',
});

export const importRecordFromJson = (
    value: unknown,
    customNormalizePatientFields?: (fields: ClinicalRecord['patientFields']) => ClinicalRecord['patientFields'],
): LoadClinicalRecordResult => ensureLoadedRecord(value, customNormalizePatientFields);

export const importRecordFromDrive = (
    value: unknown,
    customNormalizePatientFields?: (fields: ClinicalRecord['patientFields']) => ClinicalRecord['patientFields'],
): LoadClinicalRecordResult => ensureLoadedRecord(value, customNormalizePatientFields);

export const restoreHistoryEntry = (
    entry: VersionHistoryEntry,
    customNormalizePatientFields?: (fields: ClinicalRecord['patientFields']) => ClinicalRecord['patientFields'],
): LoadClinicalRecordResult => ensureLoadedRecord(entry.record, customNormalizePatientFields);

export const saveDraftSnapshot = (
    record: ClinicalRecord,
    customNormalizePatientFields?: (fields: ClinicalRecord['patientFields']) => ClinicalRecord['patientFields'],
): ClinicalRecord => {
    const loaded = ensureLoadedRecord(record, customNormalizePatientFields);
    return loaded.record || applyAutoTitle({
        ...record,
        patientFields: (customNormalizePatientFields || normalizePatientFields)(record.patientFields),
    });
};

export const resetRecord = (templateId: string): ClinicalRecord => createTemplateBaseline(templateId);

export const syncRecordWithHhr = (
    record: ClinicalRecord,
    patient: HhrCensusPatient,
    todayKey: string,
): ClinicalRecord => applyAutoTitle(applyHhrPatientToRecord(record, patient, todayKey));

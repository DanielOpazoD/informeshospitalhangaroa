import type { ClinicalRecord } from '../types';
import {
    isClinicalRecord as isClinicalRecordValue,
    loadClinicalRecord,
    validateClinicalRecordInvariants,
} from '../domain/clinicalRecord';

export interface ParseClinicalRecordResult {
    record: ClinicalRecord | null;
    warnings: string[];
}

export const parseClinicalRecord = (
    value: unknown,
    normalizePatientFields?: (
        fields: ClinicalRecord['patientFields'],
        templateId?: string,
    ) => ClinicalRecord['patientFields'],
): ParseClinicalRecordResult => {
    const { record, warnings } = loadClinicalRecord(value, normalizePatientFields);
    return { record, warnings };
};

export const isClinicalRecord = isClinicalRecordValue;
export const validateCriticalFields = validateClinicalRecordInvariants;

export const formatTimeSince = (timestamp: number, reference = Date.now()): string => {
    const diff = Math.max(0, reference - timestamp);
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'hace instantes';
    if (minutes === 1) return 'hace 1 minuto';
    if (minutes < 60) return `hace ${minutes} minutos`;
    const hours = Math.floor(minutes / 60);
    if (hours === 1) return 'hace 1 hora';
    if (hours < 24) return `hace ${hours} horas`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'hace 1 día';
    return `hace ${days} días`;
};

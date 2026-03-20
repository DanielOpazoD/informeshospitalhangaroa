import type { ClinicalRecord, PatientField } from '../types';
import { FIELD_IDS } from '../appConstants';

const findFieldValue = (fields: PatientField[], id: string) =>
    fields.find(field => field.id === id)?.value?.trim() || '';

const parseDate = (value: string) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};

export const validateCriticalFields = (record: ClinicalRecord): string[] => {
    const errors: string[] = [];
    const hasField = (id: string) => record.patientFields.some(field => field.id === id);

    const name = findFieldValue(record.patientFields, FIELD_IDS.nombre);
    const rut = findFieldValue(record.patientFields, FIELD_IDS.rut);
    const birth = findFieldValue(record.patientFields, FIELD_IDS.fecnac);
    const admission = findFieldValue(record.patientFields, FIELD_IDS.fing);
    const report = findFieldValue(record.patientFields, FIELD_IDS.finf);

    if (hasField(FIELD_IDS.nombre) && !name) errors.push('Ingrese el nombre del paciente.');
    if (hasField(FIELD_IDS.rut) && !rut) {
        errors.push('Ingrese el RUT del paciente.');
    }

    const birthDate = hasField(FIELD_IDS.fecnac) ? parseDate(birth) : null;
    const admissionDate = hasField(FIELD_IDS.fing) ? parseDate(admission) : null;
    const reportDate = hasField(FIELD_IDS.finf) ? parseDate(report) : null;

    if (hasField(FIELD_IDS.fecnac) && !birthDate) errors.push('Ingrese una fecha de nacimiento válida.');
    if (hasField(FIELD_IDS.fing) && !admissionDate) errors.push('Ingrese una fecha de ingreso válida.');
    if (hasField(FIELD_IDS.finf) && !reportDate) errors.push('Ingrese una fecha de informe válida.');

    if (birthDate && admissionDate && birthDate > admissionDate) {
        errors.push('La fecha de ingreso debe ser posterior a la fecha de nacimiento.');
    }

    if (admissionDate && reportDate && admissionDate > reportDate) {
        errors.push('La fecha del informe debe ser posterior a la fecha de ingreso.');
    }

    return errors;
};

const isPatientField = (value: unknown): value is PatientField => {
    if (!value || typeof value !== 'object') return false;
    const candidate = value as Partial<PatientField>;
    return (
        typeof candidate.label === 'string' &&
        typeof candidate.value === 'string' &&
        (candidate.type === 'text' || candidate.type === 'date' || candidate.type === 'number' || candidate.type === 'time')
    );
};

export const isClinicalRecord = (value: unknown): value is ClinicalRecord => {
    if (!value || typeof value !== 'object') return false;
    const candidate = value as Partial<ClinicalRecord>;
    return (
        typeof candidate.version === 'string' &&
        typeof candidate.templateId === 'string' &&
        typeof candidate.title === 'string' &&
        typeof candidate.medico === 'string' &&
        typeof candidate.especialidad === 'string' &&
        Array.isArray(candidate.patientFields) &&
        candidate.patientFields.every(isPatientField) &&
        Array.isArray(candidate.sections)
    );
};

export const parseClinicalRecord = (
    value: unknown,
    normalizePatientFields?: (fields: ClinicalRecord['patientFields']) => ClinicalRecord['patientFields'],
): ClinicalRecord | null => {
    if (!isClinicalRecord(value)) {
        return null;
    }

    return {
        ...value,
        patientFields: normalizePatientFields ? normalizePatientFields(value.patientFields) : value.patientFields,
    };
};

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

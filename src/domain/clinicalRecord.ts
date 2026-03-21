import { FIELD_IDS } from '../appConstants';
import type { ClinicalRecord, ClinicalSectionData, PatientField } from '../types';
import { sanitizeClinicalHtml } from '../utils/clinicalContentSanitizer';
import {
    inferTitleMode,
    normalizePatientFields as normalizeClinicalRecordPatientFields,
} from '../utils/recordTemplates';
import { CURRENT_RECORD_VERSION } from './clinicalRecordVersion';

interface ParsedClinicalSectionInput {
    id?: string;
    title: string;
    content: string;
    kind?: ClinicalSectionData['kind'];
    updateDate?: string;
    updateTime?: string;
}

interface ParsedClinicalRecordInput {
    version: string;
    templateId: string;
    title: string;
    titleMode?: 'auto' | 'custom';
    patientFields: PatientField[];
    sections: ParsedClinicalSectionInput[];
    medico: string;
    especialidad: string;
}

export interface LoadClinicalRecordResult {
    record: ClinicalRecord | null;
    warnings: string[];
    errors: string[];
}

const findFieldValue = (fields: PatientField[], id: string) =>
    fields.find(field => field.id === id)?.value?.trim() || '';

const parseDate = (value: string) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};

const buildDeterministicSectionId = (section: Pick<ParsedClinicalSectionInput, 'id' | 'title'>, index: number): string => {
    const explicitId = section.id?.trim();
    if (explicitId) {
        return explicitId;
    }

    const slug = section.title
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

    return `section-${index + 1}${slug ? `-${slug}` : ''}`;
};

export const validateClinicalRecordInvariants = (record: ClinicalRecord): string[] => {
    const errors: string[] = [];
    const hasField = (id: string) => record.patientFields.some(field => field.id === id);

    const name = findFieldValue(record.patientFields, FIELD_IDS.nombre);
    const rut = findFieldValue(record.patientFields, FIELD_IDS.rut);
    const birth = findFieldValue(record.patientFields, FIELD_IDS.fecnac);
    const admission = findFieldValue(record.patientFields, FIELD_IDS.fing);
    const report = findFieldValue(record.patientFields, FIELD_IDS.finf);

    if (hasField(FIELD_IDS.nombre) && !name) errors.push('Ingrese el nombre del paciente.');
    if (hasField(FIELD_IDS.rut) && !rut) errors.push('Ingrese el RUT del paciente.');

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

const isClinicalSectionKind = (value: unknown): value is ClinicalSectionData['kind'] =>
    value === undefined || value === 'standard' || value === 'clinical-update';

const isClinicalSectionInput = (value: unknown): value is ParsedClinicalSectionInput => {
    if (!value || typeof value !== 'object') return false;
    const candidate = value as Partial<ParsedClinicalSectionInput>;
    return (
        typeof candidate.title === 'string' &&
        typeof candidate.content === 'string' &&
        (candidate.id === undefined || typeof candidate.id === 'string') &&
        isClinicalSectionKind(candidate.kind) &&
        (candidate.updateDate === undefined || typeof candidate.updateDate === 'string') &&
        (candidate.updateTime === undefined || typeof candidate.updateTime === 'string')
    );
};

export const parseClinicalRecordInput = (value: unknown): { record: ParsedClinicalRecordInput | null; errors: string[] } => {
    if (!value || typeof value !== 'object') {
        return { record: null, errors: ['El payload recibido no es un objeto válido.'] };
    }

    const candidate = value as Partial<ClinicalRecord> & {
        patientFields?: unknown;
        sections?: unknown;
        titleMode?: unknown;
    };

    if (
        typeof candidate.version !== 'string' ||
        typeof candidate.templateId !== 'string' ||
        typeof candidate.title !== 'string' ||
        typeof candidate.medico !== 'string' ||
        typeof candidate.especialidad !== 'string' ||
        !Array.isArray(candidate.patientFields) ||
        !candidate.patientFields.every(isPatientField) ||
        !Array.isArray(candidate.sections)
    ) {
        return { record: null, errors: ['El payload clínico no cumple la estructura mínima requerida.'] };
    }

    if (!candidate.sections.every(isClinicalSectionInput)) {
        return { record: null, errors: ['Las secciones clínicas incluidas no tienen un formato válido.'] };
    }

    return {
        record: {
            version: candidate.version,
            templateId: candidate.templateId,
            title: candidate.title,
            titleMode: candidate.titleMode === 'auto' || candidate.titleMode === 'custom'
                ? candidate.titleMode
                : undefined,
            patientFields: candidate.patientFields,
            sections: candidate.sections,
            medico: candidate.medico,
            especialidad: candidate.especialidad,
        },
        errors: [],
    };
};

export const migrateClinicalRecord = (record: ParsedClinicalRecordInput): { record: ParsedClinicalRecordInput; warnings: string[] } => {
    const warnings: string[] = [];
    if (record.version !== CURRENT_RECORD_VERSION) {
        warnings.push(`El registro se migró desde la versión ${record.version} a ${CURRENT_RECORD_VERSION}.`);
    }

    return {
        record: {
            ...record,
            version: CURRENT_RECORD_VERSION,
            titleMode: record.titleMode === 'auto' || record.titleMode === 'custom'
                ? record.titleMode
                : inferTitleMode(record),
        },
        warnings,
    };
};

export const normalizeClinicalRecord = (
    record: ParsedClinicalRecordInput,
    normalizePatientFields: (fields: ClinicalRecord['patientFields']) => ClinicalRecord['patientFields'] = normalizeClinicalRecordPatientFields,
): ClinicalRecord => ({
    version: CURRENT_RECORD_VERSION,
    templateId: record.templateId,
    title: record.title,
    titleMode: record.titleMode === 'auto' || record.titleMode === 'custom'
        ? record.titleMode
        : inferTitleMode(record),
    patientFields: normalizePatientFields(record.patientFields),
    sections: record.sections.map((section, index) => ({
        id: buildDeterministicSectionId(section, index),
        title: section.title.trim(),
        content: section.content,
        ...(section.kind ? { kind: section.kind } : {}),
        ...(section.updateDate ? { updateDate: section.updateDate } : {}),
        ...(section.updateTime ? { updateTime: section.updateTime } : {}),
    })),
    medico: record.medico,
    especialidad: record.especialidad,
});

export const sanitizeClinicalRecord = (record: ClinicalRecord): { record: ClinicalRecord; warnings: string[] } => {
    const warnings = new Set<string>();

    const sanitizedSections = record.sections.map((section, index) => {
        const sanitized = sanitizeClinicalHtml(section.content);
        sanitized.warnings.forEach(warning => warnings.add(warning));
        if (!section.id.trim()) {
            warnings.add('Se generaron identificadores faltantes para secciones clínicas.');
        }

        return {
            ...section,
            id: buildDeterministicSectionId(section, index),
            title: section.title.trim(),
            content: sanitized.html,
        };
    });

    return {
        record: {
            ...record,
            sections: sanitizedSections,
        },
        warnings: Array.from(warnings),
    };
};

export const isClinicalRecord = (value: unknown): value is ClinicalRecord => {
    const parsed = parseClinicalRecordInput(value);
    return Boolean(parsed.record);
};

export const loadClinicalRecord = (
    value: unknown,
    normalizePatientFields?: (fields: ClinicalRecord['patientFields']) => ClinicalRecord['patientFields'],
): LoadClinicalRecordResult => {
    const parsed = parseClinicalRecordInput(value);
    if (!parsed.record) {
        return {
            record: null,
            warnings: [],
            errors: parsed.errors,
        };
    }

    const migrated = migrateClinicalRecord(parsed.record);
    const normalized = normalizeClinicalRecord(migrated.record, normalizePatientFields);
    const sanitized = sanitizeClinicalRecord(normalized);

    return {
        record: sanitized.record,
        warnings: [...migrated.warnings, ...sanitized.warnings],
        errors: [],
    };
};

import {
    TEMPLATES,
    generateSectionId,
    getDefaultPatientFieldsByTemplate,
    getDefaultSectionsByTemplate,
} from '../constants';
import { FIELD_IDS } from '../appConstants';
import type { ClinicalRecord, ClinicalSectionData, PatientField } from '../types';
import { formatDateDMY } from './dateUtils';
import { buildInstitutionTitle } from '../institutionConfig';
import { CURRENT_RECORD_VERSION } from '../domain/clinicalRecordVersion';

export const DEFAULT_TEMPLATE_ID = '3';
const DATED_EVOLUTION_TEMPLATE_ID = '2';
export const RECOMMENDED_GEMINI_MODEL = 'gemini-1.5-flash-latest';

const normalizeDateInputValue = (value: string): string => {
    const trimmed = value.trim();
    if (!trimmed) {
        return '';
    }

    const isoDateMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/);
    if (isoDateMatch) {
        const [, year, month, day] = isoDateMatch;
        return `${year}-${month}-${day}`;
    }

    const slashIsoMatch = trimmed.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
    if (slashIsoMatch) {
        const [, year, month, day] = slashIsoMatch;
        return `${year}-${month}-${day}`;
    }

    const localDateMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (localDateMatch) {
        const [, day, month, year] = localDateMatch;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    return trimmed;
};

const normalizeTimeInputValue = (value: string): string => {
    const trimmed = value.trim();
    if (!trimmed) {
        return '';
    }

    const timeMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/);
    if (!timeMatch) {
        return trimmed;
    }

    const [, hours, minutes] = timeMatch;
    return `${hours.padStart(2, '0')}:${minutes}`;
};

const normalizeNativeFieldValue = (field: PatientField): string => {
    if (field.type === 'date') {
        return normalizeDateInputValue(field.value);
    }

    if (field.type === 'time') {
        return normalizeTimeInputValue(field.value);
    }

    return field.value;
};

export const normalizePatientFields = (
    fields: PatientField[],
    templateId?: string,
): PatientField[] => {
    const filteredFields = fields.filter(field => field.id !== FIELD_IDS.cama && field.label !== 'Cama');
    const templateDefaults = getDefaultPatientFieldsByTemplate(templateId || DEFAULT_TEMPLATE_ID);
    const defaultById = new Map(templateDefaults.map(field => [field.id, field]));
    const defaultByLabel = new Map(templateDefaults.map(field => [field.label, field]));

    const normalizedFields = filteredFields.map(field => {
        const matchingDefault = field.id ? defaultById.get(field.id) : defaultByLabel.get(field.label);
        return matchingDefault
            ? {
                ...matchingDefault,
                ...field,
                label: matchingDefault.label,
                type: matchingDefault.type,
                value: normalizeNativeFieldValue(field),
                placeholder: field.placeholder ?? matchingDefault.placeholder,
                readonly: field.readonly ?? matchingDefault.readonly,
            }
            : { ...field, value: normalizeNativeFieldValue(field) };
    });

    return normalizedFields;
};

export const remapPatientFieldsForTemplate = (
    currentFields: PatientField[],
    templateId: string,
): PatientField[] => {
    const targetFields = getDefaultPatientFieldsByTemplate(templateId);
    const targetById = new Map(
        targetFields
            .filter(field => field.id)
            .map(field => [field.id as string, field]),
    );
    const targetIds = new Set(targetFields.map(field => field.id).filter((value): value is string => Boolean(value)));
    const currentById = new Map(
        currentFields
            .filter(field => field.id)
            .map(field => [field.id as string, field]),
    );

    const mergedDefaults = targetFields.map(field => {
        const currentField = field.id ? currentById.get(field.id) : undefined;
        return currentField
            ? {
                ...field,
                value: currentField.value,
                placeholder: currentField.placeholder ?? field.placeholder,
                readonly: currentField.readonly ?? field.readonly,
            }
            : { ...field };
    });

    const customFields = currentFields
        .filter(field => field.isCustom || !field.id || !targetIds.has(field.id))
        .map(field => {
            const targetField = field.id ? targetById.get(field.id) : undefined;
            return targetField ? { ...targetField, ...field } : { ...field };
        });

    return [...mergedDefaults, ...customFields];
};

export const createTemplateBaseline = (templateId: string): ClinicalRecord => {
    const selectedTemplateId = TEMPLATES[templateId] ? templateId : DEFAULT_TEMPLATE_ID;
    const title = getAutoTitleForTemplate(selectedTemplateId, '');
    return {
        version: CURRENT_RECORD_VERSION,
        templateId: selectedTemplateId,
        title,
        titleMode: selectedTemplateId === '5' ? 'custom' : 'auto',
        patientFields: getDefaultPatientFieldsByTemplate(selectedTemplateId),
        sections: getDefaultSectionsByTemplate(selectedTemplateId),
        medico: '',
        especialidad: '',
    };
};

export const getReportDateValue = (record: Pick<ClinicalRecord, 'patientFields'>): string =>
    record.patientFields.find(field => field.id === FIELD_IDS.finf)?.value || '';

export const getAutoTitleForTemplate = (templateId: string, reportDate: string): string => {
    const template = TEMPLATES[templateId];
    if (!template) {
        return 'Registro Clínico';
    }

    if (template.id === DATED_EVOLUTION_TEMPLATE_ID) {
        const formattedDate = formatDateDMY(reportDate);
        const baseTitle = formattedDate ? `Evolución médica (${formattedDate})` : 'Evolución médica (____)';
        return buildInstitutionTitle(baseTitle);
    }

    if (template.id === '5') {
        return '';
    }

    return template.title || 'Registro Clínico';
};

export const inferTitleMode = (
    record: Pick<ClinicalRecord, 'templateId' | 'title' | 'titleMode' | 'patientFields'>,
): 'auto' | 'custom' => {
    if (record.titleMode === 'auto' || record.titleMode === 'custom') {
        return record.titleMode;
    }

    if (record.templateId === '5') {
        return 'custom';
    }

    const autoTitle = getAutoTitleForTemplate(record.templateId, getReportDateValue(record));
    return record.title.trim() === autoTitle.trim() ? 'auto' : 'custom';
};

export const buildClinicalUpdateSection = (): ClinicalSectionData => {
    const now = new Date();
    const pad = (value: number) => String(value).padStart(2, '0');

    return {
        id: generateSectionId(),
        title: 'Actualización clínica',
        content: '',
        kind: 'clinical-update',
        updateDate: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
        updateTime: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
    };
};

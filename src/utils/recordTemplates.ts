import {
    DEFAULT_PATIENT_FIELDS,
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

export const normalizePatientFields = (fields: PatientField[]): PatientField[] => {
    const filteredFields = fields.filter(field => field.id !== FIELD_IDS.cama && field.label !== 'Cama');
    const defaultById = new Map(DEFAULT_PATIENT_FIELDS.map(field => [field.id, field]));
    const defaultByLabel = new Map(DEFAULT_PATIENT_FIELDS.map(field => [field.label, field]));
    const seenDefaultIds = new Set<string>();

    const normalizedFields = filteredFields.map(field => {
        const matchingDefault = field.id ? defaultById.get(field.id) : defaultByLabel.get(field.label);
        if (matchingDefault?.id) {
            seenDefaultIds.add(matchingDefault.id);
        }
        return matchingDefault ? { ...matchingDefault, ...field } : { ...field };
    });

    const missingDefaults = DEFAULT_PATIENT_FIELDS
        .filter(defaultField => defaultField.id && !seenDefaultIds.has(defaultField.id))
        .map(defaultField => ({ ...defaultField }));

    return [...normalizedFields, ...missingDefaults];
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

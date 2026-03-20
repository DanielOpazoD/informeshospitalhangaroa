import {
    DEFAULT_PATIENT_FIELDS,
    TEMPLATES,
    generateSectionId,
    getDefaultPatientFieldsByTemplate,
    getDefaultSectionsByTemplate,
} from '../constants';
import type { ClinicalRecord, ClinicalSectionData, PatientField } from '../types';

export const DEFAULT_TEMPLATE_ID = '2';
export const RECOMMENDED_GEMINI_MODEL = 'gemini-1.5-flash-latest';

export const normalizePatientFields = (fields: PatientField[]): PatientField[] => {
    const defaultById = new Map(DEFAULT_PATIENT_FIELDS.map(field => [field.id, field]));
    const defaultByLabel = new Map(DEFAULT_PATIENT_FIELDS.map(field => [field.label, field]));
    const seenDefaultIds = new Set<string>();

    const normalizedFields = fields.map(field => {
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
    const template = TEMPLATES[selectedTemplateId];
    return {
        version: 'v14',
        templateId: selectedTemplateId,
        title: template?.title || 'Registro Clínico',
        patientFields: getDefaultPatientFieldsByTemplate(selectedTemplateId),
        sections: getDefaultSectionsByTemplate(selectedTemplateId),
        medico: '',
        especialidad: '',
    };
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

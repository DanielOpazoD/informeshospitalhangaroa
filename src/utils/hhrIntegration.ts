import { DEFAULT_PATIENT_FIELDS } from '../constants';
import { FIELD_IDS } from '../appConstants';
import type { ClinicalRecord, ClinicalSectionData, PatientField } from '../types';
import type {
    HhrAuthenticatedUser,
    HhrCensusPatient,
    HhrClinicalDocumentAuditActor,
    HhrClinicalDocumentSaveResult,
    HhrClinicalDocumentVersionMeta,
    HhrClinicalSyncState,
} from '../hhrTypes';
import { calcEdadY } from './dateUtils';
import { parseHhrDailyRecordPayload } from './hhrPayloadValidators';

const CLINICAL_DOCUMENT_SCHEMA_VERSION = 2;
const HHR_CAMA_FIELD_ID = FIELD_IDS.cama;

type HhrDocumentType = ReturnType<typeof getTemplateDocumentType>;
type HhrSectionTemplate = {
    id: string;
    title: string;
    order: number;
};

const HHR_TEMPLATE_ID_BY_LOCAL_TEMPLATE: Record<string, HhrDocumentType> = {
    '1': 'informe_medico',
    '2': 'evolucion',
    '3': 'epicrisis',
    '4': 'epicrisis_traslado',
    '5': 'otro',
    '6': 'informe_medico',
    '7': 'informe_medico',
};

const HHR_SECTION_TEMPLATES: Record<HhrDocumentType, HhrSectionTemplate[]> = {
    epicrisis: [
        { id: 'antecedentes', title: 'Antecedentes', order: 0 },
        { id: 'historia-evolucion', title: 'Historia y evolución clínica', order: 1 },
        { id: 'examenes-complementarios', title: 'Exámenes complementarios', order: 2 },
        { id: 'diagnosticos', title: 'Diagnósticos de egreso', order: 3 },
        { id: 'plan', title: 'Indicaciones al alta', order: 4 },
    ],
    evolucion: [
        { id: 'antecedentes', title: 'Antecedentes', order: 0 },
        { id: 'historia-evolucion', title: 'Historia y evolución clínica', order: 1 },
        { id: 'plan', title: 'Plan', order: 2 },
    ],
    informe_medico: [
        { id: 'antecedentes', title: 'Antecedentes', order: 0 },
        { id: 'historia-evolucion', title: 'Historia y evolución clínica', order: 1 },
        { id: 'examenes-complementarios', title: 'Exámenes complementarios', order: 2 },
        { id: 'diagnosticos', title: 'Diagnósticos', order: 3 },
        { id: 'plan', title: 'Plan', order: 4 },
    ],
    epicrisis_traslado: [
        { id: 'antecedentes', title: 'Antecedentes', order: 0 },
        { id: 'historia-evolucion', title: 'Historia y evolución clínica', order: 1 },
        { id: 'examenes-complementarios', title: 'Exámenes complementarios', order: 2 },
        { id: 'diagnosticos', title: 'Diagnósticos', order: 3 },
        { id: 'plan', title: 'Plan', order: 4 },
    ],
    otro: [
        { id: 'contenido', title: 'Contenido', order: 0 },
    ],
};

const patientFieldDefaultsById = new Map(DEFAULT_PATIENT_FIELDS.map(field => [field.id, field]));

const normalizeString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const normalizeLookupKey = (value: string): string =>
    normalizeString(value)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .toLowerCase();

const createStableHash = (value: string): string => {
    let hash = 5381;
    for (let index = 0; index < value.length; index += 1) {
        hash = (hash * 33) ^ value.charCodeAt(index);
    }
    return `hhr-${(hash >>> 0).toString(16)}`;
};

const stripUndefinedDeep = <T,>(value: T): T => {
    if (Array.isArray(value)) {
        return value
            .map(item => stripUndefinedDeep(item))
            .filter(item => item !== undefined) as T;
    }

    if (value && typeof value === 'object') {
        return Object.fromEntries(
            Object.entries(value as Record<string, unknown>)
                .filter(([, nestedValue]) => nestedValue !== undefined)
                .map(([key, nestedValue]) => [key, stripUndefinedDeep(nestedValue)])
        ) as T;
    }

    return value;
};

const getTemplateDocumentType = (
    templateId: string
): 'epicrisis' | 'evolucion' | 'informe_medico' | 'epicrisis_traslado' | 'otro' => {
    switch (templateId) {
        case '2':
            return 'evolucion';
        case '3':
            return 'epicrisis';
        case '4':
            return 'epicrisis_traslado';
        case '1':
        case '6':
        case '7':
            return 'informe_medico';
        default:
            return 'otro';
    }
};

const clonePatientFields = (fields: PatientField[]): PatientField[] => fields.map(field => ({ ...field }));

const upsertPatientField = (
    fields: PatientField[],
    nextField: PatientField & { id: string }
): PatientField[] => {
    const nextFields = clonePatientFields(fields);
    const existingIndex = nextFields.findIndex(field => field.id === nextField.id);
    const defaultField = patientFieldDefaultsById.get(nextField.id);
    const fieldToPersist: PatientField = defaultField
        ? { ...defaultField, ...nextField, readonly: nextField.readonly ?? defaultField.readonly }
        : nextField;

    if (existingIndex >= 0) {
        nextFields[existingIndex] = {
            ...nextFields[existingIndex],
            ...fieldToPersist,
        };
        return nextFields;
    }

    nextFields.push(fieldToPersist);
    return nextFields;
};

export const getHhrTodayKey = (now: Date = new Date()): string => {
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const formatHhrDisplayDate = (value: string | null | undefined): string => {
    const normalizedValue = normalizeString(value);
    const match = normalizedValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) {
        return normalizedValue;
    }

    const [, year, month, day] = match;
    return `${day}-${month}-${year}`;
};

export const getClinicalRecordPatientFieldValue = (record: ClinicalRecord, fieldId: string): string =>
    normalizeString(record.patientFields.find(field => field.id === fieldId)?.value);

export const formatHhrRoleLabel = (role: string | null | undefined): string => {
    switch (role) {
        case 'admin':
            return 'Admin';
        case 'nurse_hospital':
            return 'Enfermería';
        case 'doctor_urgency':
            return 'Médico urgencia';
        case 'doctor_specialist':
            return 'Médico especialista';
        case 'viewer':
            return 'Solo lectura';
        case 'viewer_census':
            return 'Visor censo';
        case 'editor':
            return 'Editor';
        default:
            return role ? role : 'Sin rol';
    }
};

export const mapHospitalCensusPatients = (
    dailyRecordData: unknown,
    sourceDailyRecordDate: string
): HhrCensusPatient[] => {
    const { beds } = parseHhrDailyRecordPayload(dailyRecordData);

    return Object.entries(beds)
        .map(([bedId, patientValue]) => {
            const patientName = normalizeString(patientValue.patientName);
            const isBlocked = patientValue.isBlocked;
            if (!patientName || isBlocked) {
                return null;
            }

            const bedName = normalizeString(patientValue.bedName);
            return {
                bedId,
                bedLabel: bedName || bedId,
                patientName,
                rut: normalizeString(patientValue.rut),
                age: normalizeString(patientValue.age),
                birthDate: normalizeString(patientValue.birthDate),
                admissionDate: normalizeString(patientValue.admissionDate),
                specialty: normalizeString(patientValue.specialty),
                sourceDailyRecordDate,
            } satisfies HhrCensusPatient;
        })
        .filter((patient): patient is HhrCensusPatient => Boolean(patient))
        .sort((left, right) => left.bedId.localeCompare(right.bedId, 'es'));
};

export const applyHhrPatientToRecord = (
    record: ClinicalRecord,
    patient: HhrCensusPatient,
    todayKey: string = getHhrTodayKey()
): ClinicalRecord => {
    let nextFields = clonePatientFields(record.patientFields).filter(field => field.id !== HHR_CAMA_FIELD_ID);
    const reportDate = getClinicalRecordPatientFieldValue(record, FIELD_IDS.finf) || todayKey;
    const computedAge = patient.birthDate ? calcEdadY(patient.birthDate, reportDate) : '';

    nextFields = upsertPatientField(nextFields, {
        id: FIELD_IDS.nombre,
        label: 'Nombre',
        value: patient.patientName,
        type: 'text',
    });
    nextFields = upsertPatientField(nextFields, {
        id: FIELD_IDS.rut,
        label: 'Rut',
        value: patient.rut,
        type: 'text',
    });
    nextFields = upsertPatientField(nextFields, {
        id: FIELD_IDS.fecnac,
        label: 'Fecha de nacimiento',
        value: patient.birthDate,
        type: 'date',
    });
    nextFields = upsertPatientField(nextFields, {
        id: FIELD_IDS.fing,
        label: 'Fecha de ingreso',
        value: patient.admissionDate,
        type: 'date',
    });
    nextFields = upsertPatientField(nextFields, {
        id: FIELD_IDS.edad,
        label: 'Edad',
        value: computedAge || patient.age,
        type: 'text',
        readonly: true,
    });

    if (!getClinicalRecordPatientFieldValue(record, FIELD_IDS.finf)) {
        nextFields = upsertPatientField(nextFields, {
            id: FIELD_IDS.finf,
            label: 'Fecha del informe',
            value: todayKey,
            type: 'date',
        });
    }

    return {
        ...record,
        patientFields: nextFields,
    };
};

export const buildHhrClinicalEpisodeKey = (
    patientRut: string,
    admissionDate: string,
    fallbackDate: string
): string => {
    const normalizedRut = patientRut.trim();
    const normalizedDate = admissionDate.trim() || fallbackDate.trim();
    return `${normalizedRut}__${normalizedDate}`;
};

const buildAuditActor = (user: HhrAuthenticatedUser): HhrClinicalDocumentAuditActor => ({
    uid: user.uid,
    email: user.email,
    displayName: user.displayName || user.email,
    role: user.role || 'viewer',
});

const buildRenderedText = (
    title: string,
    patientFields: Array<{ label: string; value: string }>,
    sections: Array<{ title: string; content: string }>,
    medico: string,
    especialidad: string
): string =>
    [
        title,
        'Información del Paciente',
        patientFields.map(field => `${field.label}: ${field.value || '—'}`).join('\n'),
        sections
            .map(section => `${section.title}\n${section.content.replace(/<[^>]+>/g, '').trim() || 'Sin contenido registrado.'}`)
            .join('\n\n'),
        `Médico: ${medico || '—'}`,
        `Especialidad: ${especialidad || '—'}`,
    ]
        .filter(Boolean)
        .join('\n\n')
        .trim();

const createDocumentId = (): string =>
    typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.randomUUID === 'function'
        ? globalThis.crypto.randomUUID()
        : `hhr-document-${Date.now()}`;

const mapLocalTemplateIdToHhrTemplateId = (templateId: string): string =>
    HHR_TEMPLATE_ID_BY_LOCAL_TEMPLATE[templateId] || getTemplateDocumentType(templateId);

const getCanonicalSectionTemplate = (
    documentType: HhrDocumentType,
    section: { id?: string; title?: string }
): HhrSectionTemplate | null => {
    const templates = HHR_SECTION_TEMPLATES[documentType] || [];
    const byId = new Map(templates.map(template => [template.id, template]));
    const byTitle = new Map(templates.map(template => [normalizeLookupKey(template.title), template]));

    const normalizedId = normalizeString(section.id);
    if (normalizedId && byId.has(normalizedId)) {
        return byId.get(normalizedId) || null;
    }

    const normalizedTitle = normalizeLookupKey(section.title || '');
    if (normalizedTitle && byTitle.has(normalizedTitle)) {
        return byTitle.get(normalizedTitle) || null;
    }

    const legacyAliases: Record<string, string> = {
        [normalizeLookupKey('Diagnósticos')]: 'diagnosticos',
        [normalizeLookupKey('Diagnosticos')]: 'diagnosticos',
        [normalizeLookupKey('Diagnósticos de egreso')]: 'diagnosticos',
        [normalizeLookupKey('Diagnosticos de egreso')]: 'diagnosticos',
        [normalizeLookupKey('Plan')]: 'plan',
        [normalizeLookupKey('Indicaciones al alta')]: 'plan',
        [normalizeLookupKey('Historia y evolución clínica')]: 'historia-evolucion',
        [normalizeLookupKey('Historia y evolucion clinica')]: 'historia-evolucion',
        [normalizeLookupKey('Exámenes complementarios')]: 'examenes-complementarios',
        [normalizeLookupKey('Examenes complementarios')]: 'examenes-complementarios',
        [normalizeLookupKey('Contenido')]: 'contenido',
    };

    const aliasId = legacyAliases[normalizedTitle];
    return aliasId ? byId.get(aliasId) || null : null;
};

const preferSection = <
    TSection extends {
        content?: string;
        updateDate?: string;
        updateTime?: string;
    },
>(
    current: TSection,
    candidate: TSection
): TSection => {
    const currentContentLength = normalizeString(current.content).length;
    const candidateContentLength = normalizeString(candidate.content).length;
    if (candidateContentLength > currentContentLength) {
        return candidate;
    }

    if (candidateContentLength === currentContentLength) {
        const currentHasClinicalMeta = Boolean(current.updateDate || current.updateTime);
        const candidateHasClinicalMeta = Boolean(candidate.updateDate || candidate.updateTime);
        if (candidateHasClinicalMeta && !currentHasClinicalMeta) {
            return candidate;
        }
    }

    return current;
};

const normalizeSectionsForHhrDocument = (
    documentType: HhrDocumentType,
    sections: ClinicalRecord['sections']
): Array<{
    id: string;
    title: string;
    content: string;
    kind: ClinicalSectionData['kind'];
    updateDate: string | undefined;
    updateTime: string | undefined;
    order: number;
    visible: true;
}> => {
    const normalizedSections = sections.map((section, index) => {
        const canonical = getCanonicalSectionTemplate(documentType, section);
        return {
            id: canonical?.id || section.id || `section-${index + 1}`,
            title: canonical?.title || section.title,
            content: section.content,
            kind: section.kind,
            updateDate: section.updateDate,
            updateTime: section.updateTime,
            order: canonical?.order ?? index,
            visible: true as const,
        };
    });

    const deduplicated = normalizedSections.reduce<typeof normalizedSections>((accumulator, section) => {
        const existingIndex = accumulator.findIndex(existingSection => existingSection.id === section.id);
        if (existingIndex === -1) {
            accumulator.push(section);
            return accumulator;
        }

        accumulator[existingIndex] = preferSection(accumulator[existingIndex], section);
        return accumulator;
    }, []);

    return deduplicated
        .sort((left, right) => {
            if (left.order !== right.order) {
                return left.order - right.order;
            }

            return left.title.localeCompare(right.title, 'es');
        })
        .map((section, index) => ({
            ...section,
            order: index + 1,
        }));
};

export const buildHhrClinicalDocumentSave = ({
    record,
    actor,
    hospitalId,
    sourcePatient,
    syncState,
    now = new Date(),
}: {
    record: ClinicalRecord;
    actor: HhrAuthenticatedUser;
    hospitalId: string;
    sourcePatient: HhrCensusPatient | null;
    syncState: HhrClinicalSyncState | null;
    now?: Date;
}): { documentId: string; payload: Record<string, unknown>; result: HhrClinicalDocumentSaveResult } => {
    const patientRut = getClinicalRecordPatientFieldValue(record, FIELD_IDS.rut);
    const patientName = getClinicalRecordPatientFieldValue(record, FIELD_IDS.nombre);
    const normalizedPatientName = patientName.trim().toLowerCase();
    const matchedSourcePatient = sourcePatient
        && (
            (sourcePatient.rut && sourcePatient.rut === patientRut)
            || sourcePatient.patientName.trim().toLowerCase() === normalizedPatientName
        )
        ? sourcePatient
        : null;
    const admissionDate =
        getClinicalRecordPatientFieldValue(record, FIELD_IDS.fing) || matchedSourcePatient?.admissionDate || '';
    const sourceDailyRecordDate = matchedSourcePatient?.sourceDailyRecordDate || getHhrTodayKey(now);

    if (!patientRut || !patientName) {
        throw new Error('Debes completar al menos nombre y RUT antes de guardar en HHR.');
    }

    const episodeKey = buildHhrClinicalEpisodeKey(patientRut, admissionDate, sourceDailyRecordDate);
    const shouldReuseRemoteDraft = syncState?.episodeKey === episodeKey;
    const documentId = shouldReuseRemoteDraft ? syncState.documentId : createDocumentId();
    const savedAt = now.toISOString();
    const auditActor = buildAuditActor(actor);
    const currentVersion = shouldReuseRemoteDraft ? syncState.currentVersion + 1 : 1;
    const versionHistory: HhrClinicalDocumentVersionMeta[] = shouldReuseRemoteDraft
        ? [...syncState.versionHistory, { version: currentVersion, savedAt, savedBy: auditActor, reason: 'manual' }]
        : [{ version: 1, savedAt, savedBy: auditActor, reason: 'manual' }];
    const documentType = getTemplateDocumentType(record.templateId);
    const hhrTemplateId = mapLocalTemplateIdToHhrTemplateId(record.templateId);

    const patientFields = record.patientFields.map((field, index) => ({
        id: field.id || `field-${index + 1}`,
        label: field.label,
        value: field.value,
        type: field.type,
        placeholder: field.placeholder,
        readonly: field.readonly,
        visible: true,
    }));

    const sections = normalizeSectionsForHhrDocument(documentType, record.sections);

    const renderedText = buildRenderedText(
        record.title,
        patientFields,
        sections,
        record.medico,
        record.especialidad
    );

    const payload = stripUndefinedDeep({
        id: documentId,
        schemaVersion: CLINICAL_DOCUMENT_SCHEMA_VERSION,
        hospitalId,
        documentType,
        templateId: hhrTemplateId,
        templateVersion: 1,
        title: record.title || 'Documento clínico',
        patientInfoTitle: 'Información del Paciente',
        footerMedicoLabel: 'Médico',
        footerEspecialidadLabel: 'Especialidad',
        patientRut,
        patientName,
        episodeKey,
        admissionDate: admissionDate || undefined,
        sourceDailyRecordDate,
        sourceBedId: matchedSourcePatient?.bedId || undefined,
        patientFields,
        sections,
        medico: record.medico,
        especialidad: record.especialidad,
        status: 'draft',
        isLocked: false,
        isActiveEpisodeDocument: true,
        currentVersion,
        versionHistory,
        audit: {
            createdAt: shouldReuseRemoteDraft ? syncState.createdAt : savedAt,
            createdBy: shouldReuseRemoteDraft ? versionHistory[0]?.savedBy || auditActor : auditActor,
            updatedAt: savedAt,
            updatedBy: auditActor,
        },
        renderedText,
        integrityHash: createStableHash(renderedText),
    }) satisfies Record<string, unknown>;

    return {
        documentId,
        payload,
        result: {
            documentId,
            episodeKey,
            savedAt,
            syncState: {
                documentId,
                episodeKey,
                currentVersion,
                createdAt: shouldReuseRemoteDraft ? syncState.createdAt : savedAt,
                versionHistory,
            },
        },
    };
};

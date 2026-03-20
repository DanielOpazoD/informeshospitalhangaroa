import {
    ControlInfo,
    DosageForm,
    Frequency,
    Injectable,
    InjectableSchedule,
    Inhaler,
    Medication,
    MedicationCategory,
    Patient,
} from './types';

export type MedicationInput = Omit<Medication, 'id' | 'order'>;

export const initialControlInfo: ControlInfo = {
    applies: 'no',
    date: '',
    time: '',
    professional: '',
    withExams: 'unspecified',
    exams: {
        sangre: false,
        orina: false,
        ecg: false,
        endoscopia: false,
        colonoscopia: false,
        otros: false,
    },
    otrosText: '',
    note: '',
    suspendEnabled: false,
    suspendText: '',
    freeNoteEnabled: false,
    freeNoteText: '',
};

export const medicationCategoryOrder = [
    MedicationCategory.CARDIOVASCULAR,
    MedicationCategory.DIABETES,
    MedicationCategory.OTHER,
];

export const medicationCategoryLabels: Record<MedicationCategory, string> = {
    [MedicationCategory.CARDIOVASCULAR]: 'Cardiovascular',
    [MedicationCategory.DIABETES]: 'Diabetes',
    [MedicationCategory.OTHER]: 'Otros',
};

export const normalizeMedications = (medications: Medication[]): Medication[] => {
    const normalized = medications.map((medication, index) => ({
        ...medication,
        category: (() => {
            const incomingCategory = (medication as Medication & { category?: string }).category as string | undefined;
            if (incomingCategory === 'insulinas_glp1') {
                return MedicationCategory.DIABETES;
            }
            return incomingCategory && Object.values(MedicationCategory).includes(incomingCategory as MedicationCategory)
                ? incomingCategory as MedicationCategory
                : MedicationCategory.OTHER;
        })(),
        order: typeof medication.order === 'number' ? medication.order : index,
    }));

    const orderedByCategory = medicationCategoryOrder.flatMap(category => {
        const medsInCategory = normalized
            .filter(medication => medication.category === category)
            .sort((a, b) => a.order - b.order);
        return medsInCategory.map((medication, index) => ({ ...medication, order: index }));
    });

    const leftovers = normalized.filter(medication => !medicationCategoryOrder.includes(medication.category));
    return [...orderedByCategory, ...leftovers];
};

export const describeMedicationDose = (medication: Medication): string => {
    const description = medication.dosageForm === DosageForm.OTHER
        ? medication.otherDosageForm
        : medication.dosageForm === DosageForm.NONE
            ? ''
            : medication.dosageForm;

    return `${medication.dose}${description ? ` ${description}` : ''} - ${medication.frequency}`;
};

const sanitizeFileNameComponent = (value: string, fallback: string): string => {
    const raw = value?.trim() || fallback;
    const cleaned = raw.replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, ' ').trim();
    return cleaned || fallback;
};

export const buildExportBaseName = (patient: Patient, fallbackDate: string): string => {
    const namePart = sanitizeFileNameComponent(patient.name, 'Paciente');
    const datePart = sanitizeFileNameComponent(patient.date, fallbackDate);
    return `Lista de fármacos - ${namePart} - ${datePart}`;
};

export const createEmptyPatient = (today: string): Patient => ({ name: '', rut: '', date: today });

export const testPatientData: { patient: Patient; medications: Medication[]; injectables: Injectable[]; inhalers: Inhaler[] } = {
    patient: {
        name: 'Juanito Perez',
        rut: '17.752.753-K',
        date: '2025-11-16',
    },
    medications: [
        {
            name: 'Metformina',
            presentacion: '1000 mg',
            dose: '1',
            frequency: Frequency.EVERY_12H,
            dosageForm: DosageForm.TABLET,
            otherDosageForm: '',
            notes: '',
            isNewMedication: false,
            doseIncreased: false,
            doseDecreased: false,
            requiresPurchase: false,
            category: MedicationCategory.DIABETES,
            id: 1763260676706,
            order: 0,
        },
        {
            name: 'Losartan ',
            presentacion: '50 mg',
            dose: '1',
            frequency: Frequency.EVERY_12H,
            dosageForm: DosageForm.TABLET,
            otherDosageForm: '',
            notes: '',
            isNewMedication: false,
            doseIncreased: false,
            doseDecreased: false,
            requiresPurchase: false,
            category: MedicationCategory.CARDIOVASCULAR,
            id: 1763260685881,
            order: 0,
        },
        {
            name: 'Aspirina',
            presentacion: '100 mg',
            dose: '1',
            frequency: Frequency.EVERY_24H,
            dosageForm: DosageForm.TABLET,
            otherDosageForm: '',
            notes: '',
            isNewMedication: false,
            doseIncreased: false,
            doseDecreased: false,
            requiresPurchase: false,
            category: MedicationCategory.CARDIOVASCULAR,
            id: 1763260713400,
            order: 2,
        },
        {
            name: 'Atorvastatina',
            presentacion: '20 mg',
            dose: '1',
            frequency: Frequency.EVERY_24H_NIGHT,
            dosageForm: DosageForm.TABLET,
            otherDosageForm: '',
            notes: '',
            isNewMedication: false,
            doseIncreased: false,
            doseDecreased: false,
            requiresPurchase: false,
            category: MedicationCategory.CARDIOVASCULAR,
            id: 1763260719664,
            order: 3,
        },
        {
            name: 'Pregabalina',
            presentacion: '75 mg',
            dose: '1',
            frequency: Frequency.EVERY_24H_NIGHT,
            dosageForm: DosageForm.TABLET,
            otherDosageForm: '',
            notes: '',
            isNewMedication: false,
            doseIncreased: false,
            doseDecreased: false,
            requiresPurchase: false,
            category: MedicationCategory.OTHER,
            id: 1763260734184,
            order: 0,
        },
        {
            name: 'Bisoprolol ',
            presentacion: '2.5 mg',
            dose: '1',
            frequency: Frequency.EVERY_24H,
            dosageForm: DosageForm.TABLET,
            otherDosageForm: '',
            notes: '',
            isNewMedication: false,
            doseIncreased: false,
            doseDecreased: false,
            requiresPurchase: false,
            category: MedicationCategory.CARDIOVASCULAR,
            id: 1763260805200,
            order: 1,
        },
    ],
    injectables: [
        {
            type: 'Insulina NPH',
            dose: '6 U',
            schedule: InjectableSchedule.MAÑANA,
            time: '08:00',
            notes: '',
            isNewMedication: false,
            doseIncreased: false,
            doseDecreased: false,
            requiresPurchase: false,
            id: 1763260662497,
        },
    ],
    inhalers: [
        {
            name: 'Salmeterol',
            presentacion: '25 mcg ',
            dose: 2,
            frequencyHours: 12,
            notes: '',
            isNewMedication: false,
            doseIncreased: false,
            doseDecreased: false,
            requiresPurchase: false,
            id: 1763260746537,
        },
    ],
};

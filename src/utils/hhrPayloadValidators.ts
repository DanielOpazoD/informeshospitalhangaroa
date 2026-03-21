export interface HhrBedPatientPayload {
    patientName: string;
    isBlocked: boolean;
    bedName: string;
    rut: string;
    age: string;
    birthDate: string;
    admissionDate: string;
    specialty: string;
}

export interface HhrDailyRecordPayload {
    beds: Record<string, HhrBedPatientPayload>;
}

const asRecord = (value: unknown): Record<string, unknown> =>
    value && typeof value === 'object' ? (value as Record<string, unknown>) : {};

const asString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

export const parseHhrDailyRecordPayload = (value: unknown): HhrDailyRecordPayload => {
    const raw = asRecord(value);
    const rawBeds = asRecord(raw.beds);

    return {
        beds: Object.fromEntries(
            Object.entries(rawBeds).map(([bedId, patientValue]) => {
                const patient = asRecord(patientValue);
                return [bedId, {
                    patientName: asString(patient.patientName),
                    isBlocked: Boolean(patient.isBlocked),
                    bedName: asString(patient.bedName),
                    rut: asString(patient.rut),
                    age: asString(patient.age),
                    birthDate: asString(patient.birthDate),
                    admissionDate: asString(patient.admissionDate),
                    specialty: asString(patient.specialty),
                } satisfies HhrBedPatientPayload];
            }),
        ),
    };
};

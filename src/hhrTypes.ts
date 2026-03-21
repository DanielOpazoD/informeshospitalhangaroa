export type HhrUserRole =
    | 'admin'
    | 'nurse_hospital'
    | 'doctor_urgency'
    | 'doctor_specialist'
    | 'viewer'
    | 'viewer_census'
    | 'editor'
    | string;

export interface HhrAuthenticatedUser {
    uid: string;
    email: string;
    displayName: string;
    photoURL: string;
    role: HhrUserRole | null;
}

export interface HhrCensusPatient {
    bedId: string;
    bedLabel: string;
    patientName: string;
    rut: string;
    age: string;
    birthDate: string;
    admissionDate: string;
    specialty: string;
    sourceDailyRecordDate: string;
}

export interface HhrClinicalDocumentAuditActor {
    uid: string;
    email: string;
    displayName: string;
    role: string;
}

export interface HhrClinicalDocumentVersionMeta {
    version: number;
    savedAt: string;
    savedBy: HhrClinicalDocumentAuditActor;
    reason: 'manual';
}

export interface HhrClinicalSyncState {
    documentId: string;
    episodeKey: string;
    currentVersion: number;
    createdAt: string;
    versionHistory: HhrClinicalDocumentVersionMeta[];
}

export interface HhrClinicalDocumentSaveResult {
    documentId: string;
    episodeKey: string;
    savedAt: string;
    syncState: HhrClinicalSyncState;
}

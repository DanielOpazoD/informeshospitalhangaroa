// ── Shared utility types ────────────────────────────

/** Callback para mostrar notificaciones toast en la UI */
export type ToastFn = (message: string, type?: 'success' | 'warning' | 'error') => void;

// ── Patient types ───────────────────────────────────

export interface PatientField {
    id?: string;
    label: string;
    value: string;
    type: 'text' | 'date' | 'number' | 'time';
    placeholder?: string;
    readonly?: boolean;
    isCustom?: boolean;
}

export type ClinicalSectionKind = 'standard' | 'clinical-update';

export interface ClinicalSectionData {
    /** Stable unique ID for React key reconciliation */
    id: string;
    title: string;
    content: string;
    kind?: ClinicalSectionKind;
    updateDate?: string;
    updateTime?: string;
}

export interface ClinicalRecord {
    version: string;
    templateId: string;
    title: string;
    titleMode?: 'auto' | 'custom';
    patientFields: PatientField[];
    sections: ClinicalSectionData[];
    medico: string;
    especialidad: string;
}

export interface Template {
    id: string;
    name: string;
    title: string;
}

export interface GoogleUserProfile {
    name: string;
    email: string;
    picture: string;
}

export interface DriveFolder {
    id: string;
    name: string;
    modifiedTime?: string;
    mimeType?: string;
}

export type DriveSearchMode = 'metadata' | 'deepContent';

export interface DriveSearchResult {
    files: DriveFolder[];
    partial: boolean;
    warnings: string[];
}

export interface AppError {
    source: 'drive' | 'auth' | 'hhr' | 'import';
    code: string;
    message: string;
    retryable: boolean;
}

export type AppResult<T> =
    | { ok: true; data: T; warnings?: string[] }
    | { ok: false; error: AppError };

export interface FavoriteFolderEntry {
    id: string;
    path: DriveFolder[];
    name: string;
}

export interface RecentDriveFile {
    id: string;
    name: string;
    openedAt: number;
}

export interface VersionHistoryEntry {
    id: string;
    timestamp: number;
    record: ClinicalRecord;
}

export type EditorWorkflowStatus =
    | 'idle'
    | 'dirty'
    | 'saving'
    | 'restoring'
    | 'importing'
    | 'searching_drive'
    | 'syncing_hhr'
    | 'error';

export interface EditorWorkflowState {
    status: EditorWorkflowStatus;
    hasUnsavedChanges: boolean;
    lastError: string | null;
}

// ── Google API types ────────────────────────────────

export interface GoogleTokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
    scope: string;
    id_token?: string;
    error?: string;
}

export interface GoogleTokenClient {
    requestAccessToken: (options?: { prompt?: string }) => void;
    callback?: (response: GoogleTokenResponse) => void;
}

export interface GooglePickerDocument {
    id: string;
    name: string;
    mimeType: string;
    url?: string;
}

export interface GooglePickerData {
    action: string;
    docs?: GooglePickerDocument[];
    [key: string]: unknown;
}

export interface GoogleDriveFileResource {
    id: string;
    name: string;
    mimeType?: string;
    modifiedTime?: string;
    parents?: string[];
}

export type SaveFormat = 'json' | 'pdf' | 'both';

export interface SaveOptions {
    record: ClinicalRecord;
    baseFileName: string;
    format: SaveFormat;
    generatePdf: () => Promise<Blob>;
}

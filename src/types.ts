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
    operation: string;
    message: string;
    transient: boolean;
    retryable: boolean;
    httpStatus?: number;
    details?: string[];
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

export type ClinicalRecordCommandType =
    | 'edit_patient_field'
    | 'edit_patient_label'
    | 'edit_section_content'
    | 'edit_section_title'
    | 'update_section_meta'
    | 'add_section'
    | 'remove_section'
    | 'add_patient_field'
    | 'remove_patient_field'
    | 'change_template'
    | 'change_record_title'
    | 'edit_professional_field'
    | 'reset_record'
    | 'apply_hhr_patient'
    | 'replace_record_from_import'
    | 'replace_record_from_history'
    | 'save_manual'
    | 'save_auto'
    | 'save_import'
    | 'restore_history'
    | 'bootstrap_restore';

export type ClinicalRecordCommandCategory =
    | 'document_edit'
    | 'document_structure'
    | 'document_replace'
    | 'external_sync'
    | 'persistence';

export type EditorEffect =
    | { type: 'reset_hhr_sync'; priority?: number }
    | { type: 'show_warning'; message: string; dedupeKey?: string; priority?: number }
    | { type: 'show_toast'; message: string; tone: 'success' | 'warning' | 'error'; dedupeKey?: string; priority?: number }
    | { type: 'close_modal'; modal: 'open' | 'history' | 'save' | 'hhr_census'; priority?: number }
    | { type: 'request_focus'; target: 'record-title' | 'history' | 'patient' | 'section'; priority?: number }
    | { type: 'request_confirmation'; confirmationId: string; title: string; message: string; confirmLabel: string; cancelLabel: string; tone: 'warning' | 'danger' | 'info'; priority?: number }
    | { type: 'log_audit_event'; event: string; details?: string; priority?: number };

export interface HistoryEntryMetadata {
    commandType: ClinicalRecordCommandType;
    commandCategory: ClinicalRecordCommandCategory;
    changed: boolean;
    summary: string;
    groupKey?: string;
}

export interface VersionHistoryEntry {
    id: string;
    timestamp: number;
    record: ClinicalRecord;
    metadata?: HistoryEntryMetadata;
}

export interface HistoryStacks {
    past: VersionHistoryEntry[];
    present: VersionHistoryEntry | null;
    future: VersionHistoryEntry[];
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

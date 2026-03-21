export const AUTO_SAVE_INTERVAL = 30000;
export const AUTO_SAVE_IDLE_DELAY = 3000;
export const MAX_HISTORY_ENTRIES = 5;
export const MAX_RECENT_FILES = 5;
export const SEARCH_CACHE_TTL = 5 * 60 * 1000; // 5 minutos
export const DRIVE_CONTENT_FETCH_CONCURRENCY = 4;
export const DRIVE_DEEP_SEARCH_MAX_FILES = 25;
export const DRIVE_DEEP_SEARCH_TIME_BUDGET_MS = 3000;

export const DEFAULT_GOOGLE_CLIENT_ID = '962184902543-f8jujg3re8sa6522en75soum5n4dajcj.apps.googleusercontent.com';

export const LOCAL_STORAGE_KEYS = Object.freeze({
    draft: 'hhr-local-draft',
    history: 'hhr-version-history',
    favorites: 'hhr-drive-favorites',
    recent: 'hhr-drive-recents',
    defaultDriveFolderId: 'defaultDriveFolderId',
    defaultDriveFolderPath: 'defaultDriveFolderPath',
    googleApiKey: 'googleApiKey',
    googleClientId: 'googleClientId',
    geminiApiKey: 'geminiApiKey',
    geminiProjectId: 'geminiProjectId',
    geminiModel: 'geminiModel',
} as const);

/** Canonical patient field IDs — prevent typos and enable IDE autocomplete */
export const FIELD_IDS = Object.freeze({
    nombre: 'nombre',
    rut: 'rut',
    edad: 'edad',
    fecnac: 'fecnac',
    fing: 'fing',
    finf: 'finf',
    hinf: 'hinf',
    cama: 'cama',
} as const);

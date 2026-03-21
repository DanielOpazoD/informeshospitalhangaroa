import {
    DRIVE_CONTENT_FETCH_CONCURRENCY,
    DRIVE_DEEP_SEARCH_MAX_FILES,
    DRIVE_DEEP_SEARCH_TIME_BUDGET_MS,
    GATEWAY_RETRY_ATTEMPTS,
    GATEWAY_TIMEOUT_MS,
} from '../../appConstants';
import type {
    AppResult,
    DriveFolder,
    DriveSearchMode,
    DriveSearchResult,
    SaveOptions,
} from '../../types';
import {
    createDriveGateway as createLegacyDriveGateway,
    type DriveGateway as LegacyDriveGateway,
    type DriveSearchFilters,
} from '../../services/driveGateway';
import { runWithResilience } from '../shared/resilience';

export interface DriveSearchRequest extends DriveSearchFilters {
    contentTerm: string;
}

export interface DriveSearchOptions {
    cancelToken?: { cancelled: boolean };
    onProgress?: (status: string) => void;
}

export interface DriveGateway {
    getAccessToken: () => string | null;
    listFolders: (folderId: string) => Promise<AppResult<DriveFolder[]>>;
    listFolderContents: (folderId: string) => Promise<AppResult<{ folders: DriveFolder[]; files: DriveFolder[] }>>;
    readJsonRecord: (fileId: string) => Promise<AppResult<unknown>>;
    createFolder: (name: string, parentId: string) => Promise<AppResult<void>>;
    uploadFile: (params: Parameters<LegacyDriveGateway['uploadFile']>[0]) => Promise<AppResult<{ id?: string; name?: string }>>;
    search: (
        request: DriveSearchRequest,
        mode: DriveSearchMode,
        options?: DriveSearchOptions,
    ) => Promise<AppResult<DriveSearchResult>>;
}

const toAppError = (
    source: 'drive',
    error: unknown,
    fallbackMessage: string,
    operation: string,
    code = 'unknown',
    retryable = true,
): AppResult<never> => ({
    ok: false,
    error: {
        source,
        code,
        operation,
        message: error instanceof Error ? error.message : fallbackMessage,
        transient: retryable,
        retryable,
        httpStatus: typeof (error as { status?: unknown })?.status === 'number' ? (error as { status: number }).status : undefined,
        details: [fallbackMessage],
    },
});

const isRetryableDriveError = (error: unknown): boolean => {
    const message = error instanceof Error ? error.message.toLowerCase() : '';
    return !message.includes('quota exceeded') && !message.includes('permission') && !message.includes('403');
};

const logGatewayEvent = (label: string) => (event: { type: string; attempt: number; error?: string }) => {
    const suffix = event.error ? ` (${event.error})` : '';
    console.warn(`[drive-gateway] ${label} :: ${event.type} intento ${event.attempt}${suffix}`);
};

const runDeepContentSearch = async (
    gateway: LegacyDriveGateway,
    files: DriveFolder[],
    contentTerm: string,
    options?: DriveSearchOptions,
): Promise<DriveSearchResult> => {
    if (!contentTerm.trim()) {
        return {
            files,
            partial: false,
            warnings: ['La búsqueda profunda requiere un término de contenido; se usó solo metadata.'],
        };
    }

    const warnings = new Set<string>();
    const filtered: DriveFolder[] = [];
    const candidates = files.slice(0, DRIVE_DEEP_SEARCH_MAX_FILES);
    const queue = [...candidates];
    const startedAt = Date.now();
    let partial = files.length > DRIVE_DEEP_SEARCH_MAX_FILES;
    let processed = 0;

    if (partial) {
        warnings.add(`La búsqueda profunda se limitó a ${DRIVE_DEEP_SEARCH_MAX_FILES} archivos para mantener la respuesta ágil.`);
    }

    const workerCount = Math.min(DRIVE_CONTENT_FETCH_CONCURRENCY, queue.length) || 1;
    options?.onProgress?.(`Analizando 0 de ${candidates.length} archivos...`);

    const workers = Array.from({ length: workerCount }, () => (async () => {
        while (queue.length) {
            if (options?.cancelToken?.cancelled) {
                partial = true;
                warnings.add('La búsqueda profunda fue cancelada antes de completar todos los archivos.');
                return;
            }

            if (Date.now() - startedAt >= DRIVE_DEEP_SEARCH_TIME_BUDGET_MS) {
                partial = true;
                warnings.add('La búsqueda profunda alcanzó su presupuesto de tiempo y devolvió resultados parciales.');
                return;
            }

            const nextFile = queue.shift();
            if (!nextFile) return;

            try {
                const content = await gateway.getFileContent(nextFile.id);
                if (content.toLowerCase().includes(contentTerm.trim().toLowerCase())) {
                    filtered.push(nextFile);
                }
            } catch {
                warnings.add(`No se pudo inspeccionar el contenido de "${nextFile.name}".`);
            } finally {
                processed += 1;
                options?.onProgress?.(`Analizando ${processed} de ${candidates.length} archivos...`);
            }
        }
    })());

    await Promise.all(workers);

    return {
        files: filtered,
        partial,
        warnings: Array.from(warnings),
    };
};

export const createDriveGateway = (): DriveGateway => {
    const legacyGateway = createLegacyDriveGateway();

    return {
        getAccessToken: legacyGateway.getAccessToken,
        listFolders: async (folderId) => {
            try {
                return {
                    ok: true,
                    data: await runWithResilience(
                        () => legacyGateway.listFolders(folderId),
                        {
                            attempts: GATEWAY_RETRY_ATTEMPTS,
                            timeoutMs: GATEWAY_TIMEOUT_MS,
                            label: 'Listado de carpetas de Drive',
                            shouldRetry: isRetryableDriveError,
                            onEvent: logGatewayEvent('list_folders'),
                        },
                    ),
                };
            } catch (error) {
                return toAppError('drive', error, 'No se pudieron listar las carpetas.', 'list_folders', 'list_folders', isRetryableDriveError(error));
            }
        },
        listFolderContents: async (folderId) => {
            try {
                return {
                    ok: true,
                    data: await runWithResilience(
                        () => legacyGateway.listFolderContents(folderId),
                        {
                            attempts: GATEWAY_RETRY_ATTEMPTS,
                            timeoutMs: GATEWAY_TIMEOUT_MS,
                            label: 'Contenido de carpeta de Drive',
                            shouldRetry: isRetryableDriveError,
                            onEvent: logGatewayEvent('list_contents'),
                        },
                    ),
                };
            } catch (error) {
                return toAppError('drive', error, 'No se pudo listar el contenido de la carpeta.', 'list_contents', 'list_contents', isRetryableDriveError(error));
            }
        },
        readJsonRecord: async (fileId) => {
            try {
                return {
                    ok: true,
                    data: await runWithResilience(
                        () => legacyGateway.getJsonRecord(fileId),
                        {
                            attempts: GATEWAY_RETRY_ATTEMPTS,
                            timeoutMs: GATEWAY_TIMEOUT_MS,
                            label: 'Lectura de JSON desde Drive',
                            shouldRetry: isRetryableDriveError,
                            onEvent: logGatewayEvent('read_json'),
                        },
                    ),
                };
            } catch (error) {
                return toAppError('drive', error, 'No se pudo leer el archivo JSON desde Drive.', 'read_json', 'read_json', isRetryableDriveError(error));
            }
        },
        createFolder: async (name, parentId) => {
            try {
                await runWithResilience(
                    () => legacyGateway.createFolder(name, parentId),
                    {
                        attempts: GATEWAY_RETRY_ATTEMPTS,
                        timeoutMs: GATEWAY_TIMEOUT_MS,
                        label: 'Creación de carpeta en Drive',
                        shouldRetry: isRetryableDriveError,
                        onEvent: logGatewayEvent('create_folder'),
                    },
                );
                return { ok: true, data: undefined };
            } catch (error) {
                return toAppError('drive', error, 'No se pudo crear la carpeta.', 'create_folder', 'create_folder', isRetryableDriveError(error));
            }
        },
        uploadFile: async (params) => {
            try {
                return {
                    ok: true,
                    data: await runWithResilience(
                        () => legacyGateway.uploadFile(params),
                        {
                            attempts: GATEWAY_RETRY_ATTEMPTS,
                            timeoutMs: GATEWAY_TIMEOUT_MS,
                            label: 'Subida de archivo a Drive',
                            shouldRetry: isRetryableDriveError,
                            onEvent: logGatewayEvent('upload_file'),
                        },
                    ),
                };
            } catch (error) {
                return toAppError('drive', error, 'No se pudo subir el archivo a Drive.', 'upload_file', 'upload_file', isRetryableDriveError(error));
            }
        },
        search: async (request, mode, options) => {
            try {
                const metadataFiles = await runWithResilience(
                    () => legacyGateway.searchJsonFiles({
                        searchTerm: request.searchTerm.trim(),
                        dateFrom: request.dateFrom,
                        dateTo: request.dateTo,
                    }),
                    {
                        attempts: GATEWAY_RETRY_ATTEMPTS,
                        timeoutMs: GATEWAY_TIMEOUT_MS,
                        label: 'Búsqueda de archivos en Drive',
                        shouldRetry: isRetryableDriveError,
                        onEvent: logGatewayEvent('search'),
                    },
                );
                const result = mode === 'deepContent'
                    ? await runDeepContentSearch(legacyGateway, metadataFiles, request.contentTerm, options)
                    : {
                        files: metadataFiles,
                        partial: false,
                        warnings: request.contentTerm.trim()
                            ? ['El término de contenido solo se usa en la búsqueda profunda.']
                            : [],
                    };
                return {
                    ok: true,
                    data: result,
                    warnings: result.warnings,
                };
            } catch (error) {
                return toAppError('drive', error, 'No se pudo completar la búsqueda en Drive.', 'search', 'search', isRetryableDriveError(error));
            }
        },
    };
};

export const buildDriveSaveOptions = (record: SaveOptions['record'], baseFileName: string, format: SaveOptions['format'], generatePdf: SaveOptions['generatePdf']): SaveOptions => ({
    record,
    baseFileName,
    format,
    generatePdf,
});

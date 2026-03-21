import {
    useState,
    useCallback,
    useRef,
    type Dispatch,
    type MutableRefObject,
    type SetStateAction,
} from 'react';
import type { AppResult, AsyncJobState, DriveFolder, DriveSearchMode, DriveSearchResult, ToastFn } from '../types';
import { SEARCH_CACHE_TTL } from '../appConstants';
import {
    DRIVE_CONTENT_FETCH_CONCURRENCY,
    DRIVE_DEEP_SEARCH_MAX_FILES,
    DRIVE_DEEP_SEARCH_TIME_BUDGET_MS,
} from '../appConstants';
import { buildDriveContextErrorMessage } from '../utils/driveErrorUtils';

interface DriveCacheEntry {
    folders: DriveFolder[];
    files: DriveFolder[];
    timestamp: number;
}

interface UseDriveSearchProps {
    setIsDriveLoading: (loading: boolean) => void;
    setDriveFolders: (folders: DriveFolder[]) => void;
    setDriveJsonFiles: (files: DriveFolder[]) => void;
    setFolderPath: Dispatch<SetStateAction<DriveFolder[]>>;
    showToast: ToastFn;
    driveCacheRef: MutableRefObject<Map<string, DriveCacheEntry>>;
    fetchFolderContents: (folderId: string) => Promise<void>;
    driveGateway: CompatibleDriveGateway;
}

interface CompatibleDriveGateway {
    getAccessToken?: () => string | null;
    listFolders?: (folderId: string) => Promise<DriveFolder[] | AppResult<DriveFolder[]>>;
    listJsonFiles?: (folderId: string) => Promise<DriveFolder[]>;
    listFolderContents?: (folderId: string) => Promise<{ folders: DriveFolder[]; files: DriveFolder[] } | AppResult<{ folders: DriveFolder[]; files: DriveFolder[] }>>;
    search?: (
        request: { searchTerm: string; dateFrom: string; dateTo: string; contentTerm: string },
        mode: DriveSearchMode,
        options?: { cancelToken?: { cancelled: boolean }; onProgress?: (status: string) => void },
    ) => Promise<AppResult<DriveSearchResult>>;
    searchJsonFiles?: (filters: { searchTerm: string; dateFrom: string; dateTo: string }) => Promise<DriveFolder[]>;
    getFileContent?: (fileId: string) => Promise<string>;
    getJsonRecord?: (fileId: string) => Promise<unknown>;
    createFolder?: (name: string, parentId: string) => Promise<void | AppResult<void>>;
    uploadFile?: (params: { fileName: string; mimeType: string; content: Blob; parentId: string }) => Promise<{ id?: string; name?: string } | AppResult<{ id?: string; name?: string }>>;
}

export function useDriveSearch({
    setIsDriveLoading,
    setDriveFolders,
    setDriveJsonFiles,
    setFolderPath,
    showToast,
    driveCacheRef,
    fetchFolderContents,
    driveGateway,
}: UseDriveSearchProps) {
    const [driveSearchTerm, setDriveSearchTerm] = useState('');
    const [driveDateFrom, setDriveDateFrom] = useState('');
    const [driveDateTo, setDriveDateTo] = useState('');
    const [driveContentTerm, setDriveContentTerm] = useState('');
    const [driveSearchMode, setDriveSearchMode] = useState<DriveSearchMode>('metadata');
    const [driveSearchWarnings, setDriveSearchWarnings] = useState<string[]>([]);
    const [isDriveSearchPartial, setIsDriveSearchPartial] = useState(false);
    const [deepSearchStatus, setDeepSearchStatus] = useState('');
    const [driveSearchJob, setDriveSearchJob] = useState<AsyncJobState>({
        operation: 'drive_deep_search',
        status: 'idle',
        message: null,
        updatedAt: null,
    });
    const activeDeepSearchRef = useRef<{ cancelled: boolean } | null>(null);

    const applySearchResult = useCallback((result: DriveSearchResult) => {
        setDriveFolders([]);
        setDriveJsonFiles(result.files);
        setFolderPath([{ id: 'search', name: 'Resultados de búsqueda' }]);
        setDriveSearchWarnings(result.warnings);
        setIsDriveSearchPartial(result.partial);
    }, [setDriveFolders, setDriveJsonFiles, setFolderPath]);

    const runLegacyMetadataSearch = useCallback(async (): Promise<DriveFolder[]> => {
        if (!driveGateway.searchJsonFiles) {
            throw new Error('La búsqueda por metadata no está disponible en el gateway actual.');
        }
        return driveGateway.searchJsonFiles({
            searchTerm: driveSearchTerm.trim(),
            dateFrom: driveDateFrom,
            dateTo: driveDateTo,
        });
    }, [driveDateFrom, driveDateTo, driveGateway, driveSearchTerm]);

    const runLegacyDeepContentSearch = useCallback(async (files: DriveFolder[]): Promise<DriveSearchResult> => {
        const contentTerm = driveContentTerm.trim().toLowerCase();
        if (!contentTerm) {
            return {
                files,
                partial: false,
                warnings: ['La búsqueda profunda requiere un término de contenido; se usó solo metadata.'],
            };
        }

        const searchToken = { cancelled: false };
        activeDeepSearchRef.current = searchToken;
        const startedAt = Date.now();
        const warnings = new Set<string>();
        const filtered: DriveFolder[] = [];
        const candidates = files.slice(0, DRIVE_DEEP_SEARCH_MAX_FILES);
        const queue = [...candidates];
        let partial = files.length > DRIVE_DEEP_SEARCH_MAX_FILES;
        let processed = 0;

        if (partial) {
            warnings.add(`La búsqueda profunda se limitó a ${DRIVE_DEEP_SEARCH_MAX_FILES} archivos para mantener la respuesta ágil.`);
        }

        const workerCount = Math.min(DRIVE_CONTENT_FETCH_CONCURRENCY, queue.length) || 1;
        const initialMessage = `Analizando 0 de ${candidates.length} archivos...`;
        setDeepSearchStatus(initialMessage);
        setDriveSearchJob({
            operation: 'drive_deep_search',
            status: 'running',
            message: initialMessage,
            updatedAt: Date.now(),
        });

        const workers = Array.from({ length: workerCount }, () => (async () => {
            while (queue.length) {
                if (searchToken.cancelled) {
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
                    if (!driveGateway.getFileContent) {
                        throw new Error('La lectura de contenido de Drive no está disponible en el gateway actual.');
                    }
                    const content = await driveGateway.getFileContent(nextFile.id);
                    if (content && content.toLowerCase().includes(contentTerm)) {
                        filtered.push(nextFile);
                    }
                } catch (error) {
                    warnings.add(`No se pudo inspeccionar el contenido de "${nextFile.name}".`);
                    console.warn('No se pudo analizar el archivo para la búsqueda de contenido:', nextFile.name, error);
                } finally {
                    processed += 1;
                    const message = `Analizando ${processed} de ${candidates.length} archivos...`;
                    setDeepSearchStatus(message);
                    setDriveSearchJob({
                        operation: 'drive_deep_search',
                        status: 'running',
                        message,
                        updatedAt: Date.now(),
                    });
                }
            }
        })());

        await Promise.all(workers);
        activeDeepSearchRef.current = null;

        return {
            files: filtered,
            partial,
            warnings: Array.from(warnings),
        };
    }, [driveContentTerm, driveGateway]);

    const handleSearchInDrive = useCallback(async () => {
        if (!driveSearchTerm && !driveDateFrom && !driveDateTo && !driveContentTerm) {
            showToast('Ingrese algún criterio de búsqueda.', 'warning');
            return;
        }
        setIsDriveLoading(true);
        setDeepSearchStatus('');
        setDriveSearchWarnings([]);
        setIsDriveSearchPartial(false);
        setDriveSearchJob({
            operation: 'drive_deep_search',
            status: driveSearchMode === 'deepContent' ? 'running' : 'idle',
            message: driveSearchMode === 'deepContent' ? 'Preparando búsqueda profunda…' : null,
            updatedAt: Date.now(),
        });
        try {
            const searchTerm = driveSearchTerm.trim();
            const contentTerm = driveContentTerm.trim();
            const cacheKey = `search:${driveSearchMode}:${searchTerm.toLowerCase()}|${driveDateFrom}|${driveDateTo}|${contentTerm.toLowerCase()}`;
            const cached = driveCacheRef.current.get(cacheKey);
            
            if (cached && Date.now() - cached.timestamp < SEARCH_CACHE_TTL) {
                applySearchResult({ files: cached.files, partial: false, warnings: [] });
                showToast(`Se encontraron ${cached.files.length} archivo(s).`);
                return;
            }

            let result: DriveSearchResult;
            if ('search' in driveGateway) {
                const searchToken = { cancelled: false };
                activeDeepSearchRef.current = searchToken;
                const searchResult = await driveGateway.search!({
                    searchTerm,
                    dateFrom: driveDateFrom,
                    dateTo: driveDateTo,
                    contentTerm,
                }, driveSearchMode, {
                    cancelToken: searchToken,
                    onProgress: setDeepSearchStatus,
                });
                if (!searchResult.ok) {
                    throw Object.assign(new Error(searchResult.error.message), { appResultStatus: searchResult.status });
                }
                result = searchResult.data;
                setDriveSearchJob({
                    operation: 'drive_deep_search',
                    status: searchResult.status === 'cancelled'
                        ? 'cancelled'
                        : searchResult.status === 'partial'
                            ? 'partial'
                            : driveSearchMode === 'deepContent'
                                ? 'success'
                                : 'idle',
                    message: searchResult.status === 'cancelled'
                        ? 'Búsqueda cancelada por el usuario.'
                        : searchResult.status === 'partial'
                            ? 'Búsqueda profunda completada con resultados parciales.'
                            : driveSearchMode === 'deepContent'
                                ? 'Búsqueda profunda completada.'
                                : null,
                    updatedAt: Date.now(),
                });
            } else {
                const metadataFiles = await runLegacyMetadataSearch();
                result = driveSearchMode === 'deepContent'
                    ? await runLegacyDeepContentSearch(metadataFiles)
                    : {
                        files: metadataFiles,
                        partial: false,
                        warnings: contentTerm ? ['El término de contenido solo se usa en la búsqueda profunda.'] : [],
                    };
                setDriveSearchJob({
                    operation: 'drive_deep_search',
                    status: result.partial
                        ? result.warnings.some(warning => warning.toLowerCase().includes('cancelada'))
                            ? 'cancelled'
                            : 'partial'
                        : driveSearchMode === 'deepContent'
                            ? 'success'
                            : 'idle',
                    message: result.partial
                        ? 'Búsqueda profunda finalizada con resultados parciales.'
                        : driveSearchMode === 'deepContent'
                            ? 'Búsqueda profunda completada.'
                            : null,
                    updatedAt: Date.now(),
                });
            }

            applySearchResult(result);
            if (!result.partial && result.warnings.length === 0) {
                driveCacheRef.current.set(cacheKey, { folders: [], files: result.files, timestamp: Date.now() });
            }
            showToast(`Se encontraron ${result.files.length} archivo(s).${result.partial ? ' Resultado parcial.' : ''}`);
        } catch (error) {
            console.error('Error al buscar en Drive:', error);
            const status = (error as { appResultStatus?: string })?.appResultStatus;
            setDriveSearchJob({
                operation: 'drive_deep_search',
                status: status === 'cancelled' ? 'cancelled' : status === 'partial' ? 'partial' : 'error',
                message: buildDriveContextErrorMessage('No se pudo completar la búsqueda en Drive', error, 'Error durante la búsqueda.'),
                updatedAt: Date.now(),
            });
            showToast(buildDriveContextErrorMessage('No se pudo completar la búsqueda en Drive', error, 'Error durante la búsqueda.'), 'error');
        } finally {
            activeDeepSearchRef.current = null;
            setIsDriveLoading(false);
            setDeepSearchStatus('');
        }
    }, [applySearchResult, driveContentTerm, driveDateFrom, driveDateTo, driveGateway, driveSearchMode, driveSearchTerm, driveCacheRef, runLegacyDeepContentSearch, runLegacyMetadataSearch, setIsDriveLoading, showToast]);

    const cancelDriveSearch = useCallback(() => {
        if (activeDeepSearchRef.current) {
            activeDeepSearchRef.current.cancelled = true;
            setDriveSearchJob({
                operation: 'drive_deep_search',
                status: 'cancelled',
                message: 'Cancelando búsqueda profunda…',
                updatedAt: Date.now(),
            });
        }
    }, []);

    const clearDriveSearch = useCallback(() => {
        setDriveSearchTerm('');
        setDriveDateFrom('');
        setDriveDateTo('');
        setDriveContentTerm('');
        setDriveSearchWarnings([]);
        setIsDriveSearchPartial(false);
        setDeepSearchStatus('');
        setDriveSearchJob({
            operation: 'drive_deep_search',
            status: 'idle',
            message: null,
            updatedAt: Date.now(),
        });
        setFolderPath([{ id: 'root', name: 'Mi unidad' }]);
        void fetchFolderContents('root');
    }, [fetchFolderContents, setFolderPath]);

    return {
        driveSearchTerm,
        driveDateFrom,
        driveDateTo,
        driveContentTerm,
        driveSearchMode,
        driveSearchWarnings,
        isDriveSearchPartial,
        deepSearchStatus,
        driveSearchJob,
        setDriveSearchTerm,
        setDriveDateFrom,
        setDriveDateTo,
        setDriveContentTerm,
        setDriveSearchMode,
        handleSearchInDrive,
        cancelDriveSearch,
        clearDriveSearch,
    };
}

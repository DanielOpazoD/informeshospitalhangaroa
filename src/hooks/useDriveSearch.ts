import {
    useState,
    useCallback,
    useRef,
    type Dispatch,
    type MutableRefObject,
    type SetStateAction,
} from 'react';
import type { AsyncJobState, DriveFolder, DriveSearchMode, DriveSearchResult, ToastFn } from '../types';
import { SEARCH_CACHE_TTL } from '../appConstants';
import { buildDriveContextErrorMessage } from '../utils/driveErrorUtils';
import type { DriveGateway } from '../infrastructure/drive/driveGateway';
import { AppResultError, getResultJobStatus } from '../infrastructure/shared/appResult';

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
    driveGateway: DriveGateway;
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

            const searchToken = { cancelled: false };
            activeDeepSearchRef.current = searchToken;
            const searchResult = await driveGateway.search({
                searchTerm,
                dateFrom: driveDateFrom,
                dateTo: driveDateTo,
                contentTerm,
            }, driveSearchMode, {
                cancelToken: searchToken,
                onProgress: setDeepSearchStatus,
            });
            if (!searchResult.ok) {
                throw new AppResultError(searchResult.error.message, searchResult.status);
            }
            const result = searchResult.data;
            setDriveSearchJob({
                operation: 'drive_deep_search',
                status: getResultJobStatus(searchResult.status, driveSearchMode === 'deepContent' ? 'success' : 'idle'),
                message: searchResult.status === 'cancelled'
                    ? 'Búsqueda cancelada por el usuario.'
                    : searchResult.status === 'partial'
                        ? 'Búsqueda profunda completada con resultados parciales.'
                        : driveSearchMode === 'deepContent'
                            ? 'Búsqueda profunda completada.'
                            : null,
                updatedAt: Date.now(),
            });

            applySearchResult(result);
            if (!result.partial && result.warnings.length === 0) {
                driveCacheRef.current.set(cacheKey, { folders: [], files: result.files, timestamp: Date.now() });
            }
            showToast(`Se encontraron ${result.files.length} archivo(s).${result.partial ? ' Resultado parcial.' : ''}`);
        } catch (error) {
            console.error('Error al buscar en Drive:', error);
            const status = error instanceof AppResultError ? error.status : undefined;
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
    }, [applySearchResult, driveContentTerm, driveDateFrom, driveDateTo, driveGateway, driveSearchMode, driveSearchTerm, driveCacheRef, setIsDriveLoading, showToast]);

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

import { useState, useCallback } from 'react';
import type { DriveFolder, ToastFn } from '../types';
import { SEARCH_CACHE_TTL, DRIVE_CONTENT_FETCH_CONCURRENCY } from '../appConstants';
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
    setFolderPath: (path: DriveFolder[]) => void;
    showToast: ToastFn;
    driveCacheRef: React.MutableRefObject<Map<string, DriveCacheEntry>>;
    fetchFolderContents: (folderId: string) => Promise<void>;
}

export function useDriveSearch({
    setIsDriveLoading,
    setDriveFolders,
    setDriveJsonFiles,
    setFolderPath,
    showToast,
    driveCacheRef,
    fetchFolderContents,
}: UseDriveSearchProps) {
    const [driveSearchTerm, setDriveSearchTerm] = useState('');
    const [driveDateFrom, setDriveDateFrom] = useState('');
    const [driveDateTo, setDriveDateTo] = useState('');
    const [driveContentTerm, setDriveContentTerm] = useState('');

    const handleSearchInDrive = useCallback(async () => {
        if (!driveSearchTerm && !driveDateFrom && !driveDateTo && !driveContentTerm) {
            showToast('Ingrese algún criterio de búsqueda.', 'warning');
            return;
        }
        setIsDriveLoading(true);
        try {
            const searchTerm = driveSearchTerm.trim();
            const contentTerm = driveContentTerm.trim();
            const cacheKey = `search:${searchTerm.toLowerCase()}|${driveDateFrom}|${driveDateTo}|${contentTerm.toLowerCase()}`;
            const cached = driveCacheRef.current.get(cacheKey);
            
            if (cached && Date.now() - cached.timestamp < SEARCH_CACHE_TTL) {
                setDriveFolders([]);
                setDriveJsonFiles(cached.files);
                setFolderPath([{ id: 'search', name: 'Resultados de búsqueda' }]);
                showToast(`Se encontraron ${cached.files.length} archivo(s).`);
                return;
            }

            const qParts = ["mimeType='application/json'", 'trashed=false'];
            if (searchTerm) {
                const sanitized = searchTerm.replace(/'/g, "\\'");
                qParts.push(`name contains '${sanitized}'`);
            }
            if (driveDateFrom) {
                qParts.push(`modifiedTime >= '${driveDateFrom}T00:00:00'`);
            }
            if (driveDateTo) {
                qParts.push(`modifiedTime <= '${driveDateTo}T23:59:59'`);
            }
            
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const response: any = await (window as any).gapi.client.drive.files.list({
                q: qParts.join(' and '),
                fields: 'files(id, name, mimeType, modifiedTime)',
                orderBy: 'modifiedTime desc',
            });
            
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let files: DriveFolder[] = (response.result.files || []).map((file: any) => ({
                id: file.id,
                name: file.name,
                mimeType: file.mimeType,
                modifiedTime: file.modifiedTime,
            }));

            if (contentTerm && files.length) {
                const term = contentTerm.toLowerCase();
                const filtered: DriveFolder[] = [];
                const queue = [...files];
                const workerCount = Math.min(DRIVE_CONTENT_FETCH_CONCURRENCY, queue.length) || 1;
                
                const workers = Array.from({ length: workerCount }, () => (async () => {
                    while (queue.length) {
                        const nextFile = queue.shift();
                        if (!nextFile) return;
                        try {
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            const fileResponse: any = await (window as any).gapi.client.drive.files.get({
                                fileId: nextFile.id,
                                alt: 'media',
                            });
                            const body = fileResponse?.body;
                            const content = typeof body === 'string' ? body : body ? JSON.stringify(body) : '';
                            if (content && content.toLowerCase().includes(term)) {
                                filtered.push(nextFile);
                            }
                        } catch (error) {
                            console.warn('No se pudo analizar el archivo para la búsqueda de contenido:', nextFile.name, error);
                        }
                    }
                })());
                await Promise.all(workers);
                files = filtered;
            }

            setDriveFolders([]);
            setDriveJsonFiles(files);
            setFolderPath([{ id: 'search', name: 'Resultados de búsqueda' }]);
            driveCacheRef.current.set(cacheKey, { folders: [], files, timestamp: Date.now() });
            showToast(`Se encontraron ${files.length} archivo(s).`);
        } catch (error) {
            console.error('Error al buscar en Drive:', error);
            showToast(buildDriveContextErrorMessage('No se pudo completar la búsqueda en Drive', error, 'Error durante la búsqueda.'), 'error');
        } finally {
            setIsDriveLoading(false);
        }
    }, [driveContentTerm, driveDateFrom, driveDateTo, driveSearchTerm, driveCacheRef, setDriveFolders, setDriveJsonFiles, setFolderPath, setIsDriveLoading, showToast]);

    const clearDriveSearch = useCallback(() => {
        setDriveSearchTerm('');
        setDriveDateFrom('');
        setDriveDateTo('');
        setDriveContentTerm('');
        setFolderPath([{ id: 'root', name: 'Mi unidad' }]);
        fetchFolderContents('root');
    }, [fetchFolderContents, setFolderPath]);

    return {
        driveSearchTerm,
        driveDateFrom,
        driveDateTo,
        driveContentTerm,
        setDriveSearchTerm,
        setDriveDateFrom,
        setDriveDateTo,
        setDriveContentTerm,
        handleSearchInDrive,
        clearDriveSearch,
    };
}

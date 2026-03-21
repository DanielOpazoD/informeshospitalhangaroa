import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import type {
    AppResult,
    ClinicalRecord,
    DriveFolder,
    FavoriteFolderEntry,
    SaveOptions,
    ToastFn,
} from '../types';
import { buildDriveContextErrorMessage } from '../utils/driveErrorUtils';
import { getRootDriveFolder } from '../utils/driveFolderStorage';
import { importRecordFromDrive } from '../application/clinicalRecordUseCases';

interface DriveCacheEntry {
    folders: DriveFolder[];
    files: DriveFolder[];
    timestamp: number;
}

interface UseDriveOperationsParams {
    showToast: ToastFn;
    driveGateway: CompatibleDriveGateway;
    driveCacheRef: MutableRefObject<Map<string, DriveCacheEntry>>;
    folderPath: DriveFolder[];
    selectedFolderId: string;
    newFolderName: string;
    addRecentFile: (file: DriveFolder) => void;
    setDriveFolders: Dispatch<SetStateAction<DriveFolder[]>>;
    setDriveJsonFiles: Dispatch<SetStateAction<DriveFolder[]>>;
    setFolderPath: Dispatch<SetStateAction<DriveFolder[]>>;
    setSelectedFolderId: Dispatch<SetStateAction<string>>;
    setNewFolderName: Dispatch<SetStateAction<string>>;
    setIsDriveLoading: Dispatch<SetStateAction<boolean>>;
    setIsSaving: Dispatch<SetStateAction<boolean>>;
}

interface CompatibleDriveGateway {
    listFolders: (folderId: string) => Promise<DriveFolder[] | AppResult<DriveFolder[]>>;
    listFolderContents: (folderId: string) => Promise<{ folders: DriveFolder[]; files: DriveFolder[] } | AppResult<{ folders: DriveFolder[]; files: DriveFolder[] }>>;
    getJsonRecord?: (fileId: string) => Promise<unknown>;
    readJsonRecord?: (fileId: string) => Promise<unknown | AppResult<unknown>>;
    createFolder: (name: string, parentId: string) => Promise<void | AppResult<void>>;
    uploadFile: (params: { fileName: string; mimeType: string; content: Blob; parentId: string }) => Promise<{ id?: string; name?: string } | AppResult<{ id?: string; name?: string }>>;
}

export const useDriveOperations = ({
    showToast,
    driveGateway,
    driveCacheRef,
    folderPath,
    selectedFolderId,
    newFolderName,
    addRecentFile,
    setDriveFolders,
    setDriveJsonFiles,
    setFolderPath,
    setSelectedFolderId,
    setNewFolderName,
    setIsDriveLoading,
    setIsSaving,
}: UseDriveOperationsParams) => {
    const unwrapGatewayResult = useCallback(async <T,>(value: Promise<T | AppResult<T>>) => {
        const resolved = await value;
        if (resolved && typeof resolved === 'object' && 'ok' in resolved) {
            if (!resolved.ok) {
                throw new Error(resolved.error.message);
            }
            return resolved.data;
        }
        return resolved as T;
    }, []);

    const cacheFolders = useCallback((key: string, folders: DriveFolder[], files: DriveFolder[] = []) => {
        driveCacheRef.current.set(key, { folders, files, timestamp: Date.now() });
    }, [driveCacheRef]);

    const fetchDriveFolders = useCallback(async (folderId: string) => {
        setIsDriveLoading(true);
        try {
            const cacheKey = `folders:${folderId}`;
            const cached = driveCacheRef.current.get(cacheKey);
            if (cached) {
                setDriveFolders(cached.folders);
                setSelectedFolderId(folderId);
                return;
            }
            const folders = await unwrapGatewayResult(driveGateway.listFolders(folderId));
            cacheFolders(cacheKey, folders);
            setDriveFolders(folders);
            setSelectedFolderId(folderId);
        } catch (error) {
            console.error('Error fetching folders:', error);
            showToast(buildDriveContextErrorMessage('No se pudieron cargar las carpetas de Drive', error, 'Error al listar carpetas.'), 'error');
        } finally {
            setIsDriveLoading(false);
        }
    }, [cacheFolders, driveCacheRef, driveGateway, setDriveFolders, setIsDriveLoading, setSelectedFolderId, showToast, unwrapGatewayResult]);

    const fetchFolderContents = useCallback(async (folderId: string) => {
        setIsDriveLoading(true);
        try {
            const cacheKey = `contents:${folderId}`;
            const cached = driveCacheRef.current.get(cacheKey);
            if (cached) {
                setDriveFolders(cached.folders);
                setDriveJsonFiles(cached.files);
                setSelectedFolderId(folderId);
                return;
            }
            const { folders, files } = await unwrapGatewayResult(driveGateway.listFolderContents(folderId));
            cacheFolders(cacheKey, folders, files);
            setDriveFolders(folders);
            setDriveJsonFiles(files);
            setSelectedFolderId(folderId);
        } catch (error) {
            console.error('Error fetching folder contents:', error);
            showToast(buildDriveContextErrorMessage('No se pudieron cargar los contenidos de la carpeta de Drive', error, 'Error al listar contenidos.'), 'error');
        } finally {
            setIsDriveLoading(false);
        }
    }, [cacheFolders, driveCacheRef, driveGateway, setDriveFolders, setDriveJsonFiles, setIsDriveLoading, setSelectedFolderId, showToast, unwrapGatewayResult]);

    const handleGoToFavorite = useCallback((favorite: FavoriteFolderEntry, mode: 'save' | 'open') => {
        const clonedPath = favorite.path?.length ? structuredClone(favorite.path) : [getRootDriveFolder()];
        setFolderPath(clonedPath);
        if (mode === 'save') {
            void fetchDriveFolders(favorite.id);
        } else {
            void fetchFolderContents(favorite.id);
        }
    }, [fetchDriveFolders, fetchFolderContents, setFolderPath]);

    const formatDriveDate = useCallback((value?: string) => {
        if (!value) return 'Sin fecha';
        try {
            return new Date(value).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' });
        } catch {
            return value;
        }
    }, []);

    const handleCreateFolder = useCallback(async () => {
        if (!newFolderName.trim()) {
            showToast('Por favor, ingrese un nombre para la nueva carpeta.', 'warning');
            return;
        }
        setIsDriveLoading(true);
        try {
            const currentFolderId = folderPath[folderPath.length - 1].id;
            await unwrapGatewayResult(driveGateway.createFolder(newFolderName.trim(), currentFolderId));
            setNewFolderName('');
            driveCacheRef.current.delete(`folders:${currentFolderId}`);
            driveCacheRef.current.delete(`contents:${currentFolderId}`);
            await fetchDriveFolders(currentFolderId);
            showToast('Carpeta creada correctamente.');
        } catch (error) {
            console.error('Error creating folder:', error);
            showToast(buildDriveContextErrorMessage('No se pudo crear la carpeta', error, 'Error al crear carpeta.'), 'error');
        } finally {
            setIsDriveLoading(false);
        }
    }, [driveCacheRef, driveGateway, fetchDriveFolders, folderPath, newFolderName, setIsDriveLoading, setNewFolderName, showToast, unwrapGatewayResult]);

    const openJsonFileFromDrive = useCallback(async (file: DriveFolder): Promise<ClinicalRecord | null> => {
        setIsDriveLoading(true);
        try {
            const rawRecord = driveGateway.readJsonRecord
                ? await unwrapGatewayResult(driveGateway.readJsonRecord(file.id))
                : driveGateway.getJsonRecord
                    ? await unwrapGatewayResult(driveGateway.getJsonRecord(file.id))
                    : null;
            if (!rawRecord) {
                showToast('El archivo JSON seleccionado de Drive no es válido.', 'error');
                return null;
            }

            const { record: importedRecord, warnings, errors } = importRecordFromDrive(rawRecord);
            if (importedRecord) {
                showToast('Archivo cargado exitosamente desde Google Drive.');
                if (warnings.length) {
                    showToast(`Contenido protegido al abrir desde Drive:\n- ${warnings.join('\n- ')}`, 'warning');
                }
                addRecentFile(file);
                return importedRecord;
            }
            showToast(errors.join('\n') || 'El archivo JSON seleccionado de Drive no es válido.', 'error');
            return null;
        } catch (error) {
            console.error('Error al abrir el archivo desde Drive:', error);
            showToast(buildDriveContextErrorMessage('Hubo un error al leer el archivo desde Google Drive', error, 'No se pudo leer el archivo.'), 'error');
            return null;
        } finally {
            setIsDriveLoading(false);
        }
    }, [addRecentFile, driveGateway, setIsDriveLoading, showToast, unwrapGatewayResult]);

    const saveToDrive = useCallback(async ({ record, baseFileName, format, generatePdf }: SaveOptions) => {
        setIsSaving(true);
        const saveFile = async (type: 'json' | 'pdf'): Promise<string> => {
            const extension = type === 'pdf' ? '.pdf' : '.json';
            const fileName = `${baseFileName}${extension}`;
            const mimeType = type === 'pdf' ? 'application/pdf' : 'application/json';
            const fileContent = type === 'pdf'
                ? await generatePdf()
                : new Blob([JSON.stringify(record, null, 2)], { type: mimeType });

            await unwrapGatewayResult(driveGateway.uploadFile({
                fileName,
                mimeType,
                content: fileContent,
                parentId: selectedFolderId,
            }));

            return fileName;
        };

        try {
            if (format === 'json' || format === 'pdf') {
                const fileName = await saveFile(format);
                showToast(`Archivo "${fileName}" guardado en Google Drive exitosamente.`);
            } else {
                const [jsonFileName, pdfFileName] = await Promise.all([saveFile('json'), saveFile('pdf')]);
                showToast(`Archivos "${jsonFileName}" y "${pdfFileName}" guardados en Google Drive exitosamente.`);
            }
            return true;
        } catch (error) {
            console.error('Error saving to Drive:', error);
            showToast(buildDriveContextErrorMessage('Error al guardar en Google Drive', error, 'No se pudo guardar el archivo.'), 'error');
            return false;
        } finally {
            setIsSaving(false);
        }
    }, [driveGateway, selectedFolderId, setIsSaving, showToast, unwrapGatewayResult]);

    return {
        fetchDriveFolders,
        fetchFolderContents,
        handleGoToFavorite,
        formatDriveDate,
        handleCreateFolder,
        openJsonFileFromDrive,
        saveToDrive,
    };
};

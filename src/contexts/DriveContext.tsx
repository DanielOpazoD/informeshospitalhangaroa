import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type {
    ClinicalRecord,
    DriveFolder,
    FavoriteFolderEntry,
    RecentDriveFile,
    SaveFormat,
    SaveOptions,
    ToastFn,
} from '../types';
import { buildDriveContextErrorMessage } from '../utils/driveErrorUtils';
import { useDriveStorage } from '../hooks/useDriveStorage';
import { useDriveSearch } from '../hooks/useDriveSearch';
import { createDriveGateway } from '../services/driveGateway';
import { getRootDriveFolder } from '../utils/driveFolderStorage';

interface DriveCacheEntry {
    folders: DriveFolder[];
    files: DriveFolder[];
    timestamp: number;
}


interface DriveContextValue {
    driveFolders: DriveFolder[];
    driveJsonFiles: DriveFolder[];
    folderPath: DriveFolder[];
    saveFormat: SaveFormat;
    driveSearchTerm: string;
    driveDateFrom: string;
    driveDateTo: string;
    driveContentTerm: string;
    favoriteFolders: FavoriteFolderEntry[];
    recentFiles: RecentDriveFile[];
    selectedFolderId: string;
    newFolderName: string;
    fileNameInput: string;
    isDriveLoading: boolean;
    isSaving: boolean;
    fetchDriveFolders: (folderId: string) => Promise<void>;
    fetchFolderContents: (folderId: string) => Promise<void>;
    handleAddFavoriteFolder: () => void;
    handleRemoveFavoriteFolder: (id: string) => void;
    handleGoToFavorite: (favorite: FavoriteFolderEntry, mode: 'save' | 'open') => void;
    handleSearchInDrive: () => Promise<void>;
    clearDriveSearch: () => void;
    addRecentFile: (file: DriveFolder) => void;
    formatDriveDate: (value?: string) => string;
    handleCreateFolder: () => Promise<void>;
    handleSetDefaultFolder: () => void;
    openJsonFileFromDrive: (file: DriveFolder) => Promise<ClinicalRecord | null>;
    saveToDrive: (options: SaveOptions) => Promise<boolean>;
    setFolderPath: React.Dispatch<React.SetStateAction<DriveFolder[]>>;
    setSaveFormat: React.Dispatch<React.SetStateAction<SaveFormat>>;
    setFileNameInput: React.Dispatch<React.SetStateAction<string>>;
    setNewFolderName: React.Dispatch<React.SetStateAction<string>>;
    setDriveSearchTerm: React.Dispatch<React.SetStateAction<string>>;
    setDriveDateFrom: React.Dispatch<React.SetStateAction<string>>;
    setDriveDateTo: React.Dispatch<React.SetStateAction<string>>;
    setDriveContentTerm: React.Dispatch<React.SetStateAction<string>>;
}

interface DriveProviderProps {
    showToast: ToastFn;
    children: React.ReactNode;
}

const DriveContext = createContext<DriveContextValue | undefined>(undefined);

export const DriveProvider: React.FC<DriveProviderProps> = ({ children, showToast }) => {
    const [driveFolders, setDriveFolders] = useState<DriveFolder[]>([]);
    const [driveJsonFiles, setDriveJsonFiles] = useState<DriveFolder[]>([]);
    const [folderPath, setFolderPath] = useState<DriveFolder[]>([getRootDriveFolder()]);
    const [saveFormat, setSaveFormat] = useState<SaveFormat>('json');
    const [selectedFolderId, setSelectedFolderId] = useState<string>('root');
    const [newFolderName, setNewFolderName] = useState('');
    const [fileNameInput, setFileNameInput] = useState('');
    const [isDriveLoading, setIsDriveLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const driveCacheRef = useRef(new Map<string, DriveCacheEntry>());
    const driveGateway = useMemo(() => createDriveGateway(), []);

    const {
        favoriteFolders,
        recentFiles,
        handleAddFavoriteFolder: _handleAddFavoriteFolder,
        handleRemoveFavoriteFolder,
        addRecentFile,
        handleSetDefaultFolder: _handleSetDefaultFolder,
    } = useDriveStorage(showToast);

    const handleAddFavoriteFolder = useCallback(() => _handleAddFavoriteFolder(folderPath), [_handleAddFavoriteFolder, folderPath]);
    const handleSetDefaultFolder = useCallback(() => _handleSetDefaultFolder(folderPath, selectedFolderId), [_handleSetDefaultFolder, folderPath, selectedFolderId]);

    const cacheFolders = useCallback((key: string, folders: DriveFolder[], files: DriveFolder[] = []) => {
        driveCacheRef.current.set(key, { folders, files, timestamp: Date.now() });
    }, []);

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
            const folders = await driveGateway.listFolders(folderId);
            cacheFolders(cacheKey, folders);
            setDriveFolders(folders);
            setSelectedFolderId(folderId);
        } catch (error) {
            console.error('Error fetching folders:', error);
            showToast(buildDriveContextErrorMessage('No se pudieron cargar las carpetas de Drive', error, 'Error al listar carpetas.'), 'error');
        } finally {
            setIsDriveLoading(false);
        }
    }, [cacheFolders, driveGateway, showToast]);

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
            const { folders, files } = await driveGateway.listFolderContents(folderId);
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
    }, [cacheFolders, driveGateway, showToast]);

    const {
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
    } = useDriveSearch({
        setIsDriveLoading,
        setDriveFolders,
        setDriveJsonFiles,
        setFolderPath,
        showToast,
        driveCacheRef,
        fetchFolderContents,
        driveGateway,
    });



    const handleGoToFavorite = useCallback((favorite: FavoriteFolderEntry, mode: 'save' | 'open') => {
        const clonedPath = favorite.path?.length ? structuredClone(favorite.path) : [{ id: 'root', name: 'Mi unidad' }];
        setFolderPath(clonedPath);
        if (mode === 'save') {
            fetchDriveFolders(favorite.id);
        } else {
            fetchFolderContents(favorite.id);
        }
    }, [fetchDriveFolders, fetchFolderContents]);





    const formatDriveDate = useCallback((value?: string) => {
        if (!value) return 'Sin fecha';
        try {
            return new Date(value).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' });
        } catch (_) {
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
            await driveGateway.createFolder(newFolderName.trim(), currentFolderId);
            setNewFolderName('');
            driveCacheRef.current.delete(`folders:${currentFolderId}`);
            driveCacheRef.current.delete(`contents:${currentFolderId}`);
            fetchDriveFolders(currentFolderId);
            showToast('Carpeta creada correctamente.');
        } catch (error) {
            console.error('Error creating folder:', error);
            showToast(buildDriveContextErrorMessage('No se pudo crear la carpeta', error, 'Error al crear carpeta.'), 'error');
        } finally {
            setIsDriveLoading(false);
        }
    }, [driveGateway, fetchDriveFolders, folderPath, newFolderName, showToast]);



    const openJsonFileFromDrive = useCallback(async (file: DriveFolder): Promise<ClinicalRecord | null> => {
        setIsDriveLoading(true);
        try {
            const importedRecord = await driveGateway.getJsonRecord(file.id);
            if (importedRecord.version && importedRecord.patientFields && importedRecord.sections) {
                showToast('Archivo cargado exitosamente desde Google Drive.');
                addRecentFile(file);
                return importedRecord as ClinicalRecord;
            }
            showToast('El archivo JSON seleccionado de Drive no es válido.', 'error');
            return null;
        } catch (error) {
            console.error('Error al abrir el archivo desde Drive:', error);
            showToast(buildDriveContextErrorMessage('Hubo un error al leer el archivo desde Google Drive', error, 'No se pudo leer el archivo.'), 'error');
            return null;
        } finally {
            setIsDriveLoading(false);
        }
    }, [addRecentFile, driveGateway, showToast]);

    const saveToDrive = useCallback(async ({ record, baseFileName, format, generatePdf }: SaveOptions) => {
        setIsSaving(true);
        const saveFile = async (type: 'json' | 'pdf'): Promise<string> => {
            const extension = type === 'pdf' ? '.pdf' : '.json';
            const fileName = `${baseFileName}${extension}`;
            const mimeType = type === 'pdf' ? 'application/pdf' : 'application/json';

            const fileContent = type === 'pdf'
                ? await generatePdf()
                : new Blob([JSON.stringify(record, null, 2)], { type: mimeType });
            await driveGateway.uploadFile({
                fileName,
                mimeType,
                content: fileContent,
                parentId: selectedFolderId,
            });
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
        } catch (error: unknown) {
            console.error('Error saving to Drive:', error);
            showToast(buildDriveContextErrorMessage('Error al guardar en Google Drive', error, 'No se pudo guardar el archivo.'), 'error');
            return false;
        } finally {
            setIsSaving(false);
        }
    }, [driveGateway, selectedFolderId, showToast]);

    const value = useMemo<DriveContextValue>(() => ({
        driveFolders,
        driveJsonFiles,
        folderPath,
        saveFormat,
        driveSearchTerm,
        driveDateFrom,
        driveDateTo,
        driveContentTerm,
        favoriteFolders,
        recentFiles,
        selectedFolderId,
        newFolderName,
        fileNameInput,
        isDriveLoading,
        isSaving,
        fetchDriveFolders,
        fetchFolderContents,
        handleAddFavoriteFolder,
        handleRemoveFavoriteFolder,
        handleGoToFavorite,
        handleSearchInDrive,
        clearDriveSearch,
        addRecentFile,
        formatDriveDate,
        handleCreateFolder,
        handleSetDefaultFolder,
        openJsonFileFromDrive,
        saveToDrive,
        setFolderPath,
        setSaveFormat,
        setFileNameInput,
        setNewFolderName,
        setDriveSearchTerm,
        setDriveDateFrom,
        setDriveDateTo,
        setDriveContentTerm,
    }), [
        addRecentFile,
        clearDriveSearch,
        setDriveContentTerm,
        setDriveDateFrom,
        setDriveDateTo,
        setDriveSearchTerm,
        driveContentTerm,
        driveDateFrom,
        driveDateTo,
        driveFolders,
        driveJsonFiles,
        driveSearchTerm,
        favoriteFolders,
        fetchDriveFolders,
        fetchFolderContents,
        fileNameInput,
        folderPath,
        formatDriveDate,
        handleAddFavoriteFolder,
        handleCreateFolder,
        handleGoToFavorite,
        handleRemoveFavoriteFolder,
        handleSearchInDrive,
        handleSetDefaultFolder,
        isDriveLoading,
        isSaving,
        newFolderName,
        recentFiles,
        saveFormat,
        selectedFolderId,
        saveToDrive,
        openJsonFileFromDrive,
    ]);

    return <DriveContext.Provider value={value}>{children}</DriveContext.Provider>;
};

export const useDrive = (): DriveContextValue => {
    const context = useContext(DriveContext);
    if (!context) {
        throw new Error('useDrive must be used within a DriveProvider');
    }
    return context;
};

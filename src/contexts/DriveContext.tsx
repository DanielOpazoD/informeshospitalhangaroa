import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type {
    AsyncJobState,
    ClinicalRecord,
    DriveFolder,
    DriveSearchMode,
    FavoriteFolderEntry,
    RecentDriveFile,
    SaveFormat,
    SaveOptions,
    ToastFn,
} from '../types';
import { useDriveStorage } from '../hooks/useDriveStorage';
import { useDriveSearch } from '../hooks/useDriveSearch';
import { useDriveOperations } from '../hooks/useDriveOperations';
import { createDriveGateway } from '../infrastructure/drive/driveGateway';
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
    driveSearchMode: DriveSearchMode;
    driveSearchWarnings: string[];
    isDriveSearchPartial: boolean;
    deepSearchStatus: string;
    driveSearchJob: AsyncJobState;
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
    cancelDriveSearch: () => void;
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
    setDriveSearchMode: React.Dispatch<React.SetStateAction<DriveSearchMode>>;
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

    const {
        fetchDriveFolders,
        fetchFolderContents,
        handleGoToFavorite,
        formatDriveDate,
        handleCreateFolder,
        openJsonFileFromDrive,
        saveToDrive,
    } = useDriveOperations({
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
    });

    const {
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



    const value = useMemo<DriveContextValue>(() => ({
        driveFolders,
        driveJsonFiles,
        folderPath,
        saveFormat,
        driveSearchTerm,
        driveDateFrom,
        driveDateTo,
        driveContentTerm,
        driveSearchMode,
        driveSearchWarnings,
        isDriveSearchPartial,
        deepSearchStatus,
        driveSearchJob,
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
        cancelDriveSearch,
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
        setDriveSearchMode,
    }), [
        addRecentFile,
        cancelDriveSearch,
        clearDriveSearch,
        setDriveContentTerm,
        setDriveDateFrom,
        setDriveDateTo,
        setDriveSearchMode,
        setDriveSearchTerm,
        deepSearchStatus,
        driveSearchJob,
        driveContentTerm,
        driveDateFrom,
        driveDateTo,
        driveFolders,
        driveJsonFiles,
        driveSearchMode,
        driveSearchTerm,
        driveSearchWarnings,
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
        isDriveSearchPartial,
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

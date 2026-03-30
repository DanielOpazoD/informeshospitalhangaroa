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

export interface DriveNavigationContextValue {
    driveFolders: DriveFolder[];
    driveJsonFiles: DriveFolder[];
    folderPath: DriveFolder[];
    selectedFolderId: string;
    isDriveLoading: boolean;
    fetchDriveFolders: (folderId: string) => Promise<void>;
    fetchFolderContents: (folderId: string) => Promise<void>;
    formatDriveDate: (value?: string) => string;
    setFolderPath: React.Dispatch<React.SetStateAction<DriveFolder[]>>;
}

export interface DriveSearchContextValue {
    driveSearchTerm: string;
    driveDateFrom: string;
    driveDateTo: string;
    driveContentTerm: string;
    driveSearchMode: DriveSearchMode;
    driveSearchWarnings: string[];
    isDriveSearchPartial: boolean;
    deepSearchStatus: string;
    driveSearchJob: AsyncJobState;
    setDriveSearchTerm: React.Dispatch<React.SetStateAction<string>>;
    setDriveDateFrom: React.Dispatch<React.SetStateAction<string>>;
    setDriveDateTo: React.Dispatch<React.SetStateAction<string>>;
    setDriveContentTerm: React.Dispatch<React.SetStateAction<string>>;
    setDriveSearchMode: React.Dispatch<React.SetStateAction<DriveSearchMode>>;
    handleSearchInDrive: () => Promise<void>;
    cancelDriveSearch: () => void;
    clearDriveSearch: () => void;
}

export interface DrivePersistenceContextValue {
    saveFormat: SaveFormat;
    favoriteFolders: FavoriteFolderEntry[];
    recentFiles: RecentDriveFile[];
    newFolderName: string;
    fileNameInput: string;
    isSaving: boolean;
    handleAddFavoriteFolder: () => void;
    handleRemoveFavoriteFolder: (id: string) => void;
    handleGoToFavorite: (favorite: FavoriteFolderEntry, mode: 'save' | 'open') => void;
    addRecentFile: (file: DriveFolder) => void;
    handleCreateFolder: () => Promise<void>;
    handleSetDefaultFolder: () => void;
    openJsonFileFromDrive: (file: DriveFolder) => Promise<ClinicalRecord | null>;
    saveToDrive: (options: SaveOptions) => Promise<boolean>;
    setSaveFormat: React.Dispatch<React.SetStateAction<SaveFormat>>;
    setFileNameInput: React.Dispatch<React.SetStateAction<string>>;
    setNewFolderName: React.Dispatch<React.SetStateAction<string>>;
}

export type DriveContextValue =
    & DriveNavigationContextValue
    & DriveSearchContextValue
    & DrivePersistenceContextValue;

interface DriveProviderProps {
    showToast: ToastFn;
    children: React.ReactNode;
}

const DriveNavigationContext = createContext<DriveNavigationContextValue | undefined>(undefined);
const DriveSearchContext = createContext<DriveSearchContextValue | undefined>(undefined);
const DrivePersistenceContext = createContext<DrivePersistenceContextValue | undefined>(undefined);

const useRequiredContext = <T,>(context: React.Context<T | undefined>, hookName: string): T => {
    const value = useContext(context);
    if (!value) {
        throw new Error(`${hookName} must be used within a DriveProvider`);
    }
    return value;
};

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
        handleAddFavoriteFolder: rawAddFavoriteFolder,
        handleRemoveFavoriteFolder,
        addRecentFile,
        handleSetDefaultFolder: rawSetDefaultFolder,
    } = useDriveStorage(showToast);

    const handleAddFavoriteFolder = useCallback(
        () => rawAddFavoriteFolder(folderPath),
        [folderPath, rawAddFavoriteFolder],
    );
    const handleSetDefaultFolder = useCallback(
        () => rawSetDefaultFolder(folderPath, selectedFolderId),
        [folderPath, rawSetDefaultFolder, selectedFolderId],
    );

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

    const search = useDriveSearch({
        setIsDriveLoading,
        setDriveFolders,
        setDriveJsonFiles,
        setFolderPath,
        showToast,
        driveCacheRef,
        fetchFolderContents,
        driveGateway,
    });

    const navigationValue = useMemo<DriveNavigationContextValue>(() => ({
        driveFolders,
        driveJsonFiles,
        folderPath,
        selectedFolderId,
        isDriveLoading,
        fetchDriveFolders,
        fetchFolderContents,
        formatDriveDate,
        setFolderPath,
    }), [
        driveFolders,
        driveJsonFiles,
        fetchDriveFolders,
        fetchFolderContents,
        folderPath,
        formatDriveDate,
        isDriveLoading,
        selectedFolderId,
    ]);

    const searchValue = useMemo<DriveSearchContextValue>(() => ({
        driveSearchTerm: search.driveSearchTerm,
        driveDateFrom: search.driveDateFrom,
        driveDateTo: search.driveDateTo,
        driveContentTerm: search.driveContentTerm,
        driveSearchMode: search.driveSearchMode,
        driveSearchWarnings: search.driveSearchWarnings,
        isDriveSearchPartial: search.isDriveSearchPartial,
        deepSearchStatus: search.deepSearchStatus,
        driveSearchJob: search.driveSearchJob,
        setDriveSearchTerm: search.setDriveSearchTerm,
        setDriveDateFrom: search.setDriveDateFrom,
        setDriveDateTo: search.setDriveDateTo,
        setDriveContentTerm: search.setDriveContentTerm,
        setDriveSearchMode: search.setDriveSearchMode,
        handleSearchInDrive: search.handleSearchInDrive,
        cancelDriveSearch: search.cancelDriveSearch,
        clearDriveSearch: search.clearDriveSearch,
    }), [search]);

    const persistenceValue = useMemo<DrivePersistenceContextValue>(() => ({
        saveFormat,
        favoriteFolders,
        recentFiles,
        newFolderName,
        fileNameInput,
        isSaving,
        handleAddFavoriteFolder,
        handleRemoveFavoriteFolder,
        handleGoToFavorite,
        addRecentFile,
        handleCreateFolder,
        handleSetDefaultFolder,
        openJsonFileFromDrive,
        saveToDrive,
        setSaveFormat,
        setFileNameInput,
        setNewFolderName,
    }), [
        addRecentFile,
        favoriteFolders,
        fileNameInput,
        handleAddFavoriteFolder,
        handleCreateFolder,
        handleGoToFavorite,
        handleRemoveFavoriteFolder,
        handleSetDefaultFolder,
        isSaving,
        newFolderName,
        openJsonFileFromDrive,
        recentFiles,
        saveFormat,
        saveToDrive,
    ]);

    return (
        <DriveNavigationContext.Provider value={navigationValue}>
            <DriveSearchContext.Provider value={searchValue}>
                <DrivePersistenceContext.Provider value={persistenceValue}>
                    {children}
                </DrivePersistenceContext.Provider>
            </DriveSearchContext.Provider>
        </DriveNavigationContext.Provider>
    );
};

export const useDriveNavigation = (): DriveNavigationContextValue =>
    useRequiredContext(DriveNavigationContext, 'useDriveNavigation');

export const useDriveSearchState = (): DriveSearchContextValue =>
    useRequiredContext(DriveSearchContext, 'useDriveSearchState');

export const useDrivePersistence = (): DrivePersistenceContextValue =>
    useRequiredContext(DrivePersistenceContext, 'useDrivePersistence');

export const useDrive = (): DriveContextValue => ({
    ...useDriveNavigation(),
    ...useDriveSearchState(),
    ...useDrivePersistence(),
});

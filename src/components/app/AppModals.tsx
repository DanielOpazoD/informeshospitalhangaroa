import React from 'react';
import type { DriveFolder, DriveSearchMode, FavoriteFolderEntry, RecentDriveFile, VersionHistoryEntry } from '../../types';
import type { ToastState } from '../../hooks/useToast';
import SettingsModal from '../modals/SettingsModal';
import OpenFromDriveModal from '../modals/OpenFromDriveModal';
import SaveToDriveModal from '../modals/SaveToDriveModal';
import HistoryModal from '../modals/HistoryModal';

interface AppModalsProps {
    settings: {
        isSettingsModalOpen: boolean;
        tempApiKey: string;
        tempClientId: string;
        tempAiApiKey: string;
        tempAiProjectId: string;
        tempAiModel: string;
        showApiKey: boolean;
        showAiApiKey: boolean;
        onClose: () => void;
        onToggleShowApiKey: () => void;
        onToggleShowAiApiKey: () => void;
        onTempApiKeyChange: (value: string) => void;
        onTempClientIdChange: (value: string) => void;
        onTempAiApiKeyChange: (value: string) => void;
        onTempAiProjectIdChange: (value: string) => void;
        onTempAiModelChange: (value: string) => void;
        onSave: () => void;
        onClearCredentials: () => void;
    };
    openModal: {
        isOpen: boolean;
        isDriveLoading: boolean;
        folderPath: DriveFolder[];
        driveFolders: DriveFolder[];
        driveJsonFiles: DriveFolder[];
        driveSearchTerm: string;
        driveDateFrom: string;
        driveDateTo: string;
        driveContentTerm: string;
        driveSearchMode: DriveSearchMode;
        driveSearchWarnings: string[];
        isDriveSearchPartial: boolean;
        deepSearchStatus: string;
        favoriteFolders: FavoriteFolderEntry[];
        recentFiles: RecentDriveFile[];
        formatDriveDate: (value?: string) => string;
        onClose: () => void;
        onSearch: () => void;
        onCancelSearch: () => void;
        onClearSearch: () => void;
        onAddFavorite: () => void;
        onRemoveFavorite: (id: string) => void;
        onGoToFavorite: (favorite: FavoriteFolderEntry) => void;
        onBreadcrumbClick: (folderId: string, index: number) => void;
        onFolderClick: (folder: DriveFolder) => void;
        onFileOpen: (file: DriveFolder) => void;
        onSearchTermChange: (value: string) => void;
        onDateFromChange: (value: string) => void;
        onDateToChange: (value: string) => void;
        onContentTermChange: (value: string) => void;
        onSearchModeChange: (value: DriveSearchMode) => void;
    };
    saveModal: {
        isOpen: boolean;
        isDriveLoading: boolean;
        isSaving: boolean;
        saveFormat: 'json' | 'pdf' | 'both';
        fileNameInput: string;
        defaultDriveFileName: string;
        folderPath: DriveFolder[];
        driveFolders: DriveFolder[];
        favoriteFolders: FavoriteFolderEntry[];
        newFolderName: string;
        onClose: () => void;
        onSave: () => void;
        onAddFavorite: () => void;
        onRemoveFavorite: (id: string) => void;
        onGoToFavorite: (favorite: FavoriteFolderEntry) => void;
        onBreadcrumbClick: (folderId: string, index: number) => void;
        onFolderClick: (folder: DriveFolder) => void;
        onSaveFormatChange: (value: 'json' | 'pdf' | 'both') => void;
        onFileNameInputChange: (value: string) => void;
        onNewFolderNameChange: (value: string) => void;
        onCreateFolder: () => void;
        onSetDefaultFolder: () => void;
    };
    history: {
        isOpen: boolean;
        history: VersionHistoryEntry[];
        onClose: () => void;
        onRestore: (entry: VersionHistoryEntry) => void;
    };
    toast: ToastState | null;
    importInputRef: React.RefObject<HTMLInputElement | null>;
    onImportFile: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const AppModals: React.FC<AppModalsProps> = ({
    settings,
    openModal,
    saveModal,
    history,
    toast,
    importInputRef,
    onImportFile,
}) => (
    <>
        <SettingsModal
            isOpen={settings.isSettingsModalOpen}
            tempApiKey={settings.tempApiKey}
            tempClientId={settings.tempClientId}
            tempAiApiKey={settings.tempAiApiKey}
            tempAiProjectId={settings.tempAiProjectId}
            tempAiModel={settings.tempAiModel}
            showApiKey={settings.showApiKey}
            showAiApiKey={settings.showAiApiKey}
            onClose={settings.onClose}
            onToggleShowApiKey={settings.onToggleShowApiKey}
            onToggleShowAiApiKey={settings.onToggleShowAiApiKey}
            onTempApiKeyChange={settings.onTempApiKeyChange}
            onTempClientIdChange={settings.onTempClientIdChange}
            onTempAiApiKeyChange={settings.onTempAiApiKeyChange}
            onTempAiProjectIdChange={settings.onTempAiProjectIdChange}
            onTempAiModelChange={settings.onTempAiModelChange}
            onSave={settings.onSave}
            onClearCredentials={settings.onClearCredentials}
        />

        <OpenFromDriveModal
            isOpen={openModal.isOpen}
            isDriveLoading={openModal.isDriveLoading}
            folderPath={openModal.folderPath}
            driveFolders={openModal.driveFolders}
            driveJsonFiles={openModal.driveJsonFiles}
            driveSearchTerm={openModal.driveSearchTerm}
            driveDateFrom={openModal.driveDateFrom}
            driveDateTo={openModal.driveDateTo}
            driveContentTerm={openModal.driveContentTerm}
            driveSearchMode={openModal.driveSearchMode}
            driveSearchWarnings={openModal.driveSearchWarnings}
            isDriveSearchPartial={openModal.isDriveSearchPartial}
            deepSearchStatus={openModal.deepSearchStatus}
            favoriteFolders={openModal.favoriteFolders}
            recentFiles={openModal.recentFiles}
            formatDriveDate={openModal.formatDriveDate}
            onClose={openModal.onClose}
            onSearch={openModal.onSearch}
            onCancelSearch={openModal.onCancelSearch}
            onClearSearch={openModal.onClearSearch}
            onAddFavorite={openModal.onAddFavorite}
            onRemoveFavorite={openModal.onRemoveFavorite}
            onGoToFavorite={openModal.onGoToFavorite}
            onBreadcrumbClick={openModal.onBreadcrumbClick}
            onFolderClick={openModal.onFolderClick}
            onFileOpen={openModal.onFileOpen}
            onSearchTermChange={openModal.onSearchTermChange}
            onDateFromChange={openModal.onDateFromChange}
            onDateToChange={openModal.onDateToChange}
            onContentTermChange={openModal.onContentTermChange}
            onSearchModeChange={openModal.onSearchModeChange}
        />

        <SaveToDriveModal
            isOpen={saveModal.isOpen}
            isDriveLoading={saveModal.isDriveLoading}
            isSaving={saveModal.isSaving}
            saveFormat={saveModal.saveFormat}
            fileNameInput={saveModal.fileNameInput}
            defaultDriveFileName={saveModal.defaultDriveFileName}
            folderPath={saveModal.folderPath}
            driveFolders={saveModal.driveFolders}
            favoriteFolders={saveModal.favoriteFolders}
            newFolderName={saveModal.newFolderName}
            onClose={saveModal.onClose}
            onSave={saveModal.onSave}
            onAddFavorite={saveModal.onAddFavorite}
            onRemoveFavorite={saveModal.onRemoveFavorite}
            onGoToFavorite={saveModal.onGoToFavorite}
            onBreadcrumbClick={saveModal.onBreadcrumbClick}
            onFolderClick={saveModal.onFolderClick}
            onSaveFormatChange={saveModal.onSaveFormatChange}
            onFileNameInputChange={saveModal.onFileNameInputChange}
            onNewFolderNameChange={saveModal.onNewFolderNameChange}
            onCreateFolder={saveModal.onCreateFolder}
            onSetDefaultFolder={saveModal.onSetDefaultFolder}
        />

        <HistoryModal
            isOpen={history.isOpen}
            history={history.history}
            onClose={history.onClose}
            onRestore={history.onRestore}
        />

        {toast && <div className={`toast toast-${toast.type}`}>{toast.message}</div>}

        <input
            ref={importInputRef}
            id="importJson"
            type="file"
            accept="application/json"
            style={{ display: 'none' }}
            onChange={onImportFile}
        />
    </>
);

export default AppModals;

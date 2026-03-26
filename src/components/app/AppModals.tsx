import React from 'react';
import SettingsModal from '../modals/SettingsModal';
import OpenFromDriveModal from '../modals/OpenFromDriveModal';
import SaveToDriveModal from '../modals/SaveToDriveModal';
import HistoryModal from '../modals/HistoryModal';
import type { AppModalsProps } from './appShellViewModel';

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
            driveSearchJob={openModal.driveSearchJob}
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

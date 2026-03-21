import React from 'react';
import type { ToastState } from '../../hooks/useToast';
import { useAppSettings } from '../../hooks/useAppSettings';
import { useDriveModals } from '../../hooks/useDriveModals';
import { useEditorUiState } from '../../hooks/useEditorUiState';
import { useFileOperations } from '../../hooks/useFileOperations';
import { useAuth } from '../../contexts/AuthContext';
import { useDrive } from '../../contexts/DriveContext';
import { useRecordContext } from '../../contexts/RecordContext';
import type { HeaderHhrProps } from '../Header';
import AppModals from './AppModals';
import AppWorkspace from './AppWorkspace';

interface AppShellContentProps {
    toast: ToastState | null;
    settings: ReturnType<typeof useAppSettings>;
    driveModals: ReturnType<typeof useDriveModals>;
    editorUi: ReturnType<typeof useEditorUiState>;
    fileOperations: ReturnType<typeof useFileOperations>;
    auth: ReturnType<typeof useAuth>;
    drive: ReturnType<typeof useDrive>;
    recordState: Pick<
        ReturnType<typeof useRecordContext>,
        | 'record'
        | 'setRecord'
        | 'hasUnsavedChanges'
        | 'versionHistory'
        | 'isHistoryModalOpen'
        | 'setIsHistoryModalOpen'
        | 'handleRestoreHistoryEntry'
        | 'isEditing'
        | 'isGlobalStructureEditing'
        | 'activeEditTarget'
        | 'activateEditTarget'
        | 'handleActivatePatientEdit'
        | 'handleActivateSectionEdit'
        | 'handlePatientFieldChange'
        | 'handlePatientLabelChange'
        | 'handleSectionContentChange'
        | 'handleSectionTitleChange'
        | 'handleUpdateSectionMeta'
        | 'handleRemoveSection'
        | 'handleRemovePatientField'
    >;
    toggleGlobalStructureEditing: () => void;
    handleTemplateChange: (id: string) => void;
    handleAddClinicalUpdateSection: () => void;
    handleAddPatientField: () => void;
    handleAddSection: () => void;
    handleRestoreAll: () => void;
    handleToolbarCommand: (command: string) => void;
    onOpenCartola: () => void;
    aiAssistantPanel: React.ReactNode;
    hhrHeader: HeaderHhrProps;
    hhrPanel: React.ReactNode;
    hhrModal: React.ReactNode;
}

const AppShellContent: React.FC<AppShellContentProps> = ({
    toast,
    settings,
    driveModals,
    editorUi,
    fileOperations,
    auth,
    drive,
    recordState,
    toggleGlobalStructureEditing,
    handleTemplateChange,
    handleAddClinicalUpdateSection,
    handleAddPatientField,
    handleAddSection,
    handleRestoreAll,
    handleToolbarCommand,
    onOpenCartola,
    aiAssistantPanel,
    hhrHeader,
    hhrPanel,
    hhrModal,
}) => (
    <>
        <AppModals
            settings={{
                isSettingsModalOpen: settings.isSettingsModalOpen,
                tempApiKey: settings.tempApiKey,
                tempClientId: settings.tempClientId,
                tempAiApiKey: settings.tempAiApiKey,
                tempAiProjectId: settings.tempAiProjectId,
                tempAiModel: settings.tempAiModel,
                showApiKey: settings.showApiKey,
                showAiApiKey: settings.showAiApiKey,
                onClose: settings.closeSettingsModal,
                onToggleShowApiKey: settings.toggleShowApiKey,
                onToggleShowAiApiKey: settings.toggleShowAiApiKey,
                onTempApiKeyChange: settings.setTempApiKey,
                onTempClientIdChange: settings.setTempClientId,
                onTempAiApiKeyChange: settings.setTempAiApiKey,
                onTempAiProjectIdChange: settings.setTempAiProjectId,
                onTempAiModelChange: settings.setTempAiModel,
                onSave: settings.saveSettings,
                onClearCredentials: () => {
                    void settings.clearSettings();
                },
            }}
            openModal={{
                isOpen: driveModals.isOpenModalOpen,
                isDriveLoading: drive.isDriveLoading,
                folderPath: drive.folderPath,
                driveFolders: drive.driveFolders,
                driveJsonFiles: drive.driveJsonFiles,
                driveSearchTerm: drive.driveSearchTerm,
                driveDateFrom: drive.driveDateFrom,
                driveDateTo: drive.driveDateTo,
                driveContentTerm: drive.driveContentTerm,
                favoriteFolders: drive.favoriteFolders,
                recentFiles: drive.recentFiles,
                formatDriveDate: drive.formatDriveDate,
                onClose: () => driveModals.setIsOpenModalOpen(false),
                onSearch: () => {
                    void drive.handleSearchInDrive();
                },
                onClearSearch: drive.clearDriveSearch,
                onAddFavorite: drive.handleAddFavoriteFolder,
                onRemoveFavorite: drive.handleRemoveFavoriteFolder,
                onGoToFavorite: favorite => drive.handleGoToFavorite(favorite, 'open'),
                onBreadcrumbClick: driveModals.handleOpenModalBreadcrumbClick,
                onFolderClick: driveModals.handleOpenModalFolderClick,
                onFileOpen: file => {
                    void driveModals.handleFileOpen(file);
                },
                onSearchTermChange: drive.setDriveSearchTerm,
                onDateFromChange: drive.setDriveDateFrom,
                onDateToChange: drive.setDriveDateTo,
                onContentTermChange: drive.setDriveContentTerm,
            }}
            saveModal={{
                isOpen: driveModals.isSaveModalOpen,
                isDriveLoading: drive.isDriveLoading,
                isSaving: drive.isSaving,
                saveFormat: drive.saveFormat,
                fileNameInput: drive.fileNameInput,
                defaultDriveFileName: fileOperations.defaultDriveFileName,
                folderPath: drive.folderPath,
                driveFolders: drive.driveFolders,
                favoriteFolders: drive.favoriteFolders,
                newFolderName: drive.newFolderName,
                onClose: driveModals.closeSaveModal,
                onSave: () => {
                    void driveModals.handleFinalSave();
                },
                onAddFavorite: drive.handleAddFavoriteFolder,
                onRemoveFavorite: drive.handleRemoveFavoriteFolder,
                onGoToFavorite: favorite => drive.handleGoToFavorite(favorite, 'save'),
                onBreadcrumbClick: driveModals.handleSaveBreadcrumbClick,
                onFolderClick: driveModals.handleSaveFolderClick,
                onSaveFormatChange: drive.setSaveFormat,
                onFileNameInputChange: drive.setFileNameInput,
                onNewFolderNameChange: drive.setNewFolderName,
                onCreateFolder: () => {
                    void drive.handleCreateFolder();
                },
                onSetDefaultFolder: drive.handleSetDefaultFolder,
            }}
            history={{
                isOpen: recordState.isHistoryModalOpen,
                history: recordState.versionHistory,
                onClose: () => recordState.setIsHistoryModalOpen(false),
                onRestore: recordState.handleRestoreHistoryEntry,
            }}
            toast={toast}
            importInputRef={fileOperations.importInputRef}
            onImportFile={fileOperations.handleImportFile}
        />

        <AppWorkspace
            record={recordState.record}
            setRecord={recordState.setRecord}
            auth={{
                isSignedIn: auth.isSignedIn,
                isGisReady: auth.isGisReady,
                isGapiReady: auth.isGapiReady,
                isPickerApiReady: auth.isPickerApiReady,
                tokenClient: auth.tokenClient,
                userProfile: auth.userProfile,
                onSignIn: auth.handleSignIn,
                onSignOut: auth.handleSignOut,
                onChangeUser: auth.handleChangeUser,
            }}
            driveHeader={{
                isSaving: drive.isSaving,
                hasApiKey: !!settings.apiKey,
                onSaveToDrive: driveModals.openSaveModal,
                onOpenFromDrive: driveModals.handleOpenFromDrive,
                onDownloadJson: fileOperations.handleDownloadJson,
            }}
            editingHeader={{
                isEditing: recordState.isGlobalStructureEditing,
                onToggleEdit: toggleGlobalStructureEditing,
                isAdvancedEditing: editorUi.isAdvancedEditing,
                onToggleAdvancedEditing: () => editorUi.setIsAdvancedEditing(current => !current),
                isAiAssistantVisible: editorUi.isAiAssistantVisible,
                onToggleAiAssistant: () => editorUi.setIsAiAssistantVisible(current => !current),
                onToolbarCommand: handleToolbarCommand,
            }}
            saveHeader={{
                saveStatusLabel: editorUi.saveStatusLabel,
                lastSaveTime: editorUi.lastSaveTime,
                hasUnsavedChanges: recordState.hasUnsavedChanges,
                onQuickSave: fileOperations.handleManualSave,
                onOpenHistory: () => recordState.setIsHistoryModalOpen(true),
            }}
            hhrHeader={hhrHeader}
            templateId={recordState.record.templateId}
            onTemplateChange={handleTemplateChange}
            onAddClinicalUpdateSection={handleAddClinicalUpdateSection}
            onPrint={fileOperations.handlePrint}
            onOpenSettings={settings.openSettingsModal}
            onRestoreTemplate={handleRestoreAll}
            onOpenCartola={onOpenCartola}
            isEditing={recordState.isEditing}
            isGlobalStructureEditing={recordState.isGlobalStructureEditing}
            activeEditTarget={recordState.activeEditTarget}
            activateEditTarget={recordState.activateEditTarget}
            handleActivatePatientEdit={recordState.handleActivatePatientEdit}
            handleActivateSectionEdit={recordState.handleActivateSectionEdit}
            handlePatientFieldChange={recordState.handlePatientFieldChange}
            handlePatientLabelChange={recordState.handlePatientLabelChange}
            handleSectionContentChange={recordState.handleSectionContentChange}
            handleSectionTitleChange={recordState.handleSectionTitleChange}
            handleUpdateSectionMeta={recordState.handleUpdateSectionMeta}
            handleRemoveSection={recordState.handleRemoveSection}
            handleRemovePatientField={recordState.handleRemovePatientField}
            onAddPatientField={handleAddPatientField}
            onAddSection={handleAddSection}
            sheetZoom={editorUi.sheetZoom}
            aiAssistant={aiAssistantPanel}
            integrationPanel={hhrPanel}
        />
        {hhrModal}
    </>
);

export default AppShellContent;

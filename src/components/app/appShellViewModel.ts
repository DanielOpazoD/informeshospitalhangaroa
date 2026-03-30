import React from 'react';
import type { HeaderProps } from '../header/types';
import type { EditTarget } from '../../contexts/RecordContext';
import type {
    AsyncJobState,
    ClinicalRecord,
    ClinicalSectionData,
    DriveFolder,
    DriveSearchMode,
    FavoriteFolderEntry,
    RecentDriveFile,
    VersionHistoryEntry,
} from '../../types';
import type { ToastState } from '../../hooks/useToast';
import type { useAppSettings } from '../../hooks/useAppSettings';
import type { useDriveModals } from '../../hooks/useDriveModals';
import type { useEditorUiState } from '../../hooks/useEditorUiState';
import type { useFileOperations } from '../../hooks/useFileOperations';
import type { useAuth } from '../../contexts/AuthContext';
import type { useDrive } from '../../contexts/DriveContext';
import type { useRecordContext } from '../../contexts/RecordContext';

type ShellSettingsState = ReturnType<typeof useAppSettings>;
type ShellDriveModalsState = ReturnType<typeof useDriveModals>;
type ShellEditorUiState = ReturnType<typeof useEditorUiState>;
type ShellFileOperationsState = ReturnType<typeof useFileOperations>;
type ShellAuthState = ReturnType<typeof useAuth>;
type ShellDriveState = ReturnType<typeof useDrive>;

export type AppShellRecordState = Pick<
    ReturnType<typeof useRecordContext>,
    | 'record'
    | 'hasUnsavedChanges'
    | 'versionHistory'
    | 'canUndo'
    | 'canRedo'
    | 'isHistoryModalOpen'
    | 'setIsHistoryModalOpen'
    | 'handleRestoreHistoryEntry'
    | 'undo'
    | 'redo'
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
    | 'handleMedicoChange'
    | 'handleEspecialidadChange'
>;

export interface AppShellHandlers {
    toggleGlobalStructureEditing: () => void;
    handleTemplateChange: (id: string) => void;
    handleAddClinicalUpdateSection: () => void;
    handleRecordTitleChange: (title: string) => void;
    handleAddPatientField: () => void;
    handleAddSection: () => void;
    handleRestoreAll: () => void;
    handleToolbarCommand: (command: string) => void;
    onOpenCartola: () => void;
}

export interface AppShellPanels {
    aiAssistant: React.ReactNode;
    integrationPanel: React.ReactNode;
    hhrModal: React.ReactNode;
}

export interface AppShellContentProps {
    toast: ToastState | null;
    settings: ShellSettingsState;
    driveModals: ShellDriveModalsState;
    editorUi: ShellEditorUiState;
    fileOperations: ShellFileOperationsState;
    auth: ShellAuthState;
    drive: ShellDriveState;
    recordState: AppShellRecordState;
    handlers: AppShellHandlers;
    panels: AppShellPanels;
}

export interface AppModalsProps {
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
        driveSearchJob: AsyncJobState;
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

type PatientEditTarget = Extract<NonNullable<EditTarget>, { type: 'patient-section-title' | 'patient-field-label' }>;
type SectionEditTarget = Extract<NonNullable<EditTarget>, { type: 'section-title' }>;

export interface AppWorkspaceProps {
    record: ClinicalRecord;
    header: Pick<
        HeaderProps,
        | 'templateId'
        | 'onTemplateChange'
        | 'onAddClinicalUpdateSection'
        | 'onPrint'
        | 'onOpenSettings'
        | 'onRestoreTemplate'
        | 'onOpenCartolaApp'
        | 'auth'
        | 'drive'
        | 'editing'
        | 'save'
    >;
    editor: {
        isEditing: boolean;
        isGlobalStructureEditing: boolean;
        activeEditTarget: EditTarget;
        activateEditTarget: (target: { type: 'record-title' }) => void;
        handleActivatePatientEdit: (target: { type: 'patient-section-title' | 'patient-field-label'; index?: number }) => void;
        handleActivateSectionEdit: (target: { type: 'section-title'; index: number }) => void;
        handlePatientFieldChange: (index: number, value: string) => void;
        handlePatientLabelChange: (index: number, label: string) => void;
        handleSectionContentChange: (index: number, content: string) => void;
        handleSectionTitleChange: (index: number, title: string) => void;
        handleUpdateSectionMeta: (index: number, meta: Partial<ClinicalSectionData>) => void;
        handleRemoveSection: (index: number) => void;
        handleRemovePatientField: (index: number) => void;
        handleMedicoChange: (value: string) => void;
        handleEspecialidadChange: (value: string) => void;
        onRecordTitleChange: (title: string) => void;
        onAddPatientField: () => void;
        onAddSection: () => void;
        sheetZoom: number;
    };
    panels: {
        aiAssistant: React.ReactNode;
        integrationPanel: React.ReactNode;
    };
}

export const getPatientEditTarget = (activeEditTarget: EditTarget): PatientEditTarget | null =>
    activeEditTarget?.type === 'patient-section-title' || activeEditTarget?.type === 'patient-field-label'
        ? activeEditTarget
        : null;

export const getSectionEditTarget = (activeEditTarget: EditTarget, index: number): SectionEditTarget | null =>
    activeEditTarget?.type === 'section-title' && activeEditTarget.index === index ? activeEditTarget : null;

export const buildAppModalsProps = ({
    toast,
    settings,
    driveModals,
    drive,
    recordState,
    fileOperations,
}: AppShellContentProps): AppModalsProps => ({
    settings: {
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
    },
    openModal: {
        isOpen: driveModals.isOpenModalOpen,
        isDriveLoading: drive.isDriveLoading,
        folderPath: drive.folderPath,
        driveFolders: drive.driveFolders,
        driveJsonFiles: drive.driveJsonFiles,
        driveSearchTerm: drive.driveSearchTerm,
        driveDateFrom: drive.driveDateFrom,
        driveDateTo: drive.driveDateTo,
        driveContentTerm: drive.driveContentTerm,
        driveSearchMode: drive.driveSearchMode,
        driveSearchWarnings: drive.driveSearchWarnings,
        isDriveSearchPartial: drive.isDriveSearchPartial,
        deepSearchStatus: drive.deepSearchStatus,
        driveSearchJob: drive.driveSearchJob,
        favoriteFolders: drive.favoriteFolders,
        recentFiles: drive.recentFiles,
        formatDriveDate: drive.formatDriveDate,
        onClose: () => driveModals.setIsOpenModalOpen(false),
        onSearch: () => {
            void drive.handleSearchInDrive();
        },
        onCancelSearch: drive.cancelDriveSearch,
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
        onSearchModeChange: drive.setDriveSearchMode,
    },
    saveModal: {
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
    },
    history: {
        isOpen: recordState.isHistoryModalOpen,
        history: recordState.versionHistory,
        onClose: () => recordState.setIsHistoryModalOpen(false),
        onRestore: recordState.handleRestoreHistoryEntry,
    },
    toast,
    importInputRef: fileOperations.importInputRef,
    onImportFile: fileOperations.handleImportFile,
});

export const buildAppWorkspaceProps = ({
    editorUi,
    fileOperations,
    auth,
    settings,
    driveModals,
    drive,
    recordState,
    handlers,
    panels,
}: AppShellContentProps): AppWorkspaceProps => ({
    record: recordState.record,
    header: {
        templateId: recordState.record.templateId,
        onTemplateChange: handlers.handleTemplateChange,
        onAddClinicalUpdateSection: handlers.handleAddClinicalUpdateSection,
        onPrint: fileOperations.handlePrint,
        onOpenSettings: settings.openSettingsModal,
        onRestoreTemplate: handlers.handleRestoreAll,
        onOpenCartolaApp: handlers.onOpenCartola,
        auth: {
            isSignedIn: auth.isSignedIn,
            isGisReady: auth.isGisReady,
            isGapiReady: auth.isGapiReady,
            isPickerApiReady: auth.isPickerApiReady,
            tokenClient: auth.tokenClient,
            userProfile: auth.userProfile,
            onSignIn: auth.handleSignIn,
            onSignOut: auth.handleSignOut,
            onChangeUser: auth.handleChangeUser,
        },
        drive: {
            isSaving: drive.isSaving,
            hasApiKey: !!settings.apiKey,
            onSaveToDrive: driveModals.openSaveModal,
            onOpenFromDrive: driveModals.handleOpenFromDrive,
            onDownloadJson: fileOperations.handleDownloadJson,
        },
        editing: {
            isEditing: recordState.isGlobalStructureEditing,
            onToggleEdit: handlers.toggleGlobalStructureEditing,
            isAdvancedEditing: editorUi.isAdvancedEditing,
            onToggleAdvancedEditing: () => editorUi.setIsAdvancedEditing(current => !current),
            isAiAssistantVisible: editorUi.isAiAssistantVisible,
            onToggleAiAssistant: () => editorUi.setIsAiAssistantVisible(current => !current),
            onToolbarCommand: handlers.handleToolbarCommand,
        },
        save: {
            saveStatusLabel: editorUi.saveStatusLabel,
            lastSaveTime: editorUi.lastSaveTime,
            hasUnsavedChanges: recordState.hasUnsavedChanges,
            canUndo: recordState.canUndo,
            canRedo: recordState.canRedo,
            onQuickSave: fileOperations.handleManualSave,
            onOpenHistory: () => recordState.setIsHistoryModalOpen(true),
            onUndo: recordState.undo,
            onRedo: recordState.redo,
        },
    },
    editor: {
        isEditing: recordState.isEditing,
        isGlobalStructureEditing: recordState.isGlobalStructureEditing,
        activeEditTarget: recordState.activeEditTarget,
        activateEditTarget: recordState.activateEditTarget,
        handleActivatePatientEdit: recordState.handleActivatePatientEdit,
        handleActivateSectionEdit: recordState.handleActivateSectionEdit,
        handlePatientFieldChange: recordState.handlePatientFieldChange,
        handlePatientLabelChange: recordState.handlePatientLabelChange,
        handleSectionContentChange: recordState.handleSectionContentChange,
        handleSectionTitleChange: recordState.handleSectionTitleChange,
        handleUpdateSectionMeta: recordState.handleUpdateSectionMeta,
        handleRemoveSection: recordState.handleRemoveSection,
        handleRemovePatientField: recordState.handleRemovePatientField,
        handleMedicoChange: recordState.handleMedicoChange,
        handleEspecialidadChange: recordState.handleEspecialidadChange,
        onRecordTitleChange: handlers.handleRecordTitleChange,
        onAddPatientField: handlers.handleAddPatientField,
        onAddSection: handlers.handleAddSection,
        sheetZoom: editorUi.sheetZoom,
    },
    panels: {
        aiAssistant: panels.aiAssistant,
        integrationPanel: panels.integrationPanel,
    },
});

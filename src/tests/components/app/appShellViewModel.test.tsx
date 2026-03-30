import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import {
    buildAppModalsProps,
    buildAppWorkspaceProps,
    getPatientEditTarget,
    getSectionEditTarget,
    type AppShellContentProps,
} from '../../../components/app/appShellViewModel';

const createShellProps = (): AppShellContentProps => {
    const settingsClear = vi.fn().mockResolvedValue(undefined);
    const driveSearch = vi.fn().mockResolvedValue(undefined);
    const fileOpen = vi.fn().mockResolvedValue(undefined);
    const finalSave = vi.fn().mockResolvedValue(undefined);
    const createFolder = vi.fn().mockResolvedValue(undefined);

    return {
        toast: { type: 'success', message: 'ok' },
        settings: {
            isSettingsModalOpen: true,
            tempApiKey: 'api',
            tempClientId: 'client',
            tempAiApiKey: 'ai',
            tempAiProjectId: 'project',
            tempAiModel: 'gemini',
            apiKey: 'configured-api',
            aiApiKey: 'configured-ai',
            aiProjectId: 'configured-project',
            aiModel: 'configured-model',
            setAiModel: vi.fn(),
            setTempApiKey: vi.fn(),
            setTempClientId: vi.fn(),
            setTempAiApiKey: vi.fn(),
            setTempAiProjectId: vi.fn(),
            setTempAiModel: vi.fn(),
            showApiKey: true,
            showAiApiKey: false,
            toggleShowApiKey: vi.fn(),
            toggleShowAiApiKey: vi.fn(),
            saveSettings: vi.fn(),
            openSettingsModal: vi.fn(),
            closeSettingsModal: vi.fn(),
            clearSettings: settingsClear,
        },
        driveModals: {
            isOpenModalOpen: true,
            setIsOpenModalOpen: vi.fn(),
            isSaveModalOpen: true,
            openSaveModal: vi.fn(),
            closeSaveModal: vi.fn(),
            handleOpenFromDrive: vi.fn(),
            handleOpenModalBreadcrumbClick: vi.fn(),
            handleOpenModalFolderClick: vi.fn(),
            handleFileOpen: fileOpen,
            handleSaveBreadcrumbClick: vi.fn(),
            handleSaveFolderClick: vi.fn(),
            handleFinalSave: finalSave,
        },
        editorUi: {
            saveStatusLabel: 'Guardado local',
            lastSaveTime: 'Hace 1 min.',
            sheetZoom: 1.25,
            setSheetZoom: vi.fn(),
            isAdvancedEditing: false,
            setIsAdvancedEditing: vi.fn(),
            isAiAssistantVisible: true,
            setIsAiAssistantVisible: vi.fn(),
            aiPanelWidth: 360,
            setAiPanelWidth: vi.fn(),
        },
        fileOperations: {
            defaultDriveFileName: 'reporte',
            importInputRef: React.createRef<HTMLInputElement>(),
            handleImportFile: vi.fn(),
            handleDownloadJson: vi.fn(),
            handleManualSave: vi.fn(),
            handlePrint: vi.fn(),
        },
        auth: {
            isSignedIn: true,
            isGisReady: true,
            isGapiReady: true,
            isPickerApiReady: true,
            profileJob: { operation: 'google_profile', status: 'idle', message: null, updatedAt: null },
            tokenClient: null,
            userProfile: null,
            handleSignIn: vi.fn(),
            handleSignOut: vi.fn(),
            handleChangeUser: vi.fn(),
        },
        drive: {
            isDriveLoading: false,
            isSaving: false,
            folderPath: [{ id: 'root', name: 'Mi unidad' }],
            driveFolders: [{ id: 'folder-1', name: 'Informes' }],
            driveJsonFiles: [{ id: 'file-1', name: 'a.json' }],
            driveSearchTerm: '',
            setDriveSearchTerm: vi.fn(),
            driveDateFrom: '',
            setDriveDateFrom: vi.fn(),
            driveDateTo: '',
            setDriveDateTo: vi.fn(),
            driveContentTerm: '',
            setDriveContentTerm: vi.fn(),
            driveSearchMode: 'metadata',
            setDriveSearchMode: vi.fn(),
            driveSearchWarnings: [],
            isDriveSearchPartial: false,
            deepSearchStatus: '',
            driveSearchJob: { operation: 'drive_deep_search', status: 'idle', message: null, updatedAt: null },
            favoriteFolders: [],
            recentFiles: [],
            selectedFolderId: 'root',
            formatDriveDate: vi.fn().mockReturnValue('19/03/2026'),
            fetchDriveFolders: vi.fn().mockResolvedValue(undefined),
            fetchFolderContents: vi.fn().mockResolvedValue(undefined),
            cancelDriveSearch: vi.fn(),
            clearDriveSearch: vi.fn(),
            handleSearchInDrive: driveSearch,
            handleAddFavoriteFolder: vi.fn(),
            handleRemoveFavoriteFolder: vi.fn(),
            handleGoToFavorite: vi.fn(),
            addRecentFile: vi.fn(),
            fileNameInput: 'archivo',
            setFolderPath: vi.fn(),
            setFileNameInput: vi.fn(),
            saveFormat: 'json',
            setSaveFormat: vi.fn(),
            newFolderName: '',
            setNewFolderName: vi.fn(),
            handleCreateFolder: createFolder,
            handleSetDefaultFolder: vi.fn(),
            openJsonFileFromDrive: vi.fn().mockResolvedValue(null),
            saveToDrive: vi.fn().mockResolvedValue(true),
        },
        recordState: {
            record: {
                version: 'v14',
                templateId: '2',
                title: 'Ficha',
                patientFields: [],
                sections: [{ id: 'sec-1', title: 'Diagnóstico', content: 'Contenido' }],
                medico: '',
                especialidad: '',
            },
            hasUnsavedChanges: true,
            versionHistory: [],
            canUndo: true,
            canRedo: false,
            isHistoryModalOpen: false,
            setIsHistoryModalOpen: vi.fn(),
            handleRestoreHistoryEntry: vi.fn(),
            undo: vi.fn(),
            redo: vi.fn(),
            isEditing: true,
            isGlobalStructureEditing: false,
            activeEditTarget: { type: 'section-title', index: 0 },
            activateEditTarget: vi.fn(),
            handleActivatePatientEdit: vi.fn(),
            handleActivateSectionEdit: vi.fn(),
            handlePatientFieldChange: vi.fn(),
            handlePatientLabelChange: vi.fn(),
            handleSectionContentChange: vi.fn(),
            handleSectionTitleChange: vi.fn(),
            handleUpdateSectionMeta: vi.fn(),
            handleRemoveSection: vi.fn(),
            handleRemovePatientField: vi.fn(),
            handleMedicoChange: vi.fn(),
            handleEspecialidadChange: vi.fn(),
        },
        handlers: {
            toggleGlobalStructureEditing: vi.fn(),
            handleTemplateChange: vi.fn(),
            handleAddClinicalUpdateSection: vi.fn(),
            handleRecordTitleChange: vi.fn(),
            handleAddPatientField: vi.fn(),
            handleAddSection: vi.fn(),
            handleRestoreAll: vi.fn(),
            handleToolbarCommand: vi.fn(),
            onOpenCartola: vi.fn(),
        },
        panels: {
            aiAssistant: <div>assistant</div>,
            integrationPanel: <div>integration</div>,
            hhrModal: <div>hhr-modal</div>,
        },
    };
};

describe('appShellViewModel', () => {
    it('construye props de modales con side effects envueltos', async () => {
        const props = createShellProps();
        const modals = buildAppModalsProps(props);

        modals.settings.onClearCredentials();
        modals.openModal.onSearch();
        modals.openModal.onFileOpen({ id: 'file-77', name: 'desde-mock.json' });
        modals.saveModal.onSave();
        modals.saveModal.onCreateFolder();
        await Promise.resolve();

        expect(props.settings.clearSettings).toHaveBeenCalled();
        expect(props.drive.handleSearchInDrive).toHaveBeenCalled();
        expect(props.driveModals.handleFileOpen).toHaveBeenCalledWith({ id: 'file-77', name: 'desde-mock.json' });
        expect(props.driveModals.handleFinalSave).toHaveBeenCalled();
        expect(props.drive.handleCreateFolder).toHaveBeenCalled();
        expect(modals.saveModal.defaultDriveFileName).toBe('reporte');
    });

    it('construye props del workspace agrupando header, editor y paneles', () => {
        const props = createShellProps();
        const workspace = buildAppWorkspaceProps(props);

        workspace.header.editing.onToggleAdvancedEditing();
        workspace.header.editing.onToggleAiAssistant();
        workspace.header.save.onOpenHistory();

        expect(props.editorUi.setIsAdvancedEditing).toHaveBeenCalledWith(expect.any(Function));
        expect(props.editorUi.setIsAiAssistantVisible).toHaveBeenCalledWith(expect.any(Function));
        expect(props.recordState.setIsHistoryModalOpen).toHaveBeenCalledWith(true);
        expect(workspace.header.drive.hasApiKey).toBe(true);
        expect(workspace.editor.sheetZoom).toBe(1.25);
        expect(workspace.panels.integrationPanel).toBeTruthy();
    });

    it('filtra targets de edición según el bloque que los consume', () => {
        expect(getPatientEditTarget({ type: 'patient-field-label', index: 2 })).toEqual({
            type: 'patient-field-label',
            index: 2,
        });
        expect(getPatientEditTarget({ type: 'record-title' })).toBeNull();
        expect(getSectionEditTarget({ type: 'section-title', index: 1 }, 1)).toEqual({
            type: 'section-title',
            index: 1,
        });
        expect(getSectionEditTarget({ type: 'section-title', index: 1 }, 0)).toBeNull();
    });
});

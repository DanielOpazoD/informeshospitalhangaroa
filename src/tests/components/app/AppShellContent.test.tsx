import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AppShellContent from '../../../components/app/AppShellContent';

let appModalsProps: React.ComponentProps<typeof import('../../../components/app/AppModals').default> | null = null;
let appWorkspaceProps: React.ComponentProps<typeof import('../../../components/app/AppWorkspace').default> | null = null;

vi.mock('../../../components/app/AppModals', () => ({
    default: (props: React.ComponentProps<typeof import('../../../components/app/AppModals').default>) => {
        appModalsProps = props;
        return (
            <div>
                <button onClick={() => props.settings.onClearCredentials()}>clear-settings</button>
                <button onClick={() => props.openModal.onSearch()}>search-drive</button>
                <button onClick={() => props.openModal.onClose()}>close-open-modal</button>
                <button onClick={() => props.openModal.onFileOpen({ id: 'file-77', name: 'desde-mock.json' })}>open-file</button>
                <button onClick={() => props.saveModal.onSave()}>final-save</button>
                <button onClick={() => props.history.onClose()}>close-history</button>
            </div>
        );
    },
}));

vi.mock('../../../components/app/AppWorkspace', () => ({
    default: (props: React.ComponentProps<typeof import('../../../components/app/AppWorkspace').default>) => {
        appWorkspaceProps = props;
        return (
            <div>
                <button onClick={props.onOpenSettings}>open-settings</button>
                <button onClick={props.driveHeader.onOpenFromDrive}>open-drive</button>
                <button onClick={props.driveHeader.onSaveToDrive}>save-drive</button>
                <button onClick={props.saveHeader.onOpenHistory}>open-history</button>
                <button onClick={props.saveHeader.onUndo}>undo</button>
                <button onClick={props.saveHeader.onRedo}>redo</button>
                <button onClick={() => props.editingHeader.onToolbarCommand('bold')}>toolbar-command</button>
                <div>workspace</div>
            </div>
        );
    },
}));

const createSpies = () => {
    const clearSettings = vi.fn().mockResolvedValue(undefined);
    const handleSearchInDrive = vi.fn().mockResolvedValue(undefined);
    const handleFileOpen = vi.fn().mockResolvedValue(undefined);
    const handleFinalSave = vi.fn().mockResolvedValue(undefined);
    const setIsOpenModalOpen = vi.fn();
    const openSaveModal = vi.fn();
    const openSettingsModal = vi.fn();
    const setIsHistoryModalOpen = vi.fn();
    const handleToolbarCommand = vi.fn();
    const undo = vi.fn();
    const redo = vi.fn();

    const props: React.ComponentProps<typeof AppShellContent> = {
        toast: { type: 'success', message: 'ok' },
        settings: {
            isSettingsModalOpen: true,
            tempApiKey: 'api',
            tempClientId: 'client',
            tempAiApiKey: 'ai',
            tempAiProjectId: 'project',
            tempAiModel: 'gemini',
            showApiKey: true,
            showAiApiKey: false,
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
            toggleShowApiKey: vi.fn(),
            toggleShowAiApiKey: vi.fn(),
            saveSettings: vi.fn(),
            openSettingsModal,
            closeSettingsModal: vi.fn(),
            clearSettings,
        },
        driveModals: {
            isOpenModalOpen: true,
            setIsOpenModalOpen,
            isSaveModalOpen: true,
            openSaveModal,
            closeSaveModal: vi.fn(),
            handleOpenFromDrive: vi.fn(),
            handleOpenModalBreadcrumbClick: vi.fn(),
            handleOpenModalFolderClick: vi.fn(),
            handleFileOpen,
            handleSaveBreadcrumbClick: vi.fn(),
            handleSaveFolderClick: vi.fn(),
            handleFinalSave,
        },
        editorUi: {
            saveStatusLabel: 'Guardado',
            lastSaveTime: 'hace 1 minuto',
            sheetZoom: 1,
            setSheetZoom: vi.fn(),
            isAdvancedEditing: false,
            setIsAdvancedEditing: vi.fn(),
            isAiAssistantVisible: false,
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
            handleSearchInDrive,
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
            handleCreateFolder: vi.fn().mockResolvedValue(undefined),
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
                sections: [],
                medico: '',
                especialidad: '',
            },
            hasUnsavedChanges: true,
            versionHistory: [],
            canUndo: true,
            canRedo: true,
            isHistoryModalOpen: false,
            setIsHistoryModalOpen,
            handleRestoreHistoryEntry: vi.fn(),
            undo,
            redo,
            isEditing: false,
            isGlobalStructureEditing: false,
            activeEditTarget: null,
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
        toggleGlobalStructureEditing: vi.fn(),
        handleTemplateChange: vi.fn(),
        handleAddClinicalUpdateSection: vi.fn(),
        handleRecordTitleChange: vi.fn(),
        handleAddPatientField: vi.fn(),
        handleAddSection: vi.fn(),
        handleRestoreAll: vi.fn(),
        handleToolbarCommand,
        onOpenCartola: vi.fn(),
        aiAssistantPanel: <div>assistant</div>,
        hhrPanel: <div>hhr-panel</div>,
        hhrModal: <div>hhr-modal</div>,
    };

    return {
        props,
        spies: {
            clearSettings,
            handleSearchInDrive,
            handleFileOpen,
            handleFinalSave,
            setIsOpenModalOpen,
            openSaveModal,
            openSettingsModal,
            setIsHistoryModalOpen,
            handleToolbarCommand,
            undo,
            redo,
        },
    };
};

describe('AppShellContent', () => {
    it('conecta AppModals con settings, drive y record state', async () => {
        const { props, spies } = createSpies();
        render(<AppShellContent {...props} />);

        expect(screen.getByText('workspace')).toBeTruthy();
        expect(screen.getByText('hhr-modal')).toBeTruthy();
        expect(appModalsProps?.settings.isSettingsModalOpen).toBe(true);
        expect(appModalsProps?.openModal.isOpen).toBe(true);
        expect(appModalsProps?.saveModal.isOpen).toBe(true);

        fireEvent.click(screen.getByText('clear-settings'));
        fireEvent.click(screen.getByText('search-drive'));
        fireEvent.click(screen.getByText('close-open-modal'));
        fireEvent.click(screen.getByText('open-file'));
        fireEvent.click(screen.getByText('final-save'));
        fireEvent.click(screen.getByText('close-history'));

        await Promise.resolve();

        expect(spies.clearSettings).toHaveBeenCalled();
        expect(spies.handleSearchInDrive).toHaveBeenCalled();
        expect(spies.setIsOpenModalOpen).toHaveBeenCalledWith(false);
        expect(spies.handleFileOpen).toHaveBeenCalledWith({ id: 'file-77', name: 'desde-mock.json' });
        expect(spies.handleFinalSave).toHaveBeenCalled();
        expect(spies.setIsHistoryModalOpen).toHaveBeenCalledWith(false);
    });

    it('conecta AppWorkspace con las acciones expuestas por el shell', () => {
        const { props, spies } = createSpies();
        render(<AppShellContent {...props} />);

        expect(appWorkspaceProps?.driveHeader.hasApiKey).toBe(true);
        expect(appWorkspaceProps?.saveHeader.hasUnsavedChanges).toBe(true);
        expect(appWorkspaceProps?.integrationPanel).toBeTruthy();

        fireEvent.click(screen.getByText('open-settings'));
        fireEvent.click(screen.getByText('open-drive'));
        fireEvent.click(screen.getByText('save-drive'));
        fireEvent.click(screen.getByText('open-history'));
        fireEvent.click(screen.getByText('undo'));
        fireEvent.click(screen.getByText('redo'));
        fireEvent.click(screen.getByText('toolbar-command'));

        expect(spies.openSettingsModal).toHaveBeenCalled();
        expect(props.driveModals.handleOpenFromDrive).toHaveBeenCalled();
        expect(spies.openSaveModal).toHaveBeenCalled();
        expect(spies.setIsHistoryModalOpen).toHaveBeenCalledWith(true);
        expect(spies.undo).toHaveBeenCalled();
        expect(spies.redo).toHaveBeenCalled();
        expect(spies.handleToolbarCommand).toHaveBeenCalled();
    });
});

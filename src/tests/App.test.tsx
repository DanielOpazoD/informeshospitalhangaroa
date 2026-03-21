import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';

const mockState = vi.hoisted(() => ({
    appShellContentProps: null as React.ComponentProps<typeof import('../components/app/AppShellContent').default> | null,
    authProviderProps: [] as Array<{ clientId: string }>,
    driveProviderCalls: 0,
    recordProviderCalls: 0,
    toolbarCommand: vi.fn(),
    showToast: vi.fn(),
}));

const buildAppShellControllerMock = () => ({
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
        driveFolders: [],
        driveJsonFiles: [],
        folderPath: [{ id: 'root', name: 'Mi unidad' }],
        favoriteFolders: [],
        recentFiles: [],
        driveSearchTerm: '',
        driveDateFrom: '',
        driveDateTo: '',
        driveContentTerm: '',
        driveSearchMode: 'metadata',
        driveSearchWarnings: [],
        isDriveSearchPartial: false,
        deepSearchStatus: '',
        driveSearchJob: { operation: 'drive_deep_search', status: 'idle', message: null, updatedAt: null },
        selectedFolderId: 'root',
        newFolderName: '',
        fileNameInput: '',
        saveFormat: 'json',
        fetchDriveFolders: vi.fn().mockResolvedValue(undefined),
        fetchFolderContents: vi.fn().mockResolvedValue(undefined),
        handleAddFavoriteFolder: vi.fn(),
        handleRemoveFavoriteFolder: vi.fn(),
        handleGoToFavorite: vi.fn(),
        handleSearchInDrive: vi.fn().mockResolvedValue(undefined),
        cancelDriveSearch: vi.fn(),
        clearDriveSearch: vi.fn(),
        addRecentFile: vi.fn(),
        formatDriveDate: vi.fn().mockReturnValue('19/03/2026'),
        handleCreateFolder: vi.fn().mockResolvedValue(undefined),
        handleSetDefaultFolder: vi.fn(),
        openJsonFileFromDrive: vi.fn().mockResolvedValue(null),
        saveToDrive: vi.fn().mockResolvedValue(true),
        setFolderPath: vi.fn(),
        setSaveFormat: vi.fn(),
        setFileNameInput: vi.fn(),
        setNewFolderName: vi.fn(),
        setDriveSearchTerm: vi.fn(),
        setDriveDateFrom: vi.fn(),
        setDriveDateTo: vi.fn(),
        setDriveContentTerm: vi.fn(),
        setDriveSearchMode: vi.fn(),
    },
    settings: {
        apiKey: 'api-key',
        aiApiKey: 'ai-api-key',
        aiProjectId: 'project-1',
        aiModel: 'gemini-1.5-flash-latest',
        setAiModel: vi.fn(),
        isSettingsModalOpen: false,
        tempApiKey: '',
        tempClientId: '',
        tempAiApiKey: '',
        tempAiProjectId: '',
        tempAiModel: '',
        setTempApiKey: vi.fn(),
        setTempClientId: vi.fn(),
        setTempAiApiKey: vi.fn(),
        setTempAiProjectId: vi.fn(),
        setTempAiModel: vi.fn(),
        showApiKey: false,
        showAiApiKey: false,
        toggleShowApiKey: vi.fn(),
        toggleShowAiApiKey: vi.fn(),
        openSettingsModal: vi.fn(),
        closeSettingsModal: vi.fn(),
        saveSettings: vi.fn(),
        clearSettings: vi.fn().mockResolvedValue(undefined),
    },
    driveModals: {
        isSaveModalOpen: false,
        isOpenModalOpen: false,
        setIsOpenModalOpen: vi.fn(),
        openSaveModal: vi.fn(),
        closeSaveModal: vi.fn(),
        handleOpenFromDrive: vi.fn(),
        handleOpenModalBreadcrumbClick: vi.fn(),
        handleOpenModalFolderClick: vi.fn(),
        handleFileOpen: vi.fn().mockResolvedValue(undefined),
        handleSaveBreadcrumbClick: vi.fn(),
        handleSaveFolderClick: vi.fn(),
        handleFinalSave: vi.fn().mockResolvedValue(undefined),
    },
    editorUi: {
        isAdvancedEditing: false,
        setIsAdvancedEditing: vi.fn(),
        isAiAssistantVisible: true,
        setIsAiAssistantVisible: vi.fn(),
        sheetZoom: 1,
        setSheetZoom: vi.fn(),
        aiPanelWidth: 420,
        setAiPanelWidth: vi.fn(),
        saveStatusLabel: 'Guardado local',
        lastSaveTime: 'Hace 1 min.',
    },
    fileOperations: {
        defaultDriveFileName: 'informe',
        importInputRef: React.createRef<HTMLInputElement>(),
        handleImportFile: vi.fn(),
        handleDownloadJson: vi.fn(),
        handleManualSave: vi.fn(),
        handlePrint: vi.fn(),
    },
    aiAssistant: {
        resolvedAiApiKey: 'ai-api-key',
        resolvedAiProjectId: 'project-1',
        allowAiAutoSelection: false,
        resolvedAiModel: 'gemini-1.5-flash-latest',
        fullRecordContext: 'context',
        aiSections: [],
        aiConversationKey: 'conv-1',
        handleAutoSelectAiModel: vi.fn(),
    },
    hhrController: {
        hhrHeader: {
            isEnabled: true,
            canSave: true,
            isSaving: false,
            disabledReason: undefined,
            onSaveToHhr: vi.fn(),
        },
        hhrPanel: {
            isConfigured: true,
            missingEnvKeys: [],
            isAuthLoading: false,
            user: null,
            censusDateKey: '2026-03-20',
            censusCount: 0,
            isCensusLoading: false,
            censusError: null,
            selectedPatient: null,
            lastSyncLabel: null,
            saveJob: { operation: 'hhr_save', status: 'idle', message: null, updatedAt: null },
            onSignIn: vi.fn(),
            onSignOut: vi.fn(),
            onOpenCensusModal: vi.fn(),
            onClearSelectedPatient: vi.fn(),
        },
        hhrModal: {
            isOpen: false,
            isLoading: false,
            error: null,
            patients: [],
            onClose: vi.fn(),
            onSelectPatient: vi.fn(),
        },
    },
    recordState: {
        record: {
            version: 'v14',
            templateId: '2',
            title: 'Informe clínico',
            patientFields: [{ id: 'nombre', label: 'Nombre', value: 'Jane Roe', type: 'text' }],
            sections: [{ id: 'sec-1', title: 'Diagnóstico', content: 'Contenido' }],
            medico: '',
            especialidad: '',
        },
        hasUnsavedChanges: false,
        versionHistory: [],
        canUndo: false,
        canRedo: false,
        isHistoryModalOpen: false,
        setIsHistoryModalOpen: vi.fn(),
        handleRestoreHistoryEntry: vi.fn(),
        undo: vi.fn(),
        redo: vi.fn(),
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
    handlers: {
        toggleGlobalStructureEditing: vi.fn(),
        handleTemplateChange: vi.fn(),
        handleAddClinicalUpdateSection: vi.fn(),
        handleRecordTitleChange: vi.fn(),
        handleAddPatientField: vi.fn(),
        handleAddSection: vi.fn(),
        handleRestoreAll: vi.fn(),
        handleToolbarCommand: mockState.toolbarCommand,
    },
});

vi.mock('../components/app/AppShellContent', () => ({
    default: (props: React.ComponentProps<typeof import('../components/app/AppShellContent').default>) => {
        mockState.appShellContentProps = props;
        return (
            <div>
                <button onClick={props.onOpenCartola}>open-cartola-route</button>
                <div>app-shell</div>
            </div>
        );
    },
}));

vi.mock('../components/CartolaMedicamentosView', () => ({
    default: ({ onBack }: { onBack: () => void }) => (
        <div>
            <button onClick={onBack}>cartola-back</button>
            <div>cartola-view</div>
        </div>
    ),
}));

vi.mock('../components/AIAssistant', () => ({
    default: () => <div>ai-assistant</div>,
}));

vi.mock('../hooks/useAppShellController', () => ({
    useAppShellController: () => buildAppShellControllerMock(),
}));

vi.mock('../contexts/AuthContext', () => ({
    AuthProvider: ({ children, clientId }: { children: React.ReactNode; clientId: string }) => {
        mockState.authProviderProps.push({ clientId });
        return <>{children}</>;
    },
    useAuth: () => ({
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
    }),
}));

vi.mock('../contexts/DriveContext', () => ({
    DriveProvider: ({ children }: { children: React.ReactNode }) => {
        mockState.driveProviderCalls += 1;
        return <>{children}</>;
    },
    useDrive: () => ({
        isDriveLoading: false,
        isSaving: false,
        driveFolders: [],
        driveJsonFiles: [],
        folderPath: [{ id: 'root', name: 'Mi unidad' }],
        favoriteFolders: [],
        recentFiles: [],
        driveSearchTerm: '',
        driveDateFrom: '',
        driveDateTo: '',
        driveContentTerm: '',
        driveSearchMode: 'metadata',
        driveSearchWarnings: [],
        isDriveSearchPartial: false,
        deepSearchStatus: '',
        driveSearchJob: { operation: 'drive_deep_search', status: 'idle', message: null, updatedAt: null },
        selectedFolderId: 'root',
        newFolderName: '',
        fileNameInput: '',
        saveFormat: 'json',
        fetchDriveFolders: vi.fn().mockResolvedValue(undefined),
        fetchFolderContents: vi.fn().mockResolvedValue(undefined),
        handleAddFavoriteFolder: vi.fn(),
        handleRemoveFavoriteFolder: vi.fn(),
        handleGoToFavorite: vi.fn(),
        handleSearchInDrive: vi.fn().mockResolvedValue(undefined),
        cancelDriveSearch: vi.fn(),
        clearDriveSearch: vi.fn(),
        addRecentFile: vi.fn(),
        formatDriveDate: vi.fn().mockReturnValue('19/03/2026'),
        handleCreateFolder: vi.fn().mockResolvedValue(undefined),
        handleSetDefaultFolder: vi.fn(),
        openJsonFileFromDrive: vi.fn().mockResolvedValue(null),
        saveToDrive: vi.fn().mockResolvedValue(true),
        setFolderPath: vi.fn(),
        setSaveFormat: vi.fn(),
        setFileNameInput: vi.fn(),
        setNewFolderName: vi.fn(),
        setDriveSearchTerm: vi.fn(),
        setDriveDateFrom: vi.fn(),
        setDriveDateTo: vi.fn(),
        setDriveContentTerm: vi.fn(),
        setDriveSearchMode: vi.fn(),
    }),
}));

vi.mock('../contexts/RecordContext', () => ({
    RecordProvider: ({ children }: { children: React.ReactNode }) => {
        mockState.recordProviderCalls += 1;
        return <>{children}</>;
    },
    useRecordContext: () => ({
        record: {
            version: 'v14',
            templateId: '2',
            title: 'Informe clínico',
            patientFields: [{ id: 'nombre', label: 'Nombre', value: 'Jane Roe', type: 'text' }],
            sections: [{ id: 'sec-1', title: 'Diagnóstico', content: 'Contenido' }],
            medico: '',
            especialidad: '',
        },
        setRecord: vi.fn(),
        dispatchRecordCommand: vi.fn().mockReturnValue({
            ok: true,
            record: {
                version: 'v14',
                templateId: '2',
                title: 'Informe clínico',
                patientFields: [{ id: 'nombre', label: 'Nombre', value: 'Jane Roe', type: 'text' }],
                sections: [{ id: 'sec-1', title: 'Diagnóstico', content: 'Contenido' }],
                medico: '',
                especialidad: '',
            },
            warnings: [],
            changed: true,
        }),
        lastLocalSave: 123,
        hasUnsavedChanges: false,
        setHasUnsavedChanges: vi.fn(),
        versionHistory: [],
        canUndo: false,
        canRedo: false,
        isHistoryModalOpen: false,
        setIsHistoryModalOpen: vi.fn(),
        saveDraft: vi.fn(),
        handleRestoreHistoryEntry: vi.fn(),
        undo: vi.fn(),
        redo: vi.fn(),
        markRecordAsReplaced: vi.fn(),
        workflowState: { status: 'idle', hasUnsavedChanges: false, lastError: null },
        dispatchWorkflow: vi.fn(),
        isEditing: false,
        setIsEditing: vi.fn(),
        activeEditTarget: null,
        setActiveEditTarget: vi.fn(),
        isGlobalStructureEditing: false,
        setIsGlobalStructureEditing: vi.fn(),
        activateEditTarget: vi.fn(),
        handleActivatePatientEdit: vi.fn(),
        handleActivateSectionEdit: vi.fn(),
        toggleGlobalStructureEditing: vi.fn(),
        handlePatientFieldChange: vi.fn(),
        handlePatientLabelChange: vi.fn(),
        handleSectionContentChange: vi.fn(),
        handleSectionTitleChange: vi.fn(),
        handleUpdateSectionMeta: vi.fn(),
        handleRemoveSection: vi.fn(),
        handleRemovePatientField: vi.fn(),
        handleAddSection: vi.fn(),
        handleAddPatientField: vi.fn(),
        handleMedicoChange: vi.fn(),
        handleEspecialidadChange: vi.fn(),
    }),
}));

vi.mock('../hooks/useToast', () => ({
    useToast: () => ({ toast: { type: 'success', message: 'ok' }, showToast: mockState.showToast }),
}));

vi.mock('../hooks/useConfirmDialog', () => ({
    useConfirmDialog: () => ({ confirm: vi.fn().mockResolvedValue(true) }),
}));

vi.mock('../hooks/useAppSettings', () => ({
    useAppSettings: () => ({
        apiKey: 'api-key',
        aiApiKey: 'ai-api-key',
        aiProjectId: 'project-1',
        aiModel: 'gemini-1.5-flash-latest',
        setAiModel: vi.fn(),
        isSettingsModalOpen: false,
        tempApiKey: '',
        tempClientId: '',
        tempAiApiKey: '',
        tempAiProjectId: '',
        tempAiModel: '',
        setTempApiKey: vi.fn(),
        setTempClientId: vi.fn(),
        setTempAiApiKey: vi.fn(),
        setTempAiProjectId: vi.fn(),
        setTempAiModel: vi.fn(),
        showApiKey: false,
        showAiApiKey: false,
        toggleShowApiKey: vi.fn(),
        toggleShowAiApiKey: vi.fn(),
        openSettingsModal: vi.fn(),
        closeSettingsModal: vi.fn(),
        saveSettings: vi.fn(),
        clearSettings: vi.fn().mockResolvedValue(undefined),
    }),
}));

vi.mock('../hooks/useFileOperations', () => ({
    useFileOperations: () => ({
        defaultDriveFileName: 'informe',
        importInputRef: React.createRef<HTMLInputElement>(),
        handleImportFile: vi.fn(),
        handleDownloadJson: vi.fn(),
        handleManualSave: vi.fn(),
        handlePrint: vi.fn(),
    }),
}));

vi.mock('../hooks/useKeyboardShortcuts', () => ({
    useKeyboardShortcuts: vi.fn(),
}));

vi.mock('../hooks/useToolbarCommands', () => ({
    useToolbarCommands: () => ({
        handleToolbarCommand: mockState.toolbarCommand,
        lastEditableRef: { current: null },
        lastSelectionRef: { current: null },
    }),
}));

vi.mock('../hooks/useDriveModals', () => ({
    useDriveModals: () => ({
        isSaveModalOpen: false,
        isOpenModalOpen: false,
        setIsOpenModalOpen: vi.fn(),
        openSaveModal: vi.fn(),
        closeSaveModal: vi.fn(),
        handleOpenFromDrive: vi.fn(),
        handleOpenModalBreadcrumbClick: vi.fn(),
        handleOpenModalFolderClick: vi.fn(),
        handleFileOpen: vi.fn().mockResolvedValue(undefined),
        handleSaveBreadcrumbClick: vi.fn(),
        handleSaveFolderClick: vi.fn(),
        handleFinalSave: vi.fn().mockResolvedValue(undefined),
    }),
}));

vi.mock('../hooks/useEditorUiState', () => ({
    useEditorUiState: () => ({
        isAdvancedEditing: false,
        setIsAdvancedEditing: vi.fn(),
        isAiAssistantVisible: true,
        setIsAiAssistantVisible: vi.fn(),
        sheetZoom: 1,
        setSheetZoom: vi.fn(),
        aiPanelWidth: 420,
        setAiPanelWidth: vi.fn(),
        saveStatusLabel: 'Guardado',
        lastSaveTime: '10:30',
    }),
}));

vi.mock('../hooks/useDocumentEffects', () => ({
    useDocumentEffects: vi.fn(),
}));

vi.mock('../hooks/useAiAssistantController', () => ({
    useAiAssistantController: () => ({
        resolvedAiApiKey: 'ai-api-key',
        resolvedAiProjectId: 'project-1',
        allowAiAutoSelection: false,
        resolvedAiModel: 'gemini-1.5-flash-latest',
        fullRecordContext: 'context',
        aiSections: [],
        aiConversationKey: 'conv-1',
        handleAutoSelectAiModel: vi.fn(),
    }),
}));

vi.mock('../hooks/useRecordTitleController', () => ({
    useRecordTitleController: () => ({
        autoTitle: 'Informe clínico',
        handleTemplateChange: vi.fn(),
        handleRecordTitleChange: vi.fn(),
    }),
}));

vi.mock('../hooks/useHhrIntegrationController', () => ({
    useHhrIntegrationController: () => ({
        hhrHeader: {
            isEnabled: true,
            canSave: true,
            isSaving: false,
            disabledReason: undefined,
            onSaveToHhr: vi.fn(),
        },
        hhrPanel: {
            isConfigured: true,
            missingEnvKeys: [],
            isAuthLoading: false,
            user: null,
            censusDateKey: '2026-03-20',
            censusCount: 0,
            isCensusLoading: false,
            censusError: null,
            selectedPatient: null,
            lastSyncLabel: null,
            saveJob: { operation: 'hhr_save', status: 'idle', message: null, updatedAt: null },
            onSignIn: vi.fn(),
            onSignOut: vi.fn(),
            onOpenCensusModal: vi.fn(),
            onClearSelectedPatient: vi.fn(),
        },
        hhrModal: {
            isOpen: false,
            isLoading: false,
            error: null,
            patients: [],
            onClose: vi.fn(),
            onSelectPatient: vi.fn(),
        },
        resetSyncState: vi.fn(),
    }),
}));

vi.mock('../utils/pdfGenerator', () => ({
    generatePdfAsBlob: vi.fn().mockResolvedValue(new Blob(['pdf'], { type: 'application/pdf' })),
}));

describe('App routing', () => {
    beforeEach(() => {
        window.history.pushState({}, '', '/');
        mockState.appShellContentProps = null;
        mockState.authProviderProps = [];
        mockState.driveProviderCalls = 0;
        mockState.recordProviderCalls = 0;
        mockState.toolbarCommand.mockClear();
        mockState.showToast.mockClear();
    });

    it('renderiza la ruta principal con providers y shell conectado', () => {
        render(<App />);

        expect(screen.getByText('app-shell')).toBeTruthy();
        expect(mockState.authProviderProps[0]?.clientId).toBeTruthy();
        expect(mockState.driveProviderCalls).toBe(1);
        expect(mockState.recordProviderCalls).toBe(1);
        expect(mockState.appShellContentProps?.recordState.record.title).toBe('Informe clínico');
        expect(mockState.appShellContentProps?.editorUi.saveStatusLabel).toBe('Guardado local');
    });

    it('navega hacia cartola y permite volver al shell principal', async () => {
        render(<App />);

        fireEvent.click(screen.getByText('open-cartola-route'));
        expect(await screen.findByText('cartola-view')).toBeTruthy();

        fireEvent.click(screen.getByText('cartola-back'));
        expect(await screen.findByText('app-shell')).toBeTruthy();
    });

    it('respeta la ruta /cartola al cargar directamente', async () => {
        window.history.pushState({}, '', '/cartola');

        render(<App />);

        expect(await screen.findByText('cartola-view')).toBeTruthy();
    });
});

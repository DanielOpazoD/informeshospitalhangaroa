import React, { lazy, useCallback, useState, Suspense } from 'react';
import { BrowserRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { generateSectionId } from './constants';
import { getEnvGeminiApiKey, getEnvGeminiModel, getEnvGeminiProjectId } from './utils/env';
import { DEFAULT_GOOGLE_CLIENT_ID } from './appConstants';
import { appDisplayName } from './institutionConfig';
import { useToast, type ToastState } from './hooks/useToast';
import { useConfirmDialog } from './hooks/useConfirmDialog';
import { useAppSettings } from './hooks/useAppSettings';
import { useFileOperations } from './hooks/useFileOperations';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useToolbarCommands } from './hooks/useToolbarCommands';
import { useDriveModals } from './hooks/useDriveModals';
import { useEditorUiState } from './hooks/useEditorUiState';
import { useDocumentEffects } from './hooks/useDocumentEffects';
import { useAiAssistantController } from './hooks/useAiAssistantController';
import { useRecordTitleController } from './hooks/useRecordTitleController';
import { useHhrIntegrationController } from './hooks/useHhrIntegrationController';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DriveProvider, useDrive } from './contexts/DriveContext';
import { RecordProvider, useRecordContext } from './contexts/RecordContext';
import { generatePdfAsBlob } from './utils/pdfGenerator';
import { ErrorBoundary } from './components/ErrorBoundary';
import AppShellContent from './components/app/AppShellContent';
import HhrIntegrationPanel from './components/hhr/HhrIntegrationPanel';
import HhrCensusModal from './components/hhr/HhrCensusModal';
import {
    buildClinicalUpdateSection,
    createTemplateBaseline,
    RECOMMENDED_GEMINI_MODEL,
} from './utils/recordTemplates';

const CartolaMedicamentosView = lazy(() => import('./components/CartolaMedicamentosView'));
const AIAssistant = lazy(() => import('./components/AIAssistant'));

const ENV_GEMINI_API_KEY = getEnvGeminiApiKey();
const ENV_GEMINI_PROJECT_ID = getEnvGeminiProjectId();
const ENV_GEMINI_MODEL = getEnvGeminiModel();
const INITIAL_GEMINI_MODEL = ENV_GEMINI_MODEL || RECOMMENDED_GEMINI_MODEL;
interface AppShellProps { toast: ToastState | null; showToast: (message: string, type?: 'success' | 'warning' | 'error') => void; clientId: string; setClientId: React.Dispatch<React.SetStateAction<string>>; onOpenCartola: () => void; }

const AppShell: React.FC<AppShellProps> = ({ toast, showToast, clientId, setClientId, onOpenCartola }) => {
    const {
        record,
        dispatchRecordCommand,
        lastLocalSave,
        hasUnsavedChanges,
        setHasUnsavedChanges,
        versionHistory,
        isHistoryModalOpen,
        setIsHistoryModalOpen,
        saveDraft,
        handleRestoreHistoryEntry,
        markRecordAsReplaced,
        dispatchWorkflow,
        isEditing,
        setIsEditing,
        activeEditTarget,
        setActiveEditTarget,
        isGlobalStructureEditing,
        setIsGlobalStructureEditing,
        activateEditTarget,
        handleActivatePatientEdit,
        handleActivateSectionEdit,
        toggleGlobalStructureEditing,
        handlePatientFieldChange,
        handlePatientLabelChange,
        handleSectionContentChange,
        handleSectionTitleChange,
        handleUpdateSectionMeta,
        handleRemoveSection,
        handleRemovePatientField,
        handleMedicoChange,
        handleEspecialidadChange,
        handleAddSection: hookAddSection,
        handleAddPatientField: hookAddPatientField,
    } = useRecordContext();
    const auth = useAuth();
    const drive = useDrive();
    const { confirm } = useConfirmDialog();
    const editorUi = useEditorUiState({ lastLocalSave, hasUnsavedChanges });
    const { handleToolbarCommand, lastEditableRef, lastSelectionRef } = useToolbarCommands({
        setSheetZoom: editorUi.setSheetZoom,
    });

    const clearActiveEditTarget = useCallback(() => setActiveEditTarget(null), [setActiveEditTarget]);

    useDocumentEffects({
        appTitle: appDisplayName,
        isAdvancedEditing: editorUi.isAdvancedEditing,
        isEditing,
        clearActiveEditTarget,
        setIsEditing,
        setIsGlobalStructureEditing,
        lastEditableRef,
        lastSelectionRef,
    });

    const settings = useAppSettings({
        clientId,
        setClientId,
        envGeminiApiKey: ENV_GEMINI_API_KEY,
        envGeminiProjectId: ENV_GEMINI_PROJECT_ID,
        initialGeminiModel: INITIAL_GEMINI_MODEL,
        confirmClearSettings: () =>
            confirm({
                title: 'Eliminar credenciales',
                message: '¿Está seguro de que desea eliminar las credenciales guardadas? Esta acción no se puede deshacer.',
                confirmLabel: 'Eliminar',
                cancelLabel: 'Cancelar',
                tone: 'danger',
            }),
        onToast: showToast,
    });

    const fileOperations = useFileOperations({
        record,
        dispatchRecordCommand,
        setHasUnsavedChanges,
        saveDraft,
        markRecordAsReplaced,
        hasUnsavedChanges,
        showToast,
    });

    const driveModals = useDriveModals({
        isSignedIn: auth.isSignedIn,
        handleSignIn: auth.handleSignIn,
        showToast,
        record,
        dispatchRecordCommand,
        setHasUnsavedChanges,
        saveDraft,
        markRecordAsReplaced,
        defaultDriveFileName: fileOperations.defaultDriveFileName,
        apiKey: settings.apiKey,
        isPickerApiReady: auth.isPickerApiReady,
        fetchDriveFolders: drive.fetchDriveFolders,
        fetchFolderContents: drive.fetchFolderContents,
        setFolderPath: drive.setFolderPath,
        setFileNameInput: drive.setFileNameInput,
        fileNameInput: drive.fileNameInput,
        saveFormat: drive.saveFormat,
        openJsonFileFromDrive: drive.openJsonFileFromDrive,
        saveToDrive: drive.saveToDrive,
        generatePdf: () => generatePdfAsBlob({ record }),
    });

    const aiAssistant = useAiAssistantController({
        record,
        aiApiKey: settings.aiApiKey,
        aiProjectId: settings.aiProjectId,
        aiModel: settings.aiModel,
        envGeminiApiKey: ENV_GEMINI_API_KEY,
        envGeminiProjectId: ENV_GEMINI_PROJECT_ID,
        envGeminiModel: ENV_GEMINI_MODEL,
        recommendedModel: RECOMMENDED_GEMINI_MODEL,
        setAiModel: settings.setAiModel,
        onToast: showToast,
    });

    const { handleTemplateChange, handleRecordTitleChange } = useRecordTitleController({
        dispatchRecordCommand,
    });
    const hhrController = useHhrIntegrationController({
        record,
        dispatchRecordCommand,
        setHasUnsavedChanges,
        markRecordAsReplaced,
        showToast,
        dispatchWorkflow,
    });
    const { resetSyncState } = hhrController;

    const handleAddSection = useCallback(() => hookAddSection({ id: generateSectionId(), title: 'Sección personalizada', content: '' }), [hookAddSection]);

    const handleAddClinicalUpdateSection = useCallback(() => {
        hookAddSection(buildClinicalUpdateSection());
        showToast('Sección de actualización clínica agregada');
    }, [hookAddSection, showToast]);

    const handleAddPatientField = useCallback(() => hookAddPatientField({ label: 'Nuevo campo', value: '', type: 'text', isCustom: true }), [hookAddPatientField]);

    const restoreAll = useCallback(() => {
        void (async () => {
            const confirmed = await confirm({
                title: 'Restablecer planilla',
                message: '¿Desea restaurar todo el formulario? Se perderán los datos no guardados.',
                confirmLabel: 'Restablecer',
                cancelLabel: 'Cancelar',
                tone: 'warning',
            });
            if (!confirmed) return;
            const blankRecord = createTemplateBaseline(record.templateId);
            markRecordAsReplaced();
            dispatchRecordCommand({ type: 'reset_record', templateId: blankRecord.templateId });
            setHasUnsavedChanges(true);
            resetSyncState();
            showToast('Formulario restablecido.', 'warning');
        })();
    }, [confirm, dispatchRecordCommand, markRecordAsReplaced, record.templateId, resetSyncState, setHasUnsavedChanges, showToast]);

    useKeyboardShortcuts({
        onSave: fileOperations.handleManualSave,
        onPrint: fileOperations.handlePrint,
        onToggleEdit: toggleGlobalStructureEditing,
        onRestore: restoreAll,
    });

    const appWorkspaceAiAssistant = (
        <AIAssistant
            sections={aiAssistant.aiSections}
            apiKey={aiAssistant.resolvedAiApiKey}
            projectId={aiAssistant.resolvedAiProjectId}
            model={aiAssistant.resolvedAiModel}
            allowModelAutoSelection={aiAssistant.allowAiAutoSelection}
            onAutoModelSelected={aiAssistant.handleAutoSelectAiModel}
            onApplySuggestion={handleSectionContentChange}
            fullRecordContent={aiAssistant.fullRecordContext}
            isOpen={editorUi.isAiAssistantVisible}
            onClose={() => editorUi.setIsAiAssistantVisible(false)}
            conversationKey={aiAssistant.aiConversationKey}
            panelWidth={editorUi.aiPanelWidth}
            onPanelWidthChange={editorUi.setAiPanelWidth}
        />
    );

    return (
        <AppShellContent
            toast={toast}
            settings={settings}
            driveModals={driveModals}
            editorUi={editorUi}
            fileOperations={fileOperations}
            auth={auth}
            drive={drive}
            recordState={{
                record,
                hasUnsavedChanges,
                versionHistory,
                isHistoryModalOpen,
                setIsHistoryModalOpen,
                handleRestoreHistoryEntry,
                isEditing,
                isGlobalStructureEditing,
                activeEditTarget,
                activateEditTarget,
                handleActivatePatientEdit,
                handleActivateSectionEdit,
                handlePatientFieldChange,
                handlePatientLabelChange,
                handleSectionContentChange,
                handleSectionTitleChange,
                handleUpdateSectionMeta,
                handleRemoveSection,
                handleRemovePatientField,
                handleMedicoChange,
                handleEspecialidadChange,
            }}
            toggleGlobalStructureEditing={toggleGlobalStructureEditing}
            handleTemplateChange={handleTemplateChange}
            handleAddClinicalUpdateSection={handleAddClinicalUpdateSection}
            handleRecordTitleChange={handleRecordTitleChange}
            handleAddPatientField={handleAddPatientField}
            handleAddSection={handleAddSection}
            handleRestoreAll={restoreAll}
            handleToolbarCommand={handleToolbarCommand}
            onOpenCartola={onOpenCartola}
            aiAssistantPanel={appWorkspaceAiAssistant}
            hhrHeader={hhrController.hhrHeader}
            hhrPanel={
                <HhrIntegrationPanel
                    {...hhrController.hhrPanel}
                />
            }
            hhrModal={
                <HhrCensusModal
                    {...hhrController.hhrModal}
                />
            }
        />
    );
};

const Root: React.FC = () => {
    const [clientId, setClientId] = useState(DEFAULT_GOOGLE_CLIENT_ID);
    const { toast, showToast } = useToast();
    const navigate = useNavigate();

    return (
        <AuthProvider clientId={clientId} showToast={showToast}>
            <DriveProvider showToast={showToast}>
                <RecordProvider showToast={showToast}>
                    <ErrorBoundary>
                        <Routes>
                            <Route
                                path="/"
                                element={
                                    <AppShell
                                        toast={toast}
                                        showToast={showToast}
                                        clientId={clientId}
                                        setClientId={setClientId}
                                        onOpenCartola={() => navigate('/cartola')}
                                    />
                                }
                            />
                            <Route
                                path="/cartola"
                                element={
                                    <Suspense fallback={<div className="p-4 text-sm text-gray-600">Cargando cartola de medicamentos…</div>}>
                                        <CartolaMedicamentosView onBack={() => navigate('/')} />
                                    </Suspense>
                                }
                            />
                        </Routes>
                    </ErrorBoundary>
                </RecordProvider>
            </DriveProvider>
        </AuthProvider>
    );
};

const App: React.FC = () => (
    <BrowserRouter>
        <Root />
    </BrowserRouter>
);

export default App;

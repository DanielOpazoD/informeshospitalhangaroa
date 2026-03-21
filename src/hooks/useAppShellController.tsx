import React, { useCallback } from 'react';
import { generateSectionId } from '../constants';
import { getEnvGeminiApiKey, getEnvGeminiModel, getEnvGeminiProjectId } from '../utils/env';
import { appDisplayName } from '../institutionConfig';
import { useConfirmDialog } from './useConfirmDialog';
import { useAppSettings } from './useAppSettings';
import { useFileOperations } from './useFileOperations';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';
import { useToolbarCommands } from './useToolbarCommands';
import { useDriveModals } from './useDriveModals';
import { useEditorUiState } from './useEditorUiState';
import { useDocumentEffects } from './useDocumentEffects';
import { useAiAssistantController } from './useAiAssistantController';
import { useRecordTitleController } from './useRecordTitleController';
import { useHhrIntegrationController } from './useHhrIntegrationController';
import { useDriveNavigation, useDrivePersistence, useDriveSearchState } from '../contexts/DriveContext';
import { useAuth } from '../contexts/AuthContext';
import { useRecordContext } from '../contexts/RecordContext';
import { interpretEditorEffects } from '../application/editorEffects';
import { executeResetRecord } from '../application/editorUseCases';
import { generatePdfAsBlob } from '../utils/pdfGenerator';
import {
    buildClinicalUpdateSection,
    createTemplateBaseline,
    RECOMMENDED_GEMINI_MODEL,
} from '../utils/recordTemplates';
import type { ToastState } from './useToast';

const ENV_GEMINI_API_KEY = getEnvGeminiApiKey();
const ENV_GEMINI_PROJECT_ID = getEnvGeminiProjectId();
const ENV_GEMINI_MODEL = getEnvGeminiModel();
const INITIAL_GEMINI_MODEL = ENV_GEMINI_MODEL || RECOMMENDED_GEMINI_MODEL;

interface UseAppShellControllerOptions {
    clientId: string;
    setClientId: React.Dispatch<React.SetStateAction<string>>;
    showToast: (message: string, type?: 'success' | 'warning' | 'error') => void;
}

export const useAppShellController = ({
    clientId,
    setClientId,
    showToast,
}: UseAppShellControllerOptions) => {
    const {
        record,
        dispatchRecordCommand,
        lastLocalSave,
        hasUnsavedChanges,
        setHasUnsavedChanges,
        versionHistory,
        canUndo,
        canRedo,
        isHistoryModalOpen,
        setIsHistoryModalOpen,
        saveDraft,
        handleRestoreHistoryEntry,
        undo,
        redo,
        markRecordAsReplaced,
        workflowState,
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
    const driveNavigation = useDriveNavigation();
    const driveSearch = useDriveSearchState();
    const drivePersistence = useDrivePersistence();
    const drive = {
        ...driveNavigation,
        ...driveSearch,
        ...drivePersistence,
    };
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
        workflowState,
        showToast,
        dispatchWorkflow,
    });

    const driveModals = useDriveModals({
        isSignedIn: auth.isSignedIn,
        handleSignIn: auth.handleSignIn,
        showToast,
        record,
        workflowState,
        dispatchRecordCommand,
        setHasUnsavedChanges,
        saveDraft,
        markRecordAsReplaced,
        defaultDriveFileName: fileOperations.defaultDriveFileName,
        apiKey: settings.apiKey,
        isPickerApiReady: auth.isPickerApiReady,
        fetchDriveFolders: driveNavigation.fetchDriveFolders,
        fetchFolderContents: driveNavigation.fetchFolderContents,
        setFolderPath: driveNavigation.setFolderPath,
        setFileNameInput: drivePersistence.setFileNameInput,
        fileNameInput: drivePersistence.fileNameInput,
        saveFormat: drivePersistence.saveFormat,
        openJsonFileFromDrive: drivePersistence.openJsonFileFromDrive,
        saveToDrive: drivePersistence.saveToDrive,
        generatePdf: () => generatePdfAsBlob({ record }),
        dispatchWorkflow,
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
        workflowState,
        dispatchRecordCommand,
        setHasUnsavedChanges,
        markRecordAsReplaced,
        showToast,
        dispatchWorkflow,
    });
    const { resetSyncState } = hhrController;

    const handleAddSection = useCallback(
        () => hookAddSection({ id: generateSectionId(), title: 'Sección personalizada', content: '' }),
        [hookAddSection],
    );

    const handleAddClinicalUpdateSection = useCallback(() => {
        hookAddSection(buildClinicalUpdateSection());
        showToast('Sección de actualización clínica agregada');
    }, [hookAddSection, showToast]);

    const handleAddPatientField = useCallback(
        () => hookAddPatientField({ label: 'Nuevo campo', value: '', type: 'text', isCustom: true }),
        [hookAddPatientField],
    );

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
            const useCase = executeResetRecord(record, workflowState, blankRecord.templateId);
            markRecordAsReplaced();
            const result = dispatchRecordCommand({ type: 'reset_record', templateId: blankRecord.templateId });
            interpretEditorEffects(useCase.effects.length ? useCase.effects : result.effects, {
                onResetHhrSync: resetSyncState,
                onShowWarning: message => showToast(message, 'warning'),
                onShowToast: (message, tone) => showToast(message, tone),
                onLogAuditEvent: effect => console.warn(`[editor-audit] ${effect.event}`, effect.details ?? ''),
            });
            if (!result.ok) {
                showToast(result.errors.join('\n') || 'No se pudo restablecer el formulario.', 'error');
                return;
            }
            setHasUnsavedChanges(true);
        })();
    }, [confirm, dispatchRecordCommand, markRecordAsReplaced, record, resetSyncState, setHasUnsavedChanges, showToast, workflowState]);

    useKeyboardShortcuts({
        onSave: fileOperations.handleManualSave,
        onPrint: fileOperations.handlePrint,
        onToggleEdit: toggleGlobalStructureEditing,
        onRestore: restoreAll,
    });

    return {
        auth,
        drive,
        settings,
        driveModals,
        editorUi,
        fileOperations,
        aiAssistant,
        hhrController,
        recordState: {
            record,
            hasUnsavedChanges,
            versionHistory,
            canUndo,
            canRedo,
            isHistoryModalOpen,
            setIsHistoryModalOpen,
            handleRestoreHistoryEntry,
            undo,
            redo,
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
        },
        handlers: {
            toggleGlobalStructureEditing,
            handleTemplateChange,
            handleAddClinicalUpdateSection,
            handleRecordTitleChange,
            handleAddPatientField,
            handleAddSection,
            handleRestoreAll: restoreAll,
            handleToolbarCommand,
        },
    };
};

export interface AppShellRouteProps {
    toast: ToastState | null;
    showToast: (message: string, type?: 'success' | 'warning' | 'error') => void;
    clientId: string;
    setClientId: React.Dispatch<React.SetStateAction<string>>;
}

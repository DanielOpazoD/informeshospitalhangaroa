import React from 'react';
import { useConfirmDialog } from './useConfirmDialog';
import { useAppSettings } from './useAppSettings';
import { useDriveNavigation, useDrivePersistence, useDriveSearchState } from '../contexts/DriveContext';
import { useAuth } from '../contexts/AuthContext';
import { useRecordContext } from '../contexts/RecordContext';
import { RECOMMENDED_GEMINI_MODEL } from '../utils/recordTemplates';
import type { ToastState } from './useToast';
import { useAiShellFeature } from './appShell/useAiShellFeature';
import { useDriveShellFeature } from './appShell/useDriveShellFeature';
import { useEditorShellFeature } from './appShell/useEditorShellFeature';
import { useHhrShellFeature } from './appShell/useHhrShellFeature';

const INITIAL_GEMINI_MODEL = RECOMMENDED_GEMINI_MODEL;

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

    const settings = useAppSettings({
        clientId,
        setClientId,
        envGeminiApiKey: '',
        envGeminiProjectId: '',
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

    const hhrController = useHhrShellFeature({
        record,
        workflowState,
        dispatchRecordCommand,
        setHasUnsavedChanges,
        markRecordAsReplaced,
        showToast,
        dispatchWorkflow,
    });
    const { resetSyncState } = hhrController;
    const editorFeature = useEditorShellFeature({
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
        hookAddSection,
        hookAddPatientField,
        showToast,
        confirm,
        onResetHhrSync: resetSyncState,
    });
    const { driveModals } = useDriveShellFeature({
        auth,
        driveNavigation,
        driveSearch,
        drivePersistence,
        showToast,
        record,
        workflowState,
        dispatchRecordCommand,
        setHasUnsavedChanges,
        saveDraft,
        markRecordAsReplaced,
        defaultDriveFileName: editorFeature.fileOperations.defaultDriveFileName,
        apiKey: settings.apiKey,
        dispatchWorkflow,
        generatePdf: async () => {
            const { generatePdfAsBlob } = await import('../utils/pdfGenerator');
            return generatePdfAsBlob({ record });
        },
    });
    const aiAssistant = useAiShellFeature({
        record,
        aiApiKey: settings.aiApiKey,
        aiProjectId: settings.aiProjectId,
        aiModel: settings.aiModel,
        recommendedModel: RECOMMENDED_GEMINI_MODEL,
        setAiModel: settings.setAiModel,
        onToast: showToast,
    });

    return {
        auth,
        drive,
        settings,
        driveModals,
        editorUi: editorFeature.editorUi,
        fileOperations: editorFeature.fileOperations,
        aiAssistant,
        hhrController,
        recordState: editorFeature.recordState,
        handlers: editorFeature.handlers,
    };
};

export interface AppShellRouteProps {
    toast: ToastState | null;
    showToast: (message: string, type?: 'success' | 'warning' | 'error') => void;
    clientId: string;
    setClientId: React.Dispatch<React.SetStateAction<string>>;
}

import { useCallback } from 'react';
import { generateSectionId } from '../../constants';
import { appDisplayName } from '../../institutionConfig';
import { interpretEditorEffects } from '../../application/editorEffects';
import { executeResetRecord } from '../../application/editorUseCases';
import {
    buildClinicalUpdateSection,
    createTemplateBaseline,
} from '../../utils/recordTemplates';
import { useDocumentEffects } from '../useDocumentEffects';
import { useEditorUiState } from '../useEditorUiState';
import { useFileOperations } from '../useFileOperations';
import { useKeyboardShortcuts } from '../useKeyboardShortcuts';
import { useRecordTitleController } from '../useRecordTitleController';
import { useToolbarCommands } from '../useToolbarCommands';
import type { EditorWorkflowAction } from '../../application/editorWorkflow';
import type { ClinicalRecordCommand, ClinicalRecordCommandResult } from '../../application/clinicalRecordCommands';
import type { ClinicalRecord, EditorWorkflowState, VersionHistoryEntry } from '../../types';
import type { EditTarget } from '../../contexts/RecordContext';

interface UseEditorShellFeatureParams {
    record: ClinicalRecord;
    dispatchRecordCommand: (command: ClinicalRecordCommand) => ClinicalRecordCommandResult;
    lastLocalSave: number | null;
    hasUnsavedChanges: boolean;
    setHasUnsavedChanges: React.Dispatch<React.SetStateAction<boolean>>;
    versionHistory: VersionHistoryEntry[];
    canUndo: boolean;
    canRedo: boolean;
    isHistoryModalOpen: boolean;
    setIsHistoryModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
    saveDraft: (reason: 'auto' | 'manual' | 'import', overrideRecord?: ClinicalRecord) => void;
    handleRestoreHistoryEntry: (entry: VersionHistoryEntry) => void;
    undo: () => void;
    redo: () => void;
    markRecordAsReplaced: () => void;
    workflowState: EditorWorkflowState;
    dispatchWorkflow?: React.Dispatch<EditorWorkflowAction>;
    isEditing: boolean;
    setIsEditing: React.Dispatch<React.SetStateAction<boolean>>;
    activeEditTarget: EditTarget;
    setActiveEditTarget: React.Dispatch<React.SetStateAction<EditTarget>>;
    isGlobalStructureEditing: boolean;
    setIsGlobalStructureEditing: React.Dispatch<React.SetStateAction<boolean>>;
    activateEditTarget: (target: EditTarget) => void;
    handleActivatePatientEdit: (target: { type: 'patient-section-title' | 'patient-field-label'; index?: number }) => void;
    handleActivateSectionEdit: (target: { type: 'section-title'; index: number }) => void;
    toggleGlobalStructureEditing: () => void;
    handlePatientFieldChange: (index: number, value: string) => void;
    handlePatientLabelChange: (index: number, label: string) => void;
    handleSectionContentChange: (index: number, content: string) => void;
    handleSectionTitleChange: (index: number, title: string) => void;
    handleUpdateSectionMeta: (index: number, meta: Record<string, unknown>) => void;
    handleRemoveSection: (index: number) => void;
    handleRemovePatientField: (index: number) => void;
    handleMedicoChange: (value: string) => void;
    handleEspecialidadChange: (value: string) => void;
    hookAddSection: (section: { id: string; title: string; content: string }) => void;
    hookAddPatientField: (field: { label: string; value: string; type: 'text'; isCustom: true }) => void;
    showToast: (message: string, type?: 'success' | 'warning' | 'error') => void;
    confirm: (options: {
        title: string;
        message: string;
        confirmLabel: string;
        cancelLabel: string;
        tone: 'warning' | 'danger';
    }) => Promise<boolean>;
    onResetHhrSync: () => void;
}

export const useEditorShellFeature = ({
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
    onResetHhrSync,
}: UseEditorShellFeatureParams) => {
    const editorUi = useEditorUiState({ lastLocalSave, hasUnsavedChanges });
    const { handleToolbarCommand, lastEditableRef, lastSelectionRef } = useToolbarCommands({
        onZoomChange: (delta: number) => {
            editorUi.setSheetZoom(prev =>
                delta > 0
                    ? Math.min(1.5, +(prev + delta).toFixed(2))
                    : Math.max(0.7, +(prev + delta).toFixed(2)),
            );
        },
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

    const { handleTemplateChange, handleRecordTitleChange } = useRecordTitleController({
        dispatchRecordCommand,
    });

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
                onResetHhrSync,
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
    }, [confirm, dispatchRecordCommand, markRecordAsReplaced, onResetHhrSync, record, setHasUnsavedChanges, showToast, workflowState]);

    useKeyboardShortcuts({
        onSave: fileOperations.handleManualSave,
        onPrint: fileOperations.handlePrint,
        onToggleEdit: toggleGlobalStructureEditing,
        onRestore: restoreAll,
    });

    return {
        editorUi,
        fileOperations,
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
            handleUpdateSectionMeta: handleUpdateSectionMeta as (index: number, meta: Partial<ClinicalRecord['sections'][number]>) => void,
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

import { useHhrIntegrationController } from '../useHhrIntegrationController';
import type { EditorWorkflowAction } from '../../application/editorWorkflow';
import type { ClinicalRecordCommand, ClinicalRecordCommandResult } from '../../application/clinicalRecordCommands';
import type { ClinicalRecord, EditorWorkflowState } from '../../types';

interface UseHhrShellFeatureParams {
    record: ClinicalRecord;
    workflowState: EditorWorkflowState;
    dispatchRecordCommand: (command: ClinicalRecordCommand) => ClinicalRecordCommandResult;
    setHasUnsavedChanges: React.Dispatch<React.SetStateAction<boolean>>;
    markRecordAsReplaced: () => void;
    showToast: (message: string, type?: 'success' | 'warning' | 'error') => void;
    dispatchWorkflow?: React.Dispatch<EditorWorkflowAction>;
}

export const useHhrShellFeature = (params: UseHhrShellFeatureParams) => useHhrIntegrationController(params);

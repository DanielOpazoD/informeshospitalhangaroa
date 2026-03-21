import { useDriveModals } from '../useDriveModals';
import type { EditorWorkflowAction } from '../../application/editorWorkflow';
import type { ClinicalRecordCommand, ClinicalRecordCommandResult } from '../../application/clinicalRecordCommands';
import type { ClinicalRecord, EditorWorkflowState } from '../../types';
import type { useAuth } from '../../contexts/AuthContext';
import type {
    useDriveNavigation,
    useDrivePersistence,
    useDriveSearchState,
} from '../../contexts/DriveContext';

interface UseDriveShellFeatureParams {
    auth: ReturnType<typeof useAuth>;
    driveNavigation: ReturnType<typeof useDriveNavigation>;
    driveSearch: ReturnType<typeof useDriveSearchState>;
    drivePersistence: ReturnType<typeof useDrivePersistence>;
    showToast: (message: string, type?: 'success' | 'warning' | 'error') => void;
    record: ClinicalRecord;
    workflowState: EditorWorkflowState;
    dispatchRecordCommand: (command: ClinicalRecordCommand) => ClinicalRecordCommandResult;
    setHasUnsavedChanges: React.Dispatch<React.SetStateAction<boolean>>;
    saveDraft: (reason: 'auto' | 'manual' | 'import', overrideRecord?: ClinicalRecord) => void;
    markRecordAsReplaced: () => void;
    defaultDriveFileName: string;
    apiKey: string;
    dispatchWorkflow?: React.Dispatch<EditorWorkflowAction>;
    generatePdf: () => Promise<Blob>;
}

export const useDriveShellFeature = ({
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
    defaultDriveFileName,
    apiKey,
    dispatchWorkflow,
    generatePdf,
}: UseDriveShellFeatureParams) => {
    const drive = {
        ...driveNavigation,
        ...driveSearch,
        ...drivePersistence,
    };

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
        defaultDriveFileName,
        apiKey,
        isPickerApiReady: auth.isPickerApiReady,
        fetchDriveFolders: driveNavigation.fetchDriveFolders,
        fetchFolderContents: driveNavigation.fetchFolderContents,
        setFolderPath: driveNavigation.setFolderPath,
        setFileNameInput: drivePersistence.setFileNameInput,
        fileNameInput: drivePersistence.fileNameInput,
        saveFormat: drivePersistence.saveFormat,
        openJsonFileFromDrive: drivePersistence.openJsonFileFromDrive,
        saveToDrive: drivePersistence.saveToDrive,
        generatePdf,
        dispatchWorkflow,
    });

    return {
        drive,
        driveModals,
    };
};

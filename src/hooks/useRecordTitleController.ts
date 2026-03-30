import { useCallback } from 'react';
import type { ClinicalRecordCommand, ClinicalRecordCommandResult } from '../application/clinicalRecordCommands';

interface UseRecordTitleControllerParams {
    dispatchRecordCommand: (command: ClinicalRecordCommand) => ClinicalRecordCommandResult;
}

export const useRecordTitleController = ({
    dispatchRecordCommand,
}: UseRecordTitleControllerParams) => {
    const handleTemplateChange = useCallback((templateId: string) => {
        dispatchRecordCommand({ type: 'change_template', templateId });
    }, [dispatchRecordCommand]);

    const handleRecordTitleChange = useCallback((title: string) => {
        dispatchRecordCommand({ type: 'change_record_title', title });
    }, [dispatchRecordCommand]);

    return {
        handleTemplateChange,
        handleRecordTitleChange,
    };
};

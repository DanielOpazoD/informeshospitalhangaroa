import { useCallback, useEffect, type Dispatch, type SetStateAction } from 'react';
import type { ClinicalRecord } from '../types';
import {
    getAutoTitleForTemplate,
    getReportDateValue,
    inferTitleMode,
} from '../utils/recordTemplates';
import {
    applyAutoTitle,
    changeRecordTitle,
    changeTemplate,
} from '../application/clinicalRecordUseCases';

interface UseRecordTitleControllerParams {
    record: ClinicalRecord;
    setRecord: Dispatch<SetStateAction<ClinicalRecord>>;
    markRecordAsReplaced: () => void;
}

export const useRecordTitleController = ({
    record,
    setRecord,
    markRecordAsReplaced,
}: UseRecordTitleControllerParams) => {
    const autoTitle = getAutoTitleForTemplate(record.templateId, getReportDateValue(record));

    useEffect(() => {
        const currentMode = inferTitleMode(record);
        if (currentMode !== 'auto' || record.title === autoTitle) {
            return;
        }

        markRecordAsReplaced();
        setRecord(current => inferTitleMode(current) === 'auto' ? applyAutoTitle(current) : current);
    }, [autoTitle, markRecordAsReplaced, record, setRecord]);

    const handleTemplateChange = useCallback((templateId: string) => {
        setRecord(current => changeTemplate(current, templateId));
    }, [setRecord]);

    const handleRecordTitleChange = useCallback((title: string) => {
        setRecord(current => changeRecordTitle(current, title));
    }, [setRecord]);

    return {
        autoTitle,
        handleTemplateChange,
        handleRecordTitleChange,
    };
};

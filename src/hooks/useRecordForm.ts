import { useCallback, type Dispatch, type SetStateAction } from 'react';
import type { ClinicalSectionData, PatientField } from '../types';
import type { ClinicalRecordCommand, ClinicalRecordCommandResult } from '../application/clinicalRecordCommands';

type EditTarget =
    | { type: 'patient-section-title' }
    | { type: 'patient-field-label'; index: number }
    | { type: 'section-title'; index: number }
    | { type: 'record-title' }
    | null;

interface UseRecordFormOptions {
    dispatchRecordCommand: (command: ClinicalRecordCommand) => ClinicalRecordCommandResult;
    setIsEditing: Dispatch<SetStateAction<boolean>>;
    setActiveEditTarget: Dispatch<SetStateAction<EditTarget>>;
    clearActiveEditTarget: () => void;
    setIsGlobalStructureEditing: Dispatch<SetStateAction<boolean>>;
}

export function useRecordForm({
    dispatchRecordCommand,
    setIsEditing,
    setActiveEditTarget,
    clearActiveEditTarget,
    setIsGlobalStructureEditing,
}: UseRecordFormOptions) {
    const activateEditTarget = useCallback((target: EditTarget) => {
        setActiveEditTarget(target);
        setIsEditing(true);
    }, [setActiveEditTarget, setIsEditing]);

    const handleActivatePatientEdit = useCallback(
        (target: { type: 'patient-section-title' | 'patient-field-label'; index?: number }) => {
            activateEditTarget(target as EditTarget);
        },
        [activateEditTarget]
    );

    const handleActivateSectionEdit = useCallback(
        (target: { type: 'section-title'; index: number }) => {
            activateEditTarget(target);
        },
        [activateEditTarget]
    );

    const toggleGlobalStructureEditing = useCallback(() => {
        setIsGlobalStructureEditing(prev => {
            const next = !prev;
            setIsEditing(next);
            if (!next) {
                clearActiveEditTarget();
            }
            return next;
        });
    }, [clearActiveEditTarget, setIsEditing, setIsGlobalStructureEditing]);

    const handlePatientFieldChange = useCallback((index: number, value: string) => {
        dispatchRecordCommand({ type: 'edit_patient_field', index, value });
    }, [dispatchRecordCommand]);

    const handlePatientLabelChange = useCallback((index: number, label: string) => {
        dispatchRecordCommand({ type: 'edit_patient_label', index, label });
    }, [dispatchRecordCommand]);

    const handleSectionContentChange = useCallback((index: number, content: string) => {
        dispatchRecordCommand({ type: 'edit_section_content', index, content });
    }, [dispatchRecordCommand]);

    const handleSectionTitleChange = useCallback((index: number, title: string) => {
        dispatchRecordCommand({ type: 'edit_section_title', index, title });
    }, [dispatchRecordCommand]);

    const handleUpdateSectionMeta = useCallback((index: number, meta: Partial<ClinicalSectionData>) => {
        dispatchRecordCommand({ type: 'update_section_meta', index, meta });
    }, [dispatchRecordCommand]);

    const handleRemoveSection = useCallback((index: number) => {
        dispatchRecordCommand({ type: 'remove_section', index });
    }, [dispatchRecordCommand]);

    const handleRemovePatientField = useCallback((index: number) => {
        dispatchRecordCommand({ type: 'remove_patient_field', index });
    }, [dispatchRecordCommand]);

    const handleAddSection = useCallback((newSection: ClinicalSectionData) => {
        dispatchRecordCommand({ type: 'add_section', section: newSection });
    }, [dispatchRecordCommand]);

    const handleAddPatientField = useCallback((newField: PatientField) => {
        dispatchRecordCommand({ type: 'add_patient_field', field: newField });
    }, [dispatchRecordCommand]);

    const handleMedicoChange = useCallback((value: string) => {
        dispatchRecordCommand({ type: 'edit_professional_field', field: 'medico', value });
    }, [dispatchRecordCommand]);

    const handleEspecialidadChange = useCallback((value: string) => {
        dispatchRecordCommand({ type: 'edit_professional_field', field: 'especialidad', value });
    }, [dispatchRecordCommand]);

    return {
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
        handleAddSection,
        handleAddPatientField,
        handleMedicoChange,
        handleEspecialidadChange,
    };
}

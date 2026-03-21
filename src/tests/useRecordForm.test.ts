import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRecordForm } from '../hooks/useRecordForm';
import type { ClinicalRecord } from '../types';
import { executeClinicalRecordCommand, type ClinicalRecordCommand } from '../application/clinicalRecordCommands';

function createMockRecord(): ClinicalRecord {
    return {
        version: '1.0',
        templateId: '2',
        title: 'Test Record',
        patientFields: [
            { id: 'nombre', label: 'Nombre', value: 'Juan Pérez', type: 'text' },
            { id: 'rut', label: 'Rut', value: '12345678-9', type: 'text' },
            { id: 'fecnac', label: 'Fecha nacimiento', value: '1990-01-15', type: 'date' },
            { id: 'finf', label: 'Fecha informe', value: '2025-01-15', type: 'date' },
            { id: 'edad', label: 'Edad', value: '', type: 'text', readonly: true },
        ],
        sections: [
            { id: 'sec-1', title: 'Antecedentes', content: 'Contenido de antecedentes' },
            { id: 'sec-2', title: 'Diagnósticos', content: 'Diagnóstico principal' },
        ],
        medico: 'Dr. Test',
        especialidad: 'Medicina Interna',
    };
}

function setup(record?: ClinicalRecord) {
    const mockRecord = record || createMockRecord();
    const dispatchRecordCommand = vi.fn((command: ClinicalRecordCommand) => executeClinicalRecordCommand(mockRecord, command));
    const setIsEditing = vi.fn();
    const setActiveEditTarget = vi.fn();
    const clearActiveEditTarget = vi.fn();
    const setIsGlobalStructureEditing = vi.fn();

    const { result } = renderHook(() =>
        useRecordForm({
            dispatchRecordCommand,
            setIsEditing,
            setActiveEditTarget,
            clearActiveEditTarget,
            setIsGlobalStructureEditing,
        })
    );

    return {
        result,
        dispatchRecordCommand,
        setIsEditing,
        setActiveEditTarget,
        clearActiveEditTarget,
        setIsGlobalStructureEditing,
        mockRecord,
    };
}

describe('useRecordForm', () => {
    describe('activateEditTarget', () => {
        it('sets the edit target and enables editing', () => {
            const { result, setActiveEditTarget, setIsEditing } = setup();
            act(() => {
                result.current.activateEditTarget({ type: 'section-title', index: 0 });
            });
            expect(setActiveEditTarget).toHaveBeenCalledWith({ type: 'section-title', index: 0 });
            expect(setIsEditing).toHaveBeenCalledWith(true);
        });
    });

    describe('handlePatientFieldChange', () => {
        it('updates the patient field value via command dispatch', () => {
            const { result, dispatchRecordCommand } = setup();
            act(() => {
                result.current.handlePatientFieldChange(0, 'María García');
            });
            expect(dispatchRecordCommand).toHaveBeenCalledWith({ type: 'edit_patient_field', index: 0, value: 'María García' });
        });

        it('recalculates age when birth date changes', () => {
            const { result, dispatchRecordCommand } = setup();
            act(() => {
                result.current.handlePatientFieldChange(2, '2000-01-15'); // fecnac index = 2
            });
            const updated = dispatchRecordCommand.mock.results[0]?.value.record as ClinicalRecord;
            // With fecnac=2000-01-15 and finf=2025-01-15, edad should be ~25
            expect(updated.patientFields[4].value).toBe('25');
        });
    });

    describe('handlePatientLabelChange', () => {
        it('updates the patient field label', () => {
            const { result, dispatchRecordCommand } = setup();
            act(() => {
                result.current.handlePatientLabelChange(0, 'Paciente');
            });
            expect(dispatchRecordCommand).toHaveBeenCalledWith({ type: 'edit_patient_label', index: 0, label: 'Paciente' });
        });
    });

    describe('handleSectionContentChange', () => {
        it('updates the section content', () => {
            const { result, dispatchRecordCommand } = setup();
            act(() => {
                result.current.handleSectionContentChange(0, 'Nuevo contenido');
            });
            expect(dispatchRecordCommand).toHaveBeenCalledWith({ type: 'edit_section_content', index: 0, content: 'Nuevo contenido' });
        });
    });

    describe('handleSectionTitleChange', () => {
        it('updates the section title', () => {
            const { result, dispatchRecordCommand } = setup();
            act(() => {
                result.current.handleSectionTitleChange(1, 'Nuevo Título');
            });
            expect(dispatchRecordCommand).toHaveBeenCalledWith({ type: 'edit_section_title', index: 1, title: 'Nuevo Título' });
        });
    });

    describe('handleRemoveSection', () => {
        it('removes the section at the given index', () => {
            const { result, dispatchRecordCommand } = setup();
            act(() => {
                result.current.handleRemoveSection(0);
            });
            expect(dispatchRecordCommand).toHaveBeenCalledWith({ type: 'remove_section', index: 0 });
        });
    });

    describe('handleRemovePatientField', () => {
        it('removes the patient field at the given index', () => {
            const { result, dispatchRecordCommand } = setup();
            act(() => {
                result.current.handleRemovePatientField(1);
            });
            expect(dispatchRecordCommand).toHaveBeenCalledWith({ type: 'remove_patient_field', index: 1 });
        });
    });

    describe('handleAddSection', () => {
        it('adds a new section to the end', () => {
            const { result, dispatchRecordCommand } = setup();
            act(() => {
                result.current.handleAddSection({ id: 'sec-new', title: 'Plan', content: 'Nuevo plan' });
            });
            expect(dispatchRecordCommand).toHaveBeenCalledWith({
                type: 'add_section',
                section: { id: 'sec-new', title: 'Plan', content: 'Nuevo plan' },
            });
        });
    });

    describe('handleAddPatientField', () => {
        it('adds a new patient field to the end', () => {
            const { result, dispatchRecordCommand } = setup();
            act(() => {
                result.current.handleAddPatientField({ label: 'Teléfono', value: '', type: 'text' });
            });
            expect(dispatchRecordCommand).toHaveBeenCalledWith({
                type: 'add_patient_field',
                field: { label: 'Teléfono', value: '', type: 'text' },
            });
        });
    });

    describe('professional fields', () => {
        it('dispatches a command for medico and especialidad', () => {
            const { result, dispatchRecordCommand } = setup();
            act(() => {
                result.current.handleMedicoChange('Dr. House');
                result.current.handleEspecialidadChange('Urgencia');
            });

            expect(dispatchRecordCommand).toHaveBeenCalledWith({ type: 'edit_professional_field', field: 'medico', value: 'Dr. House' });
            expect(dispatchRecordCommand).toHaveBeenCalledWith({ type: 'edit_professional_field', field: 'especialidad', value: 'Urgencia' });
        });
    });

    describe('toggleGlobalStructureEditing', () => {
        it('toggles editing state via setIsGlobalStructureEditing', () => {
            const { result, setIsGlobalStructureEditing } = setup();
            act(() => {
                result.current.toggleGlobalStructureEditing();
            });
            expect(setIsGlobalStructureEditing).toHaveBeenCalledOnce();
        });
    });
});

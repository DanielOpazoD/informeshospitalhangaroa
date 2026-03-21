import { renderHook, act, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LOCAL_STORAGE_KEYS } from '../appConstants';
import { RecordProvider, useRecordContext } from '../contexts/RecordContext';
import type { ReactNode } from 'react';
import type { ClinicalRecordCommandResult } from '../application/clinicalRecordCommands';
import { installMockWindowStorage } from './testUtils';

// Wrapper to provide the RecordContext
const wrapper = ({ children }: { children: ReactNode }) => (
    <RecordProvider showToast={() => {}}>{children}</RecordProvider>
);

describe('RecordContext', () => {
    const storageRestorers: Array<() => void> = [];

    afterEach(() => {
        cleanup();
        storageRestorers.splice(0).forEach(restore => restore());
        vi.restoreAllMocks();
    });

    it('should initialize with default record values and non-editing state', () => {
        const { result } = renderHook(() => useRecordContext(), { wrapper });

        expect(result.current.record).toBeDefined();
        expect(result.current.record.patientFields.length).toBeGreaterThan(0);
        expect(result.current.isEditing).toBe(false);
        expect(result.current.hasUnsavedChanges).toBe(false);
    });

    it('should allow toggling the editing state', () => {
        const { result } = renderHook(() => useRecordContext(), { wrapper });

        act(() => {
            result.current.setIsEditing(true);
        });

        expect(result.current.isEditing).toBe(true);
    });

    it('should update patient fields and set hasUnsavedChanges', () => {
        const { result } = renderHook(() => useRecordContext(), { wrapper });

        act(() => {
            result.current.handlePatientFieldChange(0, 'John Doe');
        });

        expect(result.current.record.patientFields[0].value).toBe('John Doe');
        expect(result.current.hasUnsavedChanges).toBe(true);
    });

    it('no marca cambios sin guardar cuando un comando no altera el documento', () => {
        const { result } = renderHook(() => useRecordContext(), { wrapper });

        act(() => {
            result.current.handlePatientFieldChange(0, '');
        });

        expect(result.current.record.patientFields[0].value).toBe('');
        expect(result.current.hasUnsavedChanges).toBe(false);
    });

    it('bloquea comandos de edición mientras el workflow está guardando', () => {
        const { result } = renderHook(() => useRecordContext(), { wrapper });

        act(() => {
            result.current.dispatchWorkflow({ type: 'SAVE_REQUESTED' });
        });

        const blockedResult: ClinicalRecordCommandResult = result.current.dispatchRecordCommand({
            type: 'edit_patient_field',
            index: 0,
            value: 'John Doe',
        });

        expect(result.current.workflowState.status).toBe('saving');
        expect(result.current.record.patientFields[0].value).toBe('');
        expect(blockedResult.ok).toBe(false);
        if (!blockedResult.ok) {
            expect(blockedResult.errors[0]).toContain('No se puede editar el documento');
        }
    });

    it('should handle adding and removing sections', () => {
        const { result } = renderHook(() => useRecordContext(), { wrapper });

        const initialSectionCount = result.current.record.sections.length;

        act(() => {
            result.current.handleAddSection({ id: 'test-section', title: 'Test Section', content: 'Test Content' });
        });

        expect(result.current.record.sections.length).toBe(initialSectionCount + 1);
        expect(result.current.record.sections[initialSectionCount].title).toBe('Test Section');

        act(() => {
            result.current.handleRemoveSection(initialSectionCount);
        });

        expect(result.current.record.sections.length).toBe(initialSectionCount);
    });

    it('restaura un borrador persistido al iniciar', () => {
        const { values, restore } = installMockWindowStorage();
        storageRestorers.push(restore);
        values.set(LOCAL_STORAGE_KEYS.draft, JSON.stringify({
            timestamp: 123,
            record: {
                version: 'v14',
                templateId: '2',
                title: 'Recuperado',
                patientFields: [],
                sections: [],
                medico: '',
                especialidad: '',
            },
        }));

        const { result } = renderHook(() => useRecordContext(), { wrapper });

        expect(result.current.record.title).toBe('Recuperado');
        expect(result.current.lastLocalSave).toBe(123);
        expect(result.current.hasUnsavedChanges).toBe(false);
    });

    it('guarda borrador manual y agrega historial', () => {
        const { values, restore } = installMockWindowStorage();
        storageRestorers.push(restore);
        vi.spyOn(Date, 'now').mockReturnValue(456);
        const showToast = vi.fn();
        const saveWrapper = ({ children }: { children: ReactNode }) => (
            <RecordProvider showToast={showToast}>{children}</RecordProvider>
        );
        const { result } = renderHook(() => useRecordContext(), { wrapper: saveWrapper });

        act(() => {
            result.current.dispatchRecordCommand({ type: 'change_record_title', title: 'Nuevo título' });
        });

        act(() => {
            result.current.saveDraft('manual');
        });

        expect(values.get(LOCAL_STORAGE_KEYS.draft)).toContain('Nuevo título');
        expect(values.get(LOCAL_STORAGE_KEYS.history)).toContain('Nuevo título');
        expect(showToast).toHaveBeenCalledWith('Borrador guardado localmente.');
    });

    it('agrupa entradas consecutivas del historial dentro de la ventana configurada', () => {
        const { values, restore } = installMockWindowStorage();
        storageRestorers.push(restore);
        const showToast = vi.fn();
        const saveWrapper = ({ children }: { children: ReactNode }) => (
            <RecordProvider showToast={showToast}>{children}</RecordProvider>
        );
        const { result } = renderHook(() => useRecordContext(), { wrapper: saveWrapper });

        vi.spyOn(Date, 'now')
            .mockReturnValueOnce(1_000)
            .mockReturnValueOnce(2_000);

        act(() => {
            result.current.dispatchRecordCommand({ type: 'change_record_title', title: 'Primer título' });
            result.current.saveDraft('manual');
        });

        act(() => {
            result.current.dispatchRecordCommand({ type: 'change_record_title', title: 'Segundo título' });
            result.current.saveDraft('manual');
        });

        const persistedHistory = JSON.parse(values.get(LOCAL_STORAGE_KEYS.history) || '[]');
        expect(persistedHistory).toHaveLength(1);
        expect(persistedHistory[0]?.metadata?.groupKey).toBe('save:manual');
    });
});

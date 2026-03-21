import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ClinicalRecord } from '../types';
import { useRecordTitleController } from '../hooks/useRecordTitleController';

const buildRecord = (overrides?: Partial<ClinicalRecord>): ClinicalRecord => ({
    version: 'v14',
    templateId: '2',
    title: 'Evolución médica (____)',
    titleMode: 'auto',
    patientFields: [{ id: 'finf', label: 'Fecha del informe', value: '', type: 'date' }],
    sections: [],
    medico: '',
    especialidad: '',
    ...overrides,
});

describe('useRecordTitleController', () => {
    it('actualiza el título automático cuando cambia la fecha del informe', () => {
        const setRecord = vi.fn();
        const markRecordAsReplaced = vi.fn();

        renderHook(() => useRecordTitleController({
            record: buildRecord({
                patientFields: [{ id: 'finf', label: 'Fecha del informe', value: '2026-03-20', type: 'date' }],
            }),
            setRecord,
            markRecordAsReplaced,
        }));

        expect(markRecordAsReplaced).toHaveBeenCalled();
        expect(setRecord).toHaveBeenCalled();
    });

    it('no sobreescribe títulos personalizados al cambiar plantilla', () => {
        const setRecord = vi.fn();
        const { result } = renderHook(() => useRecordTitleController({
            record: buildRecord({ title: 'Título manual', titleMode: 'custom' }),
            setRecord,
            markRecordAsReplaced: vi.fn(),
        }));

        act(() => {
            result.current.handleTemplateChange('3');
        });

        const updater = setRecord.mock.calls[0][0] as (record: ClinicalRecord) => ClinicalRecord;
        const next = updater(buildRecord({ title: 'Título manual', titleMode: 'custom' }));
        expect(next.title).toBe('Título manual');
        expect(next.titleMode).toBe('custom');
    });

    it('marca el título como personalizado cuando el usuario lo edita', () => {
        const setRecord = vi.fn();
        const { result } = renderHook(() => useRecordTitleController({
            record: buildRecord(),
            setRecord,
            markRecordAsReplaced: vi.fn(),
        }));
        setRecord.mockClear();

        act(() => {
            result.current.handleRecordTitleChange('Nuevo título');
        });

        const updater = setRecord.mock.calls.at(-1)?.[0] as (record: ClinicalRecord) => ClinicalRecord;
        const next = updater(buildRecord());
        expect(next.title).toBe('Nuevo título');
        expect(next.titleMode).toBe('custom');
    });
});

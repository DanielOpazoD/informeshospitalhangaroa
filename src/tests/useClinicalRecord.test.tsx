import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LOCAL_STORAGE_KEYS } from '../appConstants';
import { useClinicalRecord } from '../hooks/useClinicalRecord';
import { createMockStorage } from './testUtils';

describe('useClinicalRecord', () => {
    it('recupera borrador persistido al iniciar', () => {
        const { storage, values } = createMockStorage();
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

        const { result } = renderHook(() => useClinicalRecord({
            onToast: vi.fn(),
            storage,
        }));

        expect(result.current.record.title).toBe('Recuperado');
        expect(result.current.lastLocalSave).toBe(123);
        expect(result.current.hasUnsavedChanges).toBe(false);
    });

    it('guarda borrador manual y agrega historial', () => {
        const { storage, values } = createMockStorage();
        const onToast = vi.fn();
        const { result } = renderHook(() => useClinicalRecord({ onToast, storage }));

        act(() => {
            result.current.setRecord(prev => ({ ...prev, title: 'Nuevo título' }));
        });

        act(() => {
            result.current.saveDraft('manual');
        });

        expect(values.get(LOCAL_STORAGE_KEYS.draft)).toContain('Nuevo título');
        expect(values.get(LOCAL_STORAGE_KEYS.history)).toContain('Nuevo título');
        expect(onToast).toHaveBeenCalledWith('Borrador guardado localmente.');
    });
});

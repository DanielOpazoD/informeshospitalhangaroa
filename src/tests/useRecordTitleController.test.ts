import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useRecordTitleController } from '../hooks/useRecordTitleController';

describe('useRecordTitleController', () => {
    it('no sobreescribe títulos personalizados al cambiar plantilla', () => {
        const dispatchRecordCommand = vi.fn();
        const { result } = renderHook(() => useRecordTitleController({
            dispatchRecordCommand,
        }));

        act(() => {
            result.current.handleTemplateChange('3');
        });

        expect(dispatchRecordCommand).toHaveBeenCalledWith({ type: 'change_template', templateId: '3' });
    });

    it('marca el título como personalizado cuando el usuario lo edita', () => {
        const dispatchRecordCommand = vi.fn();
        const { result } = renderHook(() => useRecordTitleController({
            dispatchRecordCommand,
        }));

        act(() => {
            result.current.handleRecordTitleChange('Nuevo título');
        });

        expect(dispatchRecordCommand).toHaveBeenCalledWith({ type: 'change_record_title', title: 'Nuevo título' });
    });
});

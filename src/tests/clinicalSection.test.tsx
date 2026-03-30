import React from 'react';
import { fireEvent, render, screen, act } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ClinicalSection from '../components/ClinicalSection';
import { MAX_IMAGE_PASTE_SIZE_BYTES } from '../appConstants';

const createProps = (): React.ComponentProps<typeof ClinicalSection> => ({
    section: {
        id: 'sec-1',
        title: 'Diagnóstico',
        content: 'Contenido inicial',
        kind: 'clinical-update',
        updateDate: '2026-03-19',
        updateTime: '10:30',
    },
    index: 0,
    isEditing: true,
    isAdvancedEditing: true,
    isGlobalStructureEditing: true,
    activeEditTarget: { type: 'section-title', index: 0 },
    onActivateEdit: vi.fn(),
    onSectionContentChange: vi.fn(),
    onSectionTitleChange: vi.fn(),
    onRemoveSection: vi.fn(),
    onUpdateSectionMeta: vi.fn(),
});

describe('ClinicalSection', () => {
    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('renderiza sección clínica editable con controles de actualización', () => {
        render(<ClinicalSection {...createProps()} />);

        expect(screen.getByText('Diagnóstico')).toBeTruthy();
        expect(screen.getByLabelText('Contenido de Diagnóstico - actualización clínica')).toBeTruthy();
        expect(screen.getByDisplayValue('2026-03-19')).toBeTruthy();
        expect(screen.getByDisplayValue('10:30')).toBeTruthy();
    });

    it('dispara edición de título, contenido, metadatos y eliminación', () => {
        const props = createProps();
        render(<ClinicalSection {...props} />);

        const title = screen.getByText('Diagnóstico');
        Object.defineProperty(title, 'innerText', { configurable: true, value: 'Nuevo título' });
        fireEvent.doubleClick(title);
        fireEvent.blur(title);

        const editor = screen.getByLabelText('Contenido de Diagnóstico - actualización clínica');
        (editor as HTMLDivElement).innerHTML = '<p>Nuevo contenido</p>';
        fireEvent.input(editor);
        fireEvent.focus(editor);
        fireEvent.blur(editor);

        fireEvent.change(screen.getByDisplayValue('2026-03-19'), { target: { value: '2026-03-20' } });
        fireEvent.change(screen.getByDisplayValue('10:30'), { target: { value: '11:45' } });
        fireEvent.click(screen.getByText('×'));

        expect(props.onActivateEdit).toHaveBeenCalledWith({ type: 'section-title', index: 0 });
        expect(props.onSectionTitleChange).toHaveBeenCalledWith(0, 'Nuevo título');
        expect(props.onSectionContentChange).toHaveBeenCalledWith(0, '<p>Nuevo contenido</p>');
        expect(props.onUpdateSectionMeta).toHaveBeenCalledWith(0, { updateDate: '2026-03-20' });
        expect(props.onUpdateSectionMeta).toHaveBeenCalledWith(0, { updateTime: '11:45' });
        expect(props.onRemoveSection).toHaveBeenCalledWith(0);
    });


    it('persiste sangría aplicada en edición al hacer blur', () => {
        const props = createProps();
        render(<ClinicalSection {...props} />);

        const editor = screen.getByLabelText('Contenido de Diagnóstico - actualización clínica') as HTMLDivElement;
        fireEvent.focus(editor);
        editor.innerHTML = '<p style="margin-left: 64px">Plan terapéutico</p>';

        fireEvent.input(editor);
        expect(props.onSectionContentChange).toHaveBeenCalledWith(
            0,
            '<blockquote><blockquote><p>Plan terapéutico</p></blockquote></blockquote>'
        );

        fireEvent.blur(editor);
        expect(props.onSectionContentChange).toHaveBeenLastCalledWith(
            0,
            '<blockquote><blockquote><p>Plan terapéutico</p></blockquote></blockquote>'
        );
    });

    // ── Paste validation ─────────────────────────────────────────────────
    it('muestra banner de error al pegar imagen que supera el límite de tamaño', async () => {
        const props = createProps();
        render(<ClinicalSection {...props} />);

        const editor = screen.getByLabelText('Contenido de Diagnóstico - actualización clínica');

        // Build an oversized file (limit + 1 byte)
        const oversizedFile = new File(
            [new Uint8Array(MAX_IMAGE_PASTE_SIZE_BYTES + 1)],
            'big.png',
            { type: 'image/png' }
        );

        const dataTransfer = {
            items: [
                {
                    type: 'image/png',
                    getAsFile: () => oversizedFile,
                },
            ],
            getData: () => '',
            files: [],
        };

        await act(async () => {
            fireEvent.paste(editor, { clipboardData: dataTransfer });
        });

        expect(screen.getByRole('alert')).toBeTruthy();
        expect(screen.getByRole('alert').textContent).toMatch(/supera el límite/);
    });

    it('no muestra banner de error al pegar imagen dentro del límite de tamaño', async () => {
        const props = createProps();
        render(<ClinicalSection {...props} />);

        const editor = screen.getByLabelText('Contenido de Diagnóstico - actualización clínica');

        // File under the limit — FileReader won't be invoked with a real URL in jsdom,
        // but we verify no error banner appears.
        const smallFile = new File(
            [new Uint8Array(100)],
            'small.png',
            { type: 'image/png' }
        );

        const dataTransfer = {
            items: [
                {
                    type: 'image/png',
                    getAsFile: () => smallFile,
                },
            ],
            getData: () => '',
            files: [],
        };

        await act(async () => {
            fireEvent.paste(editor, { clipboardData: dataTransfer });
        });

        expect(screen.queryByRole('alert')).toBeNull();
    });

    it('ignora el evento de paste cuando no hay imágenes', async () => {
        const props = createProps();
        render(<ClinicalSection {...props} />);

        const editor = screen.getByLabelText('Contenido de Diagnóstico - actualización clínica');

        const dataTransfer = {
            items: [{ type: 'text/plain', getAsFile: () => null }],
            getData: () => 'plain text',
            files: [],
        };

        await act(async () => {
            fireEvent.paste(editor, { clipboardData: dataTransfer });
        });

        // No error banner, no content change from paste
        expect(screen.queryByRole('alert')).toBeNull();
        expect(props.onSectionContentChange).not.toHaveBeenCalled();
    });

    it('mantiene el contenido en edición activa aunque cambien las props', () => {
        const props = createProps();
        const { rerender } = render(<ClinicalSection {...props} />);

        const editor = screen.getByLabelText('Contenido de Diagnóstico - actualización clínica') as HTMLDivElement;
        fireEvent.focus(editor);
        editor.innerHTML = '<p>Texto local</p>';

        rerender(
            <ClinicalSection
                {...props}
                section={{
                    ...props.section,
                    content: '<p>Contenido remoto</p>',
                }}
            />
        );

        expect(editor.innerHTML).toBe('<p>Texto local</p>');
    });
});

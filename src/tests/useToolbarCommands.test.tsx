import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useToolbarCommands } from '../hooks/useToolbarCommands';

describe('useToolbarCommands', () => {
    afterEach(() => {
        document.body.innerHTML = '';
        vi.restoreAllMocks();
    });

    it('llama a onZoomChange con delta positivo en zoom-in y negativo en zoom-out', () => {
        const onZoomChange = vi.fn();
        const { result } = renderHook(() => useToolbarCommands({ onZoomChange }));

        act(() => {
            result.current.handleToolbarCommand('zoom-in');
            result.current.handleToolbarCommand('zoom-out');
        });

        expect(onZoomChange).toHaveBeenNthCalledWith(1, +0.1);
        expect(onZoomChange).toHaveBeenNthCalledWith(2, -0.1);
    });

    it('ejecuta comandos sobre el último editable recordado y restaura la selección', () => {
        const execCommand = vi.fn(() => true);
        Object.defineProperty(document, 'execCommand', {
            configurable: true,
            value: execCommand,
        });
        const { result } = renderHook(() => useToolbarCommands({ onZoomChange: vi.fn() }));

        const editable = document.createElement('div');
        editable.className = 'note-area';
        editable.setAttribute('contenteditable', 'true');
        editable.textContent = 'Texto editable';
        document.body.appendChild(editable);

        const focusSpy = vi.spyOn(editable, 'focus');
        const textNode = editable.firstChild;
        const range = document.createRange();
        range.setStart(textNode!, 0);
        range.setEnd(textNode!, 5);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);

        result.current.lastEditableRef.current = editable;
        result.current.lastSelectionRef.current = range.cloneRange();

        act(() => {
            result.current.handleToolbarCommand('bold');
        });

        expect(focusSpy).toHaveBeenCalled();
        expect(execCommand).toHaveBeenCalledWith('bold', false);
        expect(result.current.lastEditableRef.current).toBe(editable);
        expect(result.current.lastSelectionRef.current).not.toBeNull();
    });

    it('aplica indent semántico con blockquote sin depender de execCommand para párrafos', () => {
        const execCommand = vi.fn(() => true);
        Object.defineProperty(document, 'execCommand', {
            configurable: true,
            value: execCommand,
        });
        const { result } = renderHook(() => useToolbarCommands({ onZoomChange: vi.fn() }));

        const editable = document.createElement('div');
        editable.className = 'note-area';
        editable.setAttribute('contenteditable', 'true');
        editable.innerHTML = '<p>Texto clínico</p>';
        document.body.appendChild(editable);

        const paragraph = editable.querySelector('p')!;
        const range = document.createRange();
        range.selectNodeContents(paragraph);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);

        result.current.lastEditableRef.current = editable;
        result.current.lastSelectionRef.current = range.cloneRange();

        act(() => {
            result.current.handleToolbarCommand('indent');
        });

        expect(editable.innerHTML).toBe('<blockquote><p>Texto clínico</p></blockquote>');
        expect(execCommand).not.toHaveBeenCalledWith('indent', false);
    });

    it('aplica indent semántico cuando el bloque editable es un div interno', () => {
        const execCommand = vi.fn(() => true);
        Object.defineProperty(document, 'execCommand', {
            configurable: true,
            value: execCommand,
        });
        const { result } = renderHook(() => useToolbarCommands({ onZoomChange: vi.fn() }));

        const editable = document.createElement('div');
        editable.className = 'note-area';
        editable.setAttribute('contenteditable', 'true');
        editable.innerHTML = '<div>Texto en div</div>';
        document.body.appendChild(editable);

        const block = editable.querySelector('div')!;
        const range = document.createRange();
        range.selectNodeContents(block);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);

        result.current.lastEditableRef.current = editable;
        result.current.lastSelectionRef.current = range.cloneRange();

        act(() => {
            result.current.handleToolbarCommand('indent');
        });

        expect(editable.innerHTML).toBe('<blockquote><div>Texto en div</div></blockquote>');
        expect(execCommand).not.toHaveBeenCalledWith('indent', false);
    });

    it('ignora comandos enriquecidos si no encuentra un editable activo', () => {
        const execCommand = vi.fn(() => true);
        Object.defineProperty(document, 'execCommand', {
            configurable: true,
            value: execCommand,
        });
        const { result } = renderHook(() => useToolbarCommands({ onZoomChange: vi.fn() }));

        act(() => {
            result.current.handleToolbarCommand('italic');
        });

        expect(execCommand).not.toHaveBeenCalled();
    });

    it('insert-table no borra contenido existente cuando no hay selección previa', () => {
        const execCommand = vi.fn(() => true);
        Object.defineProperty(document, 'execCommand', {
            configurable: true,
            value: execCommand,
        });
        const { result } = renderHook(() => useToolbarCommands({ onZoomChange: vi.fn() }));

        const editable = document.createElement('div');
        editable.setAttribute('contenteditable', 'true');
        editable.setAttribute('data-editor-area', '');
        editable.innerHTML = '<p>Contenido clínico importante</p>';
        document.body.appendChild(editable);

        result.current.lastEditableRef.current = editable;
        // No lastSelectionRef set — simulates no active selection

        act(() => {
            result.current.handleToolbarCommand('insert-table');
        });

        // The clinical text must survive; the table should have been appended
        expect(editable.innerHTML).toContain('Contenido clínico importante');
        expect(editable.querySelector('table')).not.toBeNull();
    });

    it('outdent desenvuelve un blockquote doble (dos niveles) en un solo paso', () => {
        const execCommand = vi.fn(() => true);
        Object.defineProperty(document, 'execCommand', {
            configurable: true,
            value: execCommand,
        });
        const { result } = renderHook(() => useToolbarCommands({ onZoomChange: vi.fn() }));

        const editable = document.createElement('div');
        editable.setAttribute('contenteditable', 'true');
        editable.setAttribute('data-editor-area', '');
        editable.innerHTML = '<blockquote><blockquote><p>Texto doble sangría</p></blockquote></blockquote>';
        document.body.appendChild(editable);

        const innerBlockquote = editable.querySelector('blockquote > blockquote') as HTMLElement;
        const range = document.createRange();
        range.selectNodeContents(innerBlockquote);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);

        result.current.lastEditableRef.current = editable;
        result.current.lastSelectionRef.current = range.cloneRange();

        act(() => {
            result.current.handleToolbarCommand('outdent');
        });

        // After one outdent the inner blockquote should be removed
        expect(editable.querySelector('blockquote > blockquote')).toBeNull();
        expect(editable.querySelector('blockquote')).not.toBeNull();
        expect(editable.innerHTML).toContain('Texto doble sangría');
        expect(execCommand).not.toHaveBeenCalledWith('outdent', false);
    });

    it('indent envuelve un elemento inline suelto creando un párrafo intermedio', () => {
        const execCommand = vi.fn(() => true);
        Object.defineProperty(document, 'execCommand', {
            configurable: true,
            value: execCommand,
        });
        const { result } = renderHook(() => useToolbarCommands({ onZoomChange: vi.fn() }));

        const editable = document.createElement('div');
        editable.setAttribute('contenteditable', 'true');
        editable.setAttribute('data-editor-area', '');
        // Plain text node directly inside editable (no wrapping <p>)
        editable.appendChild(document.createTextNode('Texto suelto'));
        document.body.appendChild(editable);

        const textNode = editable.firstChild!;
        const range = document.createRange();
        range.setStart(textNode, 0);
        range.setEnd(textNode, 6);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);

        result.current.lastEditableRef.current = editable;
        result.current.lastSelectionRef.current = range.cloneRange();

        act(() => {
            result.current.handleToolbarCommand('indent');
        });

        // A blockquote should now wrap the text
        expect(editable.querySelector('blockquote')).not.toBeNull();
        expect(editable.textContent).toContain('Texto suelto');
        expect(execCommand).not.toHaveBeenCalledWith('indent', false);
    });
});

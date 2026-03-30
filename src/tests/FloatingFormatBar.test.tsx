import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import FloatingFormatBar from '../components/FloatingFormatBar';

/**
 * Sets a non-collapsed selection inside a given element so that
 * getSelectionInsideEditor() considers it valid.
 */
const selectTextIn = (el: HTMLElement) => {
    el.textContent = 'texto seleccionable';
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
};

describe('FloatingFormatBar', () => {
    let onToolbarCommand: (command: string) => void;
    let onClosePinned: () => void;

    beforeEach(() => {
        onToolbarCommand = vi.fn();
        onClosePinned = vi.fn();
        document.body.innerHTML = '';
    });

    afterEach(() => {
        window.getSelection()?.removeAllRanges();
    });

    // ── Pinned mode ────────────────────────────────────────────────────────

    it('renderiza la barra cuando pinned=true aunque no haya selección', () => {
        render(
            <FloatingFormatBar
                onToolbarCommand={onToolbarCommand}
                pinned={true}
                onClosePinned={onClosePinned}
            />,
        );

        expect(screen.getByRole('toolbar')).toBeInTheDocument();
    });

    it('no renderiza la barra cuando pinned=false y no hay selección', () => {
        render(
            <FloatingFormatBar
                onToolbarCommand={onToolbarCommand}
                pinned={false}
                onClosePinned={onClosePinned}
            />,
        );

        expect(screen.queryByRole('toolbar')).toBeNull();
    });

    it('llama a onClosePinned al hacer mousedown fuera de la barra en modo pinned', () => {
        render(
            <FloatingFormatBar
                onToolbarCommand={onToolbarCommand}
                pinned={true}
                onClosePinned={onClosePinned}
            />,
        );

        fireEvent.mouseDown(document.body);
        expect(onClosePinned).toHaveBeenCalledOnce();
    });

    it('no llama a onClosePinned al hacer mousedown dentro de la barra', () => {
        render(
            <FloatingFormatBar
                onToolbarCommand={onToolbarCommand}
                pinned={true}
                onClosePinned={onClosePinned}
            />,
        );

        const toolbar = screen.getByRole('toolbar');
        fireEvent.mouseDown(toolbar);
        expect(onClosePinned).not.toHaveBeenCalled();
    });

    it('no llama a onClosePinned al hacer mousedown en el botón de toggle [data-format-toggle]', () => {
        const toggle = document.createElement('button');
        toggle.setAttribute('data-format-toggle', '');
        document.body.appendChild(toggle);

        render(
            <FloatingFormatBar
                onToolbarCommand={onToolbarCommand}
                pinned={true}
                onClosePinned={onClosePinned}
            />,
        );

        fireEvent.mouseDown(toggle);
        expect(onClosePinned).not.toHaveBeenCalled();
    });

    it('la barra en modo pinned tiene clase floating-format-bar--pinned', () => {
        render(
            <FloatingFormatBar
                onToolbarCommand={onToolbarCommand}
                pinned={true}
                onClosePinned={onClosePinned}
            />,
        );

        expect(screen.getByRole('toolbar').className).toContain('floating-format-bar--pinned');
    });

    // ── Buttons ────────────────────────────────────────────────────────────

    it('renderiza los 5 botones de formato esperados', () => {
        render(
            <FloatingFormatBar
                onToolbarCommand={onToolbarCommand}
                pinned={true}
                onClosePinned={onClosePinned}
            />,
        );

        const buttons = screen.getAllByRole('button');
        expect(buttons).toHaveLength(5);
        const titles = buttons.map(b => b.getAttribute('title'));
        expect(titles).toContain('Negrita');
        expect(titles).toContain('Cursiva');
        expect(titles).toContain('Subrayado');
        expect(titles).toContain('Reducir sangría');
        expect(titles).toContain('Aumentar sangría');
    });

    it('llama a onToolbarCommand con el comando correcto al hacer clic en bold', () => {
        render(
            <FloatingFormatBar
                onToolbarCommand={onToolbarCommand}
                pinned={true}
                onClosePinned={onClosePinned}
            />,
        );

        fireEvent.click(screen.getByTitle('Negrita'));
        expect(onToolbarCommand).toHaveBeenCalledWith('bold');
    });

    it('llama a onToolbarCommand con indent al hacer clic en Aumentar sangría', () => {
        render(
            <FloatingFormatBar
                onToolbarCommand={onToolbarCommand}
                pinned={true}
                onClosePinned={onClosePinned}
            />,
        );

        fireEvent.click(screen.getByTitle('Aumentar sangría'));
        expect(onToolbarCommand).toHaveBeenCalledWith('indent');
    });

    it('llama a onToolbarCommand con outdent al hacer clic en Reducir sangría', () => {
        render(
            <FloatingFormatBar
                onToolbarCommand={onToolbarCommand}
                pinned={true}
                onClosePinned={onClosePinned}
            />,
        );

        fireEvent.click(screen.getByTitle('Reducir sangría'));
        expect(onToolbarCommand).toHaveBeenCalledWith('outdent');
    });

    // ── Selection mode ─────────────────────────────────────────────────────

    it('no renderiza en modo selección para texto fuera de [data-editor-area]', () => {
        const outsideDiv = document.createElement('div');
        outsideDiv.textContent = 'texto fuera';
        document.body.appendChild(outsideDiv);
        selectTextIn(outsideDiv);

        render(
            <FloatingFormatBar
                onToolbarCommand={onToolbarCommand}
                pinned={false}
                onClosePinned={onClosePinned}
            />,
        );

        // Bar should not be visible — selection is outside the editor
        expect(screen.queryByRole('toolbar')).toBeNull();
    });
});

import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import EditorToolbar from '../components/EditorToolbar';

describe('EditorToolbar', () => {
    it('renders all toolbar buttons', () => {
        const onToolbarCommand = vi.fn();
        render(React.createElement(EditorToolbar, { onToolbarCommand }));

        // Text formatting buttons (ahora los títulos incluyen el shortcut)
        expect(screen.getByTitle('Negrita (Ctrl+B)')).toBeDefined();
        expect(screen.getByTitle('Cursiva (Ctrl+I)')).toBeDefined();
        expect(screen.getByTitle('Subrayado (Ctrl+U)')).toBeDefined();

        // Indent buttons
        expect(screen.getByTitle('Reducir sangría')).toBeDefined();
        expect(screen.getByTitle('Aumentar sangría')).toBeDefined();

        // Table button
        expect(screen.getByTitle('Insertar tabla 2×2')).toBeDefined();

        // Zoom buttons
        expect(screen.getByTitle('Alejar (zoom)')).toBeDefined();
        expect(screen.getByTitle('Acercar (zoom)')).toBeDefined();
    });

    it('calls onToolbarCommand with "bold" when B is clicked', () => {
        const onToolbarCommand = vi.fn();
        render(React.createElement(EditorToolbar, { onToolbarCommand }));
        fireEvent.click(screen.getByTitle('Negrita (Ctrl+B)'));
        expect(onToolbarCommand).toHaveBeenCalledWith('bold');
    });

    it('calls onToolbarCommand with "italic" when I is clicked', () => {
        const onToolbarCommand = vi.fn();
        render(React.createElement(EditorToolbar, { onToolbarCommand }));
        fireEvent.click(screen.getByTitle('Cursiva (Ctrl+I)'));
        expect(onToolbarCommand).toHaveBeenCalledWith('italic');
    });

    it('calls onToolbarCommand with "underline" when S is clicked', () => {
        const onToolbarCommand = vi.fn();
        render(React.createElement(EditorToolbar, { onToolbarCommand }));
        fireEvent.click(screen.getByTitle('Subrayado (Ctrl+U)'));
        expect(onToolbarCommand).toHaveBeenCalledWith('underline');
    });

    it('calls onToolbarCommand with "indent" when indent button is clicked', () => {
        const onToolbarCommand = vi.fn();
        render(React.createElement(EditorToolbar, { onToolbarCommand }));
        fireEvent.click(screen.getByTitle('Aumentar sangría'));
        expect(onToolbarCommand).toHaveBeenCalledWith('indent');
    });

    it('calls onToolbarCommand with "insert-table" when table button is clicked', () => {
        const onToolbarCommand = vi.fn();
        render(React.createElement(EditorToolbar, { onToolbarCommand }));
        fireEvent.click(screen.getByTitle('Insertar tabla 2×2'));
        expect(onToolbarCommand).toHaveBeenCalledWith('insert-table');
    });

    it('calls onToolbarCommand with "zoom-in" when + is clicked', () => {
        const onToolbarCommand = vi.fn();
        render(React.createElement(EditorToolbar, { onToolbarCommand }));
        fireEvent.click(screen.getByTitle('Acercar (zoom)'));
        expect(onToolbarCommand).toHaveBeenCalledWith('zoom-in');
    });

    it('prevents default on mouseDown to avoid losing focus', () => {
        const onToolbarCommand = vi.fn();
        render(React.createElement(EditorToolbar, { onToolbarCommand }));
        const boldButton = screen.getByTitle('Negrita (Ctrl+B)');
        const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
        const prevented = !boldButton.dispatchEvent(event);
        expect(prevented).toBe(true);
    });

    it('renders the advanced toolbar in two rows with two dividers on the second row', () => {
        const onToolbarCommand = vi.fn();
        const { container } = render(React.createElement(EditorToolbar, { onToolbarCommand }));
        const rows = container.querySelectorAll('.editor-toolbar-row');
        const dividers = container.querySelectorAll('.toolbar-divider');
        expect(rows.length).toBe(2);
        // Ahora hay 2 dividers: uno entre indent y tabla, otro entre tabla y zoom
        expect(dividers.length).toBe(2);
    });

    it('bold button has aria-pressed attribute for active state tracking', () => {
        const onToolbarCommand = vi.fn();
        render(React.createElement(EditorToolbar, { onToolbarCommand }));
        const boldButton = screen.getByTitle('Negrita (Ctrl+B)');
        // El atributo aria-pressed debe estar presente (para accesibilidad)
        expect(boldButton.hasAttribute('aria-pressed')).toBe(true);
    });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

describe('useKeyboardShortcuts', () => {
    const onSave = vi.fn();
    const onPrint = vi.fn();
    const onToggleEdit = vi.fn();
    const onRestore = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    const setup = () => {
        renderHook(() =>
            useKeyboardShortcuts({ onSave, onPrint, onToggleEdit, onRestore }),
        );
    };

    const fireShortcut = (key: string, meta = true) => {
        const event = new KeyboardEvent('keydown', {
            key,
            ctrlKey: !meta,
            metaKey: meta,
            bubbles: true,
            cancelable: true,
        });
        window.dispatchEvent(event);
    };

    it('calls onSave on Ctrl/Cmd+S', () => {
        setup();
        fireShortcut('s');
        expect(onSave).toHaveBeenCalledOnce();
    });

    it('calls onPrint on Ctrl/Cmd+P', () => {
        setup();
        fireShortcut('p');
        expect(onPrint).toHaveBeenCalledOnce();
    });

    it('calls onToggleEdit on Ctrl/Cmd+E', () => {
        setup();
        fireShortcut('e');
        expect(onToggleEdit).toHaveBeenCalledOnce();
    });

    it('calls onRestore on Ctrl/Cmd+N', () => {
        setup();
        fireShortcut('n');
        expect(onRestore).toHaveBeenCalledOnce();
    });

    it('does NOT trigger without modifier keys', () => {
        setup();
        const event = new KeyboardEvent('keydown', {
            key: 's',
            ctrlKey: false,
            metaKey: false,
            bubbles: true,
        });
        window.dispatchEvent(event);
        expect(onSave).not.toHaveBeenCalled();
    });

    it('ignores unrelated keys', () => {
        setup();
        fireShortcut('x');
        expect(onSave).not.toHaveBeenCalled();
        expect(onPrint).not.toHaveBeenCalled();
        expect(onToggleEdit).not.toHaveBeenCalled();
        expect(onRestore).not.toHaveBeenCalled();
    });
});

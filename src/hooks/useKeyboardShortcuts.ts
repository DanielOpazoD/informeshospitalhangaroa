import { useEffect, useCallback } from 'react';

/**
 * Callbacks for each keyboard shortcut.
 * All handlers should be memoized to avoid unnecessary re-registrations.
 */
interface UseKeyboardShortcutsOptions {
    onSave: () => void;
    onPrint: () => void;
    onToggleEdit: () => void;
    onRestore: () => void;
}

/**
 * Retorna true si el evento proviene de un elemento donde el usuario
 * está escribiendo texto (input, textarea, select, contenteditable).
 * En esos contextos los shortcuts globales deben ignorarse para no
 * interferir con la edición clínica.
 */
const isTypingContext = (event: KeyboardEvent): boolean => {
    const target = event.target as HTMLElement | null;
    if (!target) return false;
    const tag = target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
    if (target.isContentEditable) return true;
    if (typeof target.closest === 'function' && target.closest('[contenteditable="true"]')) return true;
    return false;
};

/**
 * Centralizes global keyboard shortcuts (Ctrl/Cmd + S/P/E and Ctrl/Cmd+Shift+N).
 * Prevents default browser behavior and delegates to the provided callbacks.
 * Se ignora automáticamente cuando el foco está en campos de texto o editores.
 *
 * Note: Ctrl+N is avoided because Firefox uses it to open a new window.
 * Ctrl+Shift+N is used for "restore/reset" instead.
 */
export function useKeyboardShortcuts({
    onSave,
    onPrint,
    onToggleEdit,
    onRestore,
}: UseKeyboardShortcutsOptions) {
    const handleShortcut = useCallback((event: KeyboardEvent) => {
        if (!event.ctrlKey && !event.metaKey) return;
        const key = event.key.toLowerCase();

        // Ctrl+S y Ctrl+P se permiten incluso en contextos de edición
        // (guardar y print son acciones globales esperadas por el usuario).
        // Ctrl+E y Ctrl+Shift+N sólo se disparan fuera de campos de texto.
        const allowInTypingContext = key === 's' || key === 'p';
        if (!allowInTypingContext && isTypingContext(event)) return;

        if (key === 's') {
            event.preventDefault();
            onSave();
        } else if (key === 'p') {
            event.preventDefault();
            onPrint();
        } else if (key === 'e') {
            event.preventDefault();
            onToggleEdit();
        } else if (key === 'n' && event.shiftKey) {
            event.preventDefault();
            onRestore();
        }
    }, [onSave, onPrint, onToggleEdit, onRestore]);

    useEffect(() => {
        window.addEventListener('keydown', handleShortcut);
        return () => window.removeEventListener('keydown', handleShortcut);
    }, [handleShortcut]);
}

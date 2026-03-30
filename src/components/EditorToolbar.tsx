import React, { useEffect, useState } from 'react';

interface EditorToolbarProps {
    onToolbarCommand: (command: string) => void;
}

/**
 * Detects active formatting at the current selection using computed styles
 * instead of the deprecated document.queryCommandState() API.
 */
const getActiveFormatsFromSelection = (): Set<string> => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return new Set();
    const node = selection.focusNode;
    const element = node instanceof HTMLElement ? node : node?.parentElement;
    if (!element) return new Set();

    const style = window.getComputedStyle(element);
    const active = new Set<string>();

    if (parseInt(style.fontWeight, 10) >= 700) active.add('bold');
    if (style.fontStyle === 'italic') active.add('italic');
    if (style.textDecorationLine.includes('underline')) active.add('underline');

    return active;
};

/**
 * Hook interno que detecta qué comandos de formato están activos
 * en la selección actual del editor, escuchando el evento selectionchange.
 * Permite iluminar los botones Bold/Italic/Underline cuando corresponde.
 */
const useActiveFormats = (): Set<string> => {
    const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());

    useEffect(() => {
        const updateActiveFormats = () => {
            const next = getActiveFormatsFromSelection();
            setActiveFormats(prev => {
                // Evitar re-render si no cambió nada
                const sameSize = prev.size === next.size;
                const sameContent = sameSize && [...prev].every(v => next.has(v));
                return sameContent ? prev : next;
            });
        };

        document.addEventListener('selectionchange', updateActiveFormats);
        return () => document.removeEventListener('selectionchange', updateActiveFormats);
    }, []);

    return activeFormats;
};

const EditorToolbar: React.FC<EditorToolbarProps> = ({ onToolbarCommand }) => {
    const activeFormats = useActiveFormats();

    const preventMouseDown = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
    };

    const buttons: Array<{ command: string; label: string; title: string; className?: string }> = [
        { command: 'bold', label: 'B', title: 'Negrita (Ctrl+B)' },
        { command: 'italic', label: 'I', title: 'Cursiva (Ctrl+I)', className: 'toolbar-italic' },
        { command: 'underline', label: 'S', title: 'Subrayado (Ctrl+U)', className: 'toolbar-underline' },
    ];

    const indentButtons: Array<{ command: string; label: string; title: string }> = [
        { command: 'outdent', label: '⇤', title: 'Reducir sangría' },
        { command: 'indent', label: '⇥', title: 'Aumentar sangría' },
    ];

    const tableButtons: Array<{ command: string; label: string; title: string }> = [
        { command: 'insert-table', label: '⊞', title: 'Insertar tabla 2×2' },
    ];

    const zoomButtons: Array<{ command: string; label: string; title: string }> = [
        { command: 'zoom-out', label: '−', title: 'Alejar (zoom)' },
        { command: 'zoom-in', label: '+', title: 'Acercar (zoom)' },
    ];

    return (
        <div className="editor-toolbar" role="toolbar" aria-label="Herramientas de edición avanzada">
            <div className="editor-toolbar-row">
                {buttons.map(btn => {
                    const isActive = activeFormats.has(btn.command);
                    return (
                        <button
                            key={btn.command}
                            type="button"
                            onMouseDown={preventMouseDown}
                            onClick={() => onToolbarCommand(btn.command)}
                            aria-label={`Aplicar ${btn.title.split(' ')[0].toLowerCase()}`}
                            aria-pressed={isActive}
                            title={btn.title}
                            className={isActive ? 'is-active' : undefined}
                        >
                            <span className={`toolbar-icon ${btn.className || ''}`}>{btn.label}</span>
                        </button>
                    );
                })}
            </div>
            <div className="editor-toolbar-row">
                {indentButtons.map(btn => (
                    <button
                        key={btn.command}
                        type="button"
                        onMouseDown={preventMouseDown}
                        onClick={() => onToolbarCommand(btn.command)}
                        aria-label={btn.title}
                        title={btn.title}
                    >
                        <span className="toolbar-icon">{btn.label}</span>
                    </button>
                ))}
                <span className="toolbar-divider" aria-hidden="true" />
                {tableButtons.map(btn => (
                    <button
                        key={btn.command}
                        type="button"
                        onMouseDown={preventMouseDown}
                        onClick={() => onToolbarCommand(btn.command)}
                        aria-label={btn.title}
                        title={btn.title}
                    >
                        <span className="toolbar-icon">{btn.label}</span>
                    </button>
                ))}
                <span className="toolbar-divider" aria-hidden="true" />
                {zoomButtons.map(btn => (
                    <button
                        key={btn.command}
                        type="button"
                        onMouseDown={preventMouseDown}
                        onClick={() => onToolbarCommand(btn.command)}
                        aria-label={btn.title}
                        title={btn.title}
                    >
                        <span className="toolbar-icon">{btn.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default EditorToolbar;

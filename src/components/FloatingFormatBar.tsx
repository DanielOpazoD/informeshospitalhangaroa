import React, { useEffect, useState, useCallback, useRef } from 'react';

interface FloatingFormatBarProps {
    onToolbarCommand: (command: string) => void;
    /** When true the bar is pinned (opened via the Format button) and stays
     *  visible until the user clicks outside it. */
    pinned: boolean;
    onClosePinned: () => void;
}

interface BarPosition {
    top: number;
    left: number;
}

const BUTTONS = [
    { command: 'bold',    label: 'B', title: 'Negrita',          className: '' },
    { command: 'italic',  label: 'I', title: 'Cursiva',           className: 'floating-bar-italic' },
    { command: 'underline', label: 'S', title: 'Subrayado',       className: 'floating-bar-underline' },
    { command: 'outdent', label: '⇤', title: 'Reducir sangría',   className: '' },
    { command: 'indent',  label: '⇥', title: 'Aumentar sangría',  className: '' },
];

const FloatingFormatBar: React.FC<FloatingFormatBarProps> = ({
    onToolbarCommand,
    pinned,
    onClosePinned,
}) => {
    const [selectionPos, setSelectionPos] = useState<BarPosition | null>(null);
    const barRef = useRef<HTMLDivElement>(null);
    const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const clearHideTimer = () => {
        if (hideTimerRef.current) {
            clearTimeout(hideTimerRef.current);
            hideTimerRef.current = null;
        }
    };

    const getSelectionInsideEditor = useCallback((): Range | null => {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null;
        const range = sel.getRangeAt(0);
        const container = range.commonAncestorContainer;
        const el = container instanceof HTMLElement ? container : container.parentElement;
        if (!el?.closest('[data-editor-area][contenteditable]')) return null;
        return range;
    }, []);

    const updateSelectionPosition = useCallback(() => {
        // In pinned mode, don't track the selection position
        if (pinned) return;

        const range = getSelectionInsideEditor();
        if (!range) {
            setSelectionPos(null);
            return;
        }
        const rect = range.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) {
            setSelectionPos(null);
            return;
        }

        const barWidth = 170;
        const barHeight = 36;
        const gap = 6;

        let top = rect.top - barHeight - gap + window.scrollY;
        if (top < window.scrollY + 4) top = rect.bottom + gap + window.scrollY;

        let left = rect.left + rect.width / 2 - barWidth / 2 + window.scrollX;
        left = Math.max(4, Math.min(left, window.innerWidth - barWidth - 4));

        setSelectionPos({ top, left });
    }, [pinned, getSelectionInsideEditor]);

    // Selection-mode listeners
    useEffect(() => {
        if (pinned) {
            setSelectionPos(null);
            return;
        }

        const handleMouseUp = (e: MouseEvent) => {
            if (barRef.current?.contains(e.target as Node)) return;
            clearHideTimer();
            hideTimerRef.current = setTimeout(updateSelectionPosition, 10);
        };

        const handleKeyUp = () => {
            clearHideTimer();
            hideTimerRef.current = setTimeout(updateSelectionPosition, 10);
        };

        const handleSelectionChange = () => {
            const sel = window.getSelection();
            if (!sel || sel.isCollapsed) {
                clearHideTimer();
                hideTimerRef.current = setTimeout(() => {
                    if (!getSelectionInsideEditor()) setSelectionPos(null);
                }, 150);
            }
        };

        document.addEventListener('mouseup', handleMouseUp);
        document.addEventListener('keyup', handleKeyUp);
        document.addEventListener('selectionchange', handleSelectionChange);

        return () => {
            clearHideTimer();
            document.removeEventListener('mouseup', handleMouseUp);
            document.removeEventListener('keyup', handleKeyUp);
            document.removeEventListener('selectionchange', handleSelectionChange);
        };
    }, [pinned, updateSelectionPosition, getSelectionInsideEditor]);

    // Pinned-mode: close when clicking outside the bar.
    // Exclude the format toggle button — its own onClick already handles the toggle.
    useEffect(() => {
        if (!pinned) return;

        const handleMouseDown = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (barRef.current?.contains(target)) return;
            if (target.closest('[data-format-toggle]')) return;
            onClosePinned();
        };

        document.addEventListener('mousedown', handleMouseDown);
        return () => document.removeEventListener('mousedown', handleMouseDown);
    }, [pinned, onClosePinned]);

    const handleCommand = (command: string) => (e: React.MouseEvent) => {
        e.preventDefault();
        onToolbarCommand(command);
        if (!pinned) setTimeout(updateSelectionPosition, 10);
    };

    const isVisible = pinned || selectionPos !== null;
    if (!isVisible) return null;

    return (
        <div
            ref={barRef}
            className={`floating-format-bar ${pinned ? 'floating-format-bar--pinned' : ''}`}
            style={pinned ? undefined : { top: selectionPos!.top, left: selectionPos!.left }}
            role="toolbar"
            aria-label="Formato"
        >
            {BUTTONS.map(btn => (
                <button
                    key={btn.command}
                    type="button"
                    onMouseDown={e => e.preventDefault()}
                    onClick={handleCommand(btn.command)}
                    title={btn.title}
                >
                    <span className={btn.className}>{btn.label}</span>
                </button>
            ))}
        </div>
    );
};

export default FloatingFormatBar;

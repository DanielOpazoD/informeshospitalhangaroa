import { useCallback, useRef } from 'react';

interface UseToolbarCommandsOptions {
    setSheetZoom: React.Dispatch<React.SetStateAction<number>>;
}

const getCurrentSelectionRange = (): Range | null => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;
    return selection.getRangeAt(0);
};

const getClosestEditableBlock = (range: Range, editable: HTMLElement): HTMLElement | null => {
    const startNode = range.startContainer;
    const startElement = startNode instanceof HTMLElement ? startNode : startNode.parentElement;
    if (!startElement) return null;

    const block = startElement.closest('p,blockquote,li,ul,ol') as HTMLElement | null;
    if (!block || !editable.contains(block)) return null;
    return block;
};

const nestElementInBlockquote = (target: HTMLElement): HTMLElement => {
    const blockquote = document.createElement('blockquote');
    target.replaceWith(blockquote);
    blockquote.appendChild(target);
    return blockquote;
};

const unwrapBlockquote = (blockquote: HTMLElement): HTMLElement | null => {
    const parent = blockquote.parentNode;
    if (!parent) return null;

    while (blockquote.firstChild) {
        parent.insertBefore(blockquote.firstChild, blockquote);
    }

    const nextElement = blockquote.previousElementSibling as HTMLElement | null;
    parent.removeChild(blockquote);
    return nextElement;
};

const updateSelectionAfterCommand = (selection: Selection | null, targetNode: Node | null): Range | null => {
    if (!selection || !targetNode) return null;
    const range = document.createRange();
    range.selectNodeContents(targetNode);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
    return range;
};

export function useToolbarCommands({ setSheetZoom }: UseToolbarCommandsOptions) {
    const lastEditableRef = useRef<HTMLElement | null>(null);
    const lastSelectionRef = useRef<Range | null>(null);

    const handleToolbarCommand = useCallback((command: string) => {
        if (command === 'zoom-in') {
            setSheetZoom(prev => {
                const next = Math.min(1.5, +(prev + 0.1).toFixed(2));
                return next;
            });
            return;
        }

        if (command === 'zoom-out') {
            setSheetZoom(prev => {
                const next = Math.max(0.7, +(prev - 0.1).toFixed(2));
                return next;
            });
            return;
        }

        const activeElement = document.activeElement as HTMLElement | null;
        let editable: HTMLElement | null = null;

        if (lastEditableRef.current && document.contains(lastEditableRef.current)) {
            editable = lastEditableRef.current;
        } else if (activeElement?.isContentEditable) {
            editable = activeElement;
        } else if (activeElement) {
            editable = activeElement.closest('[contenteditable]') as HTMLElement | null;
        }

        if (!editable) {
            const selection = window.getSelection();
            const focusNode = selection?.focusNode;
            const focusElement = focusNode instanceof HTMLElement ? focusNode : focusNode?.parentElement;
            editable = focusElement?.closest('[contenteditable]') as HTMLElement | null;
        }

        if (!editable) return;

        editable.focus({ preventScroll: true });

        const selection = window.getSelection();
        if (selection) {
            const storedRange = lastSelectionRef.current;
            if (storedRange) {
                const range = storedRange.cloneRange();
                selection.removeAllRanges();
                selection.addRange(range);
                lastSelectionRef.current = range;
            } else if (editable.childNodes.length > 0) {
                const range = document.createRange();
                range.selectNodeContents(editable);
                range.collapse(false);
                selection.removeAllRanges();
                selection.addRange(range);
                lastSelectionRef.current = range.cloneRange();
            }
        }

        let updatedRange: Range | null = null;

        if (command === 'indent' || command === 'outdent') {
            const range = getCurrentSelectionRange();
            const block = range ? getClosestEditableBlock(range, editable) : null;

            if (block && block.tagName !== 'LI') {
                if (command === 'indent') {
                    const nested = block.tagName === 'BLOCKQUOTE' ? nestElementInBlockquote(block) : nestElementInBlockquote(block);
                    updatedRange = updateSelectionAfterCommand(selection, nested);
                } else if (block.tagName === 'BLOCKQUOTE') {
                    const unwrappedSibling = unwrapBlockquote(block);
                    updatedRange = updateSelectionAfterCommand(selection, unwrappedSibling ?? editable);
                }
            }

            if (!updatedRange) {
                try {
                    document.execCommand(command, false);
                } catch (error) {
                    console.warn(`Comando no soportado: ${command}`, error);
                }
            }
        } else {
            try {
                document.execCommand(command, false);
            } catch (error) {
                console.warn(`Comando no soportado: ${command}`, error);
            }
        }

        const updatedSelection = window.getSelection();
        if (updatedRange) {
            lastSelectionRef.current = updatedRange.cloneRange();
        } else if (updatedSelection && updatedSelection.rangeCount > 0) {
            lastSelectionRef.current = updatedSelection.getRangeAt(0).cloneRange();
        }

        if (updatedSelection && updatedSelection.rangeCount > 0) {
            const focusNode = updatedSelection.focusNode;
            const focusElement = focusNode instanceof HTMLElement ? focusNode : focusNode?.parentElement;
            const updatedEditable = focusElement?.closest('.note-area[contenteditable]') as HTMLElement | null;
            if (updatedEditable) {
                lastEditableRef.current = updatedEditable;
            }
        }
    }, [setSheetZoom]);

    return { handleToolbarCommand, lastEditableRef, lastSelectionRef };
}

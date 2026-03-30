import { useCallback, useRef } from 'react';

interface UseToolbarCommandsOptions {
    /** Called with a positive delta (+0.1) or negative delta (-0.1) to adjust zoom. */
    onZoomChange: (delta: number) => void;
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

    const block = startElement.closest('p,blockquote,li,ul,ol,div') as HTMLElement | null;
    if (!block || !editable.contains(block)) return null;
    if (block === editable) return null;
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

export function useToolbarCommands({ onZoomChange }: UseToolbarCommandsOptions) {
    const lastEditableRef = useRef<HTMLElement | null>(null);
    const lastSelectionRef = useRef<Range | null>(null);

    const handleToolbarCommand = useCallback((command: string) => {
        if (command === 'zoom-in') {
            onZoomChange(+0.1);
            return;
        }

        if (command === 'zoom-out') {
            onZoomChange(-0.1);
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

        if (command === 'insert-table') {
            // Insertamos una tabla 2×2 básica en la posición del cursor.
            // Si no hay selección activa dentro del editable usamos el final del
            // contenido — pero NUNCA hacemos deleteContents() sobre una selección
            // que abarque todo el editable, ya que borraría todo el texto clínico.
            const existingRange = getCurrentSelectionRange();
            const rangeIsInsideEditable =
                existingRange &&
                editable.contains(existingRange.commonAncestorContainer);

            const range = rangeIsInsideEditable
                ? existingRange
                : (() => {
                    const r = document.createRange();
                    r.selectNodeContents(editable);
                    r.collapse(false);
                    return r;
                })();

            // Sólo eliminar contenido si la selección no es en modo "todo seleccionado"
            // (lo cual podría borrar accidentalmente el contenido completo).
            const selectionSpansWholeEditable =
                range.startContainer === editable &&
                range.endContainer === editable &&
                range.startOffset === 0 &&
                range.endOffset === editable.childNodes.length;

            if (selectionSpansWholeEditable) {
                range.collapse(false);
            }

            const table = document.createElement('table');
            const tbody = document.createElement('tbody');

            // Fila de encabezado
            const headerRow = document.createElement('tr');
            for (let col = 0; col < 2; col++) {
                const th = document.createElement('th');
                th.appendChild(document.createElement('br'));
                headerRow.appendChild(th);
            }
            tbody.appendChild(headerRow);

            // Fila de datos
            const dataRow = document.createElement('tr');
            for (let col = 0; col < 2; col++) {
                const td = document.createElement('td');
                td.appendChild(document.createElement('br'));
                dataRow.appendChild(td);
            }
            tbody.appendChild(dataRow);
            table.appendChild(tbody);

            // Párrafo vacío después de la tabla para poder seguir escribiendo
            const spacer = document.createElement('p');
            spacer.appendChild(document.createElement('br'));

            range.deleteContents();
            const fragment = document.createDocumentFragment();
            fragment.appendChild(table);
            fragment.appendChild(spacer);
            range.insertNode(fragment);

            // Colocar cursor en la primera celda (th)
            const firstCell = table.querySelector('th') as HTMLElement | null;
            if (firstCell && selection) {
                updatedRange = updateSelectionAfterCommand(selection, firstCell);
            }
        } else if (command === 'indent' || command === 'outdent') {
            const range = getCurrentSelectionRange();
            let block = range ? getClosestEditableBlock(range, editable) : null;

            // Fix: para "indent" cuando el cursor está en texto plano sin bloque envolvente,
            // crear un <p> alrededor del nodo de texto para que el indent tenga algo a qué aplicarse.
            if (command === 'indent' && !block && range) {
                const startNode = range.startContainer;
                const startParent = startNode instanceof HTMLElement ? startNode : startNode.parentElement;
                if (startParent && (startParent === editable || editable.contains(startParent))) {
                    const targetNode = startNode.nodeType === Node.TEXT_NODE ? startNode : null;
                    if (targetNode && targetNode.parentNode) {
                        const p = document.createElement('p');
                        targetNode.parentNode.insertBefore(p, targetNode);
                        p.appendChild(targetNode);
                        block = p;
                    }
                }
            }

            // Fix: para "outdent", si el bloque es un <p> (u otro no-BLOCKQUOTE) dentro de un
            // <blockquote>, subir al <blockquote> para poder desamidarlo correctamente.
            if (command === 'outdent' && block && block.tagName !== 'BLOCKQUOTE' && block.tagName !== 'LI') {
                const parentBlockquote = block.closest('blockquote') as HTMLElement | null;
                if (parentBlockquote && editable.contains(parentBlockquote)) {
                    block = parentBlockquote;
                }
            }

            if (block && block.tagName !== 'LI') {
                if (command === 'indent') {
                    // Save cursor position references before DOM manipulation.
                    const startContainer = range?.startContainer ?? null;
                    const startOffset = range?.startOffset ?? 0;
                    const endContainer = range?.endContainer ?? null;
                    const endOffset = range?.endOffset ?? 0;

                    nestElementInBlockquote(block);

                    // Restore cursor — the text nodes are still valid inside the
                    // moved block, just wrapped in an extra <blockquote>.
                    if (startContainer && selection) {
                        try {
                            const restored = document.createRange();
                            restored.setStart(startContainer, startOffset);
                            restored.setEnd(endContainer ?? startContainer, endOffset);
                            selection.removeAllRanges();
                            selection.addRange(restored);
                            updatedRange = restored;
                        } catch {
                            // Fallback: place cursor at end of indented block
                            updatedRange = updateSelectionAfterCommand(selection, block);
                        }
                    }
                } else if (block.tagName === 'BLOCKQUOTE') {
                    // Save cursor position references before DOM manipulation.
                    const startContainer = range?.startContainer ?? null;
                    const startOffset = range?.startOffset ?? 0;
                    const endContainer = range?.endContainer ?? null;
                    const endOffset = range?.endOffset ?? 0;

                    unwrapBlockquote(block);

                    if (startContainer && selection) {
                        try {
                            const restored = document.createRange();
                            restored.setStart(startContainer, startOffset);
                            restored.setEnd(endContainer ?? startContainer, endOffset);
                            selection.removeAllRanges();
                            selection.addRange(restored);
                            updatedRange = restored;
                        } catch {
                            updatedRange = updateSelectionAfterCommand(selection, editable);
                        }
                    }
                }

                // Notify the contentEditable that the DOM changed so React
                // state is updated immediately (programmatic DOM changes
                // don't fire the native input event).
                editable.dispatchEvent(new Event('input', { bubbles: true }));
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
            const updatedEditable = focusElement?.closest('[data-editor-area][contenteditable]') as HTMLElement | null;
            if (updatedEditable) {
                lastEditableRef.current = updatedEditable;
            }
        }
    }, [onZoomChange]);

    return { handleToolbarCommand, lastEditableRef, lastSelectionRef };
}

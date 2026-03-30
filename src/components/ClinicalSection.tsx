import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import type { ClinicalSectionData } from '../types';
import { sanitizeClinicalHtml } from '../utils/clinicalContentSanitizer';
import { MAX_IMAGE_PASTE_SIZE_BYTES } from '../appConstants';

interface ClinicalSectionProps {
    section: ClinicalSectionData;
    index: number;
    isEditing: boolean;
    isAdvancedEditing: boolean;
    isGlobalStructureEditing: boolean;
    activeEditTarget: { type: 'section-title'; index: number } | null;
    onActivateEdit: (target: { type: 'section-title'; index: number }) => void;
    onSectionContentChange: (index: number, content: string) => void;
    onSectionTitleChange: (index: number, title: string) => void;
    onRemoveSection: (index: number) => void;
    onUpdateSectionMeta?: (index: number, meta: Partial<ClinicalSectionData>) => void;
}

const ClinicalSection: React.FC<ClinicalSectionProps> = ({
    section,
    index,
    isEditing,
    isAdvancedEditing,
    isGlobalStructureEditing,
    activeEditTarget,
    onActivateEdit,
    onSectionContentChange,
    onSectionTitleChange,
    onRemoveSection,
    onUpdateSectionMeta,
}) => {
    const noteRef = useRef<HTMLDivElement>(null);
    const [isFocused, setIsFocused] = useState(false);
    const [pasteError, setPasteError] = useState<string | null>(null);
    const pasteErrorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastCommittedHtmlRef = useRef('');
    const isClinicalUpdate = section.kind === 'clinical-update';

    // Limpia el timer del banner de error de paste al desmontar el componente
    // para evitar llamar a setPasteError en un componente ya desmontado.
    useEffect(() => {
        return () => {
            if (pasteErrorTimerRef.current) {
                clearTimeout(pasteErrorTimerRef.current);
            }
        };
    }, []);
    const dateInputId = useMemo(() => `clinical-update-date-${index}`, [index]);
    const timeInputId = useMemo(() => `clinical-update-time-${index}`, [index]);

    const syncContent = useCallback(() => {
        const node = noteRef.current;
        if (!node) return;
        if (isFocused) return;
        const sanitized = sanitizeClinicalHtml(section.content || '');
        if (node.innerHTML !== sanitized.html) {
            node.innerHTML = sanitized.html;
        }
        lastCommittedHtmlRef.current = sanitized.html;
    }, [isFocused, section.content]);

    useEffect(() => {
        syncContent();
    }, [syncContent]);

    const publishSanitizedContent = useCallback((html: string, mutateDom: boolean) => {
        const node = noteRef.current;
        const sanitized = sanitizeClinicalHtml(html);

        if (node && mutateDom && node.innerHTML !== sanitized.html) {
            node.innerHTML = sanitized.html;
        }

        if (lastCommittedHtmlRef.current !== sanitized.html) {
            lastCommittedHtmlRef.current = sanitized.html;
            onSectionContentChange(index, sanitized.html);
        }

        return sanitized;
    }, [index, onSectionContentChange]);

    const handleInput = useCallback(() => {
        const node = noteRef.current;
        if (!node) return;
        publishSanitizedContent(node.innerHTML, false);
    }, [publishSanitizedContent]);

    const placeCaretAfterNode = useCallback((node: Node) => {
        const selection = window.getSelection();
        if (!selection) return;
        const range = document.createRange();
        range.setStartAfter(node);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
    }, []);

    const persistEditorContent = useCallback(() => {
        const node = noteRef.current;
        if (!node) return;
        publishSanitizedContent(node.innerHTML, true);
    }, [publishSanitizedContent]);

    const insertImageAtCursor = useCallback((dataUrl: string) => {
        const node = noteRef.current;
        if (!node) return;
        node.focus();

        const selection = window.getSelection();
        const hasSelectionInsideEditor = Boolean(
            selection &&
            selection.rangeCount > 0 &&
            selection.getRangeAt(0).commonAncestorContainer &&
            node.contains(selection.getRangeAt(0).commonAncestorContainer)
        );

        const range = hasSelectionInsideEditor
            ? selection!.getRangeAt(0)
            : (() => {
                const fallback = document.createRange();
                fallback.selectNodeContents(node);
                fallback.collapse(false);
                return fallback;
            })();

        const wrapper = document.createElement('span');
        wrapper.className = 'resizable-image-wrapper';
        wrapper.contentEditable = 'false';
        wrapper.style.width = '320px';

        const image = document.createElement('img');
        image.src = dataUrl;
        image.alt = 'Imagen pegada';
        image.className = 'editable-pasted-image';
        image.draggable = false;
        wrapper.appendChild(image);

        const spacer = document.createElement('p');
        spacer.innerHTML = '<br>';

        range.deleteContents();
        const fragment = document.createDocumentFragment();
        fragment.appendChild(wrapper);
        fragment.appendChild(spacer);
        range.insertNode(fragment);

        placeCaretAfterNode(spacer);
        // Dispatch input event so React state updates immediately after the
        // programmatic DOM change (persistEditorContent alone won't fire it).
        node.dispatchEvent(new Event('input', { bubbles: true }));
        persistEditorContent();
    }, [persistEditorContent, placeCaretAfterNode]);

    const showPasteError = useCallback((message: string) => {
        setPasteError(message);
        if (pasteErrorTimerRef.current) clearTimeout(pasteErrorTimerRef.current);
        pasteErrorTimerRef.current = setTimeout(() => setPasteError(null), 4000);
    }, []);

    const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key !== 'Enter' || event.shiftKey) return;

        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return;
        const range = sel.getRangeAt(0);

        const node = noteRef.current;
        if (!node) return;

        // Find the outermost blockquote that's a direct-ish child of the editor
        const startEl = range.startContainer instanceof HTMLElement
            ? range.startContainer
            : range.startContainer.parentElement;
        if (!startEl) return;

        const blockquote = startEl.closest('blockquote') as HTMLElement | null;
        if (!blockquote || !node.contains(blockquote)) return;

        // Find the outermost blockquote (in case of nested indentation)
        let outermost = blockquote;
        let parent = outermost.parentElement;
        while (parent && parent !== node && parent.tagName === 'BLOCKQUOTE') {
            outermost = parent;
            parent = outermost.parentElement;
        }

        event.preventDefault();

        // Extract the content after the cursor into a new paragraph outside
        // the blockquote. Content before the cursor stays indented.
        // Match <p>, <div>, or <li> so lists inside blockquotes are handled too.
        const afterRange = document.createRange();
        const innerBlock = startEl.closest('p,div,li') as HTMLElement | null;
        if (innerBlock && blockquote.contains(innerBlock)) {
            afterRange.setStart(range.endContainer, range.endOffset);
            const lastChild = innerBlock.lastChild;
            if (lastChild) {
                afterRange.setEndAfter(lastChild);
            } else {
                afterRange.setEnd(innerBlock, 0);
            }
        } else {
            afterRange.setStart(range.endContainer, range.endOffset);
            const lastChild = blockquote.lastChild;
            if (lastChild) {
                afterRange.setEndAfter(lastChild);
            } else {
                afterRange.setEnd(blockquote, 0);
            }
        }

        const afterContents = afterRange.extractContents();

        const newP = document.createElement('p');
        if (afterContents.textContent?.trim() || afterContents.querySelector('br,img')) {
            newP.appendChild(afterContents);
        } else {
            newP.appendChild(document.createElement('br'));
        }

        // Insert the new unindented paragraph right after the outermost blockquote
        outermost.insertAdjacentElement('afterend', newP);

        // Place cursor at the start of the new paragraph
        const newRange = document.createRange();
        newRange.setStart(newP, 0);
        newRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(newRange);

        // Notify React of the DOM change
        node.dispatchEvent(new Event('input', { bubbles: true }));
    }, []);

    const handlePaste = useCallback((event: React.ClipboardEvent<HTMLDivElement>) => {
        const clipboardItems = Array.from(event.clipboardData?.items || []);
        const imageItems = clipboardItems.filter(item => item.type.startsWith('image/'));
        if (imageItems.length === 0) return;

        event.preventDefault();
        imageItems.forEach(item => {
            const file = item.getAsFile();
            if (!file) return;

            // Validación de tamaño: rechaza imágenes mayores a MAX_IMAGE_PASTE_SIZE_BYTES
            if (file.size > MAX_IMAGE_PASTE_SIZE_BYTES) {
                const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
                const limitMB = (MAX_IMAGE_PASTE_SIZE_BYTES / (1024 * 1024)).toFixed(0);
                showPasteError(`La imagen (${sizeMB} MB) supera el límite de ${limitMB} MB. Redúcela antes de pegarla.`);
                return;
            }

            const reader = new FileReader();
            reader.onload = () => {
                const dataUrl = typeof reader.result === 'string' ? reader.result : '';
                if (!dataUrl) return;
                insertImageAtCursor(dataUrl);
            };
            reader.readAsDataURL(file);
        });
    }, [insertImageAtCursor, showPasteError]);

    const handleMetaChange = useCallback(
        (field: 'updateDate' | 'updateTime', value: string) => {
            if (!onUpdateSectionMeta) return;
            onUpdateSectionMeta(index, { [field]: value });
        },
        [index, onUpdateSectionMeta]
    );

    const isActiveSectionTitle = activeEditTarget?.type === 'section-title' && activeEditTarget.index === index;

    const sectionTitle = (
        <div
            className="subtitle"
            contentEditable={isEditing && isActiveSectionTitle}
            suppressContentEditableWarning
            onDoubleClick={() => onActivateEdit({ type: 'section-title', index })}
            onBlur={e => onSectionTitleChange(index, e.currentTarget.innerText)}
        >
            {section.title}
        </div>
    );

    return (
        <div
            className={`sec ${isAdvancedEditing && isFocused ? 'advanced-note-active' : ''} ${isClinicalUpdate ? 'clinical-update-section' : ''}`.trim()}
            data-section
        >
            {isEditing && (isGlobalStructureEditing || isActiveSectionTitle) && (
                <button className="sec-del" onClick={() => onRemoveSection(index)}>×</button>
            )}
            {isClinicalUpdate ? (
                <div className="clinical-update-header">
                    {sectionTitle}
                    <div className="clinical-update-meta">
                        <label htmlFor={dateInputId}>Fecha:</label>
                        <input
                            id={dateInputId}
                            type="date"
                            className="inp clinical-update-input"
                            value={section.updateDate || ''}
                            onChange={event => handleMetaChange('updateDate', event.target.value)}
                        />
                        <label htmlFor={timeInputId}>Hora:</label>
                        <input
                            id={timeInputId}
                            type="time"
                            className="inp clinical-update-input time-input"
                            value={section.updateTime || ''}
                            onChange={event => handleMetaChange('updateTime', event.target.value)}
                        />
                    </div>
                </div>
            ) : (
                sectionTitle
            )}
            {pasteError && (
                <div className="paste-error-banner" role="alert" aria-live="polite">
                    {pasteError}
                </div>
            )}
            <div
                ref={noteRef}
                className={`txt note-area ${isAdvancedEditing ? 'advanced-mode' : ''} ${isAdvancedEditing && isFocused ? 'is-focused' : ''}`.trim()}
                contentEditable
                suppressContentEditableWarning
                data-editor-area
                role="textbox"
                aria-multiline="true"
                aria-label={`Contenido de ${section.title || 'sección clínica'}${isClinicalUpdate ? ' - actualización clínica' : ''}`}
                onInput={handleInput}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                onBlur={event => {
                    setIsFocused(false);
                    publishSanitizedContent(event.currentTarget.innerHTML, true);
                }}
                onMouseUp={event => {
                    const target = event.target as HTMLElement;
                    if (target.closest('.resizable-image-wrapper')) {
                        persistEditorContent();
                    }
                }}
                onFocus={() => {
                    setIsFocused(true);
                    syncContent();
                }}
            />
        </div>
    );
};

export default ClinicalSection;

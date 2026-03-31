import React, { useRef, useEffect, useCallback, useState } from 'react';
import type { ClinicalSectionData } from '../types';
import { sanitizeClinicalHtml } from '../utils/clinicalContentSanitizer';
import {
    PLAN_SUBSECTIONS,
    buildPlanSectionContent,
    parsePlanSectionContent,
    type PlanSubsectionId,
} from '../utils/planSectionUtils';

// ── Types ─────────────────────────────────────────────────────────────────────

interface PlanSectionProps {
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
}

interface SubsectionEditorProps {
    subsectionId: PlanSubsectionId;
    title: string;
    content: string;
    isAdvancedEditing: boolean;
    onChange: (id: PlanSubsectionId, content: string) => void;
}

// ── SubsectionEditor ──────────────────────────────────────────────────────────

const SubsectionEditor: React.FC<SubsectionEditorProps> = ({
    subsectionId,
    title,
    content,
    isAdvancedEditing,
    onChange,
}) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const [isFocused, setIsFocused] = useState(false);
    const lastCommittedRef = useRef('');

    const syncContent = useCallback(() => {
        const node = editorRef.current;
        if (!node || isFocused) return;
        const sanitized = sanitizeClinicalHtml(content || '');
        if (node.innerHTML !== sanitized.html) {
            node.innerHTML = sanitized.html;
        }
        lastCommittedRef.current = sanitized.html;
    }, [isFocused, content]);

    useEffect(() => {
        syncContent();
    }, [syncContent]);

    const publishContent = useCallback((html: string) => {
        const sanitized = sanitizeClinicalHtml(html);
        if (lastCommittedRef.current !== sanitized.html) {
            lastCommittedRef.current = sanitized.html;
            onChange(subsectionId, sanitized.html);
        }
    }, [subsectionId, onChange]);

    return (
        <div className="plan-subsection">
            <div className="plan-subsection-label">{title}</div>
            <div
                ref={editorRef}
                className={`txt note-area plan-subsection-editor ${isAdvancedEditing ? 'advanced-mode' : ''} ${isAdvancedEditing && isFocused ? 'is-focused' : ''}`.trim()}
                contentEditable
                suppressContentEditableWarning
                data-editor-area
                role="textbox"
                aria-multiline="true"
                aria-label={`Contenido de ${title}`}
                onInput={() => {
                    const node = editorRef.current;
                    if (node) publishContent(node.innerHTML);
                }}
                onBlur={e => {
                    setIsFocused(false);
                    publishContent(e.currentTarget.innerHTML);
                }}
                onFocus={() => {
                    setIsFocused(true);
                    syncContent();
                }}
            />
        </div>
    );
};

// ── PlanSection ───────────────────────────────────────────────────────────────

const PlanSection: React.FC<PlanSectionProps> = ({
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
}) => {
    const subsectionsRef = useRef(parsePlanSectionContent(section.content));

    // Re-parse when content changes from outside (undo/redo, import, etc.)
    const prevContentRef = useRef(section.content);
    if (section.content !== prevContentRef.current) {
        prevContentRef.current = section.content;
        subsectionsRef.current = parsePlanSectionContent(section.content);
    }

    const handleSubsectionChange = useCallback(
        (id: PlanSubsectionId, content: string) => {
            subsectionsRef.current = { ...subsectionsRef.current, [id]: content };
            onSectionContentChange(index, buildPlanSectionContent(subsectionsRef.current));
        },
        [index, onSectionContentChange],
    );

    const isActiveSectionTitle =
        activeEditTarget?.type === 'section-title' && activeEditTarget.index === index;

    return (
        <div className="sec plan-section" data-section>
            {isEditing && (isGlobalStructureEditing || isActiveSectionTitle) && (
                <button className="sec-del" onClick={() => onRemoveSection(index)}>×</button>
            )}

            <div
                className="subtitle"
                contentEditable={isEditing && isActiveSectionTitle}
                suppressContentEditableWarning
                onDoubleClick={() => onActivateEdit({ type: 'section-title', index })}
                onBlur={e => onSectionTitleChange(index, e.currentTarget.innerText)}
            >
                {section.title}
            </div>

            <div className="plan-subsections">
                {PLAN_SUBSECTIONS.map(({ id, title }) => (
                    <SubsectionEditor
                        key={id}
                        subsectionId={id}
                        title={title}
                        content={subsectionsRef.current[id]}
                        isAdvancedEditing={isAdvancedEditing}
                        onChange={handleSubsectionChange}
                    />
                ))}
            </div>
        </div>
    );
};

export default PlanSection;

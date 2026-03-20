import { useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';

interface UseDocumentEffectsParams {
    appTitle: string;
    isAdvancedEditing: boolean;
    isEditing: boolean;
    clearActiveEditTarget: () => void;
    setIsEditing: Dispatch<SetStateAction<boolean>>;
    setIsGlobalStructureEditing: Dispatch<SetStateAction<boolean>>;
    lastEditableRef: MutableRefObject<HTMLElement | null>;
    lastSelectionRef: MutableRefObject<Range | null>;
}

export const useDocumentEffects = ({
    appTitle,
    isAdvancedEditing,
    isEditing,
    clearActiveEditTarget,
    setIsEditing,
    setIsGlobalStructureEditing,
    lastEditableRef,
    lastSelectionRef,
}: UseDocumentEffectsParams) => {
    useEffect(() => {
        document.body.dataset.theme = 'light';
    }, []);

    useEffect(() => {
        document.title = appTitle;
    }, [appTitle]);

    useEffect(() => {
        if (typeof document === 'undefined') return;
        document.body.classList.toggle('advanced-editing-active', isAdvancedEditing);
        return () => {
            document.body.classList.remove('advanced-editing-active');
        };
    }, [isAdvancedEditing]);

    useEffect(() => {
        const handleFocusIn = (event: FocusEvent) => {
            const target = event.target as HTMLElement | null;
            if (!target) return;
            const editable = target.closest('.note-area[contenteditable]') as HTMLElement | null;
            if (!editable) return;
            lastEditableRef.current = editable;
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
                lastSelectionRef.current = selection.getRangeAt(0).cloneRange();
            }
        };

        const handleSelectionChange = () => {
            const selection = window.getSelection();
            if (!selection || selection.rangeCount === 0) return;
            const focusNode = selection.focusNode;
            if (!focusNode) return;
            const focusElement = focusNode instanceof HTMLElement ? focusNode : focusNode.parentElement;
            if (!focusElement) return;
            const editable = focusElement.closest('.note-area[contenteditable]') as HTMLElement | null;
            if (!editable) return;
            lastEditableRef.current = editable;
            lastSelectionRef.current = selection.getRangeAt(0).cloneRange();
        };

        document.addEventListener('focusin', handleFocusIn);
        document.addEventListener('selectionchange', handleSelectionChange);
        return () => {
            document.removeEventListener('focusin', handleFocusIn);
            document.removeEventListener('selectionchange', handleSelectionChange);
        };
    }, [lastEditableRef, lastSelectionRef]);

    useEffect(() => {
        if (!isEditing) return;

        const handleOutsideClick = (event: MouseEvent) => {
            const target = event.target as Node | null;
            if (!(target instanceof Element)) return;

            if (target.closest('.topbar')) return;
            if (target.closest('#sheet')) return;
            if (target.closest('#editPanel')) return;

            setIsEditing(false);
            clearActiveEditTarget();
        };

        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, [clearActiveEditTarget, isEditing, setIsEditing]);

    useEffect(() => {
        if (!isEditing) {
            clearActiveEditTarget();
            setIsGlobalStructureEditing(false);
        }
    }, [clearActiveEditTarget, isEditing, setIsGlobalStructureEditing]);
};

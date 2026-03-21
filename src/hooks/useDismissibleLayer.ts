import { useEffect, useRef } from 'react';

interface UseDismissibleLayerOptions {
    isOpen: boolean;
    onDismiss: () => void;
}

export const useDismissibleLayer = <T extends HTMLElement>({ isOpen, onDismiss }: UseDismissibleLayerOptions) => {
    const ref = useRef<T>(null);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const handlePointerDown = (event: MouseEvent) => {
            const target = event.target as Node;
            if (ref.current && !ref.current.contains(target)) {
                onDismiss();
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onDismiss();
            }
        };

        document.addEventListener('mousedown', handlePointerDown);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen, onDismiss]);

    return ref;
};

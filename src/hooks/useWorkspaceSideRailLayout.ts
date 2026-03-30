import { useEffect, useMemo, useRef, useState } from 'react';
import type React from 'react';

interface WorkspaceSideRailLayout {
    headerHostRef: React.RefObject<HTMLDivElement | null>;
    integrationPanelHostRef: React.RefObject<HTMLDivElement | null>;
    sheetRef: React.RefObject<HTMLDivElement | null>;
    stickyLayoutStyle: React.CSSProperties;
    sideRailStyle: React.CSSProperties;
}

export const useWorkspaceSideRailLayout = (sheetZoom: number): WorkspaceSideRailLayout => {
    const headerHostRef = useRef<HTMLDivElement | null>(null);
    const integrationPanelHostRef = useRef<HTMLDivElement | null>(null);
    const sheetRef = useRef<HTMLDivElement | null>(null);
    const [topbarHeight, setTopbarHeight] = useState(0);
    const [integrationPanelHeight, setIntegrationPanelHeight] = useState(0);
    const [sideRailLeft, setSideRailLeft] = useState(16);
    const [sideRailWidth, setSideRailWidth] = useState(220);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        const updateOffsets = () => {
            setTopbarHeight(headerHostRef.current?.getBoundingClientRect().height ?? 0);
            setIntegrationPanelHeight(integrationPanelHostRef.current?.getBoundingClientRect().height ?? 0);

            if (!sheetRef.current) {
                return;
            }

            const sheetRect = sheetRef.current.getBoundingClientRect();
            const nextLeft = Math.max(16, Math.round(sheetRect.right + 18));
            const availableWidth = Math.max(180, Math.floor(window.innerWidth - nextLeft - 16));
            setSideRailLeft(nextLeft);
            setSideRailWidth(Math.min(240, availableWidth));
        };

        updateOffsets();

        const ResizeObserverCtor = window.ResizeObserver;
        const resizeObserver = typeof ResizeObserverCtor !== 'undefined'
            ? new ResizeObserverCtor(() => updateOffsets())
            : null;

        if (resizeObserver && headerHostRef.current) {
            resizeObserver.observe(headerHostRef.current);
        }
        if (resizeObserver && integrationPanelHostRef.current) {
            resizeObserver.observe(integrationPanelHostRef.current);
        }
        if (resizeObserver && sheetRef.current) {
            resizeObserver.observe(sheetRef.current);
        }

        window.addEventListener('resize', updateOffsets);
        return () => {
            resizeObserver?.disconnect();
            window.removeEventListener('resize', updateOffsets);
        };
    }, [sheetZoom]);

    const stickyLayoutStyle = useMemo(() => ({
        '--topbar-height': `${topbarHeight}px`,
        '--toolbar-top-offset': `${topbarHeight + integrationPanelHeight + 12}px`,
    } as React.CSSProperties), [integrationPanelHeight, topbarHeight]);

    const sideRailStyle = useMemo(() => ({
        '--side-rail-left': `${sideRailLeft}px`,
        '--side-rail-width': `${sideRailWidth}px`,
    } as React.CSSProperties), [sideRailLeft, sideRailWidth]);

    return {
        headerHostRef,
        integrationPanelHostRef,
        sheetRef,
        stickyLayoutStyle,
        sideRailStyle,
    };
};

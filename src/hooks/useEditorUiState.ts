import { useEffect, useMemo, useState } from 'react';

interface UseEditorUiStateParams {
    lastLocalSave: number | null;
    hasUnsavedChanges: boolean;
}

const formatCompactSaveAge = (timestamp: number, reference = Date.now()): string => {
    const diff = Math.max(0, reference - timestamp);
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return 'Ahora';
    if (minutes < 60) return `Hace ${minutes} min.`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Hace ${hours} h.`;

    const days = Math.floor(hours / 24);
    return `Hace ${days} d.`;
};

export const useEditorUiState = ({ lastLocalSave, hasUnsavedChanges }: UseEditorUiStateParams) => {
    const [nowTick, setNowTick] = useState(Date.now());
    const [isAdvancedEditing, setIsAdvancedEditing] = useState(false);
    const [isAiAssistantVisible, setIsAiAssistantVisible] = useState(false);
    const [sheetZoom, setSheetZoom] = useState(1);
    const [aiPanelWidth, setAiPanelWidth] = useState(420);

    useEffect(() => {
        const timer = window.setInterval(() => setNowTick(Date.now()), 60000);
        return () => window.clearInterval(timer);
    }, []);

    const saveStatusLabel = useMemo(() => {
        if (!lastLocalSave) return 'Sin guardados aún';
        if (hasUnsavedChanges) return 'Sin guardar';
        return 'Guardado local';
    }, [hasUnsavedChanges, lastLocalSave, nowTick]);

    const lastSaveTime = useMemo(() => {
        if (!lastLocalSave) return '';
        if (hasUnsavedChanges) return '';
        return formatCompactSaveAge(lastLocalSave, nowTick);
    }, [hasUnsavedChanges, lastLocalSave, nowTick]);

    return {
        isAdvancedEditing,
        setIsAdvancedEditing,
        isAiAssistantVisible,
        setIsAiAssistantVisible,
        sheetZoom,
        setSheetZoom,
        aiPanelWidth,
        setAiPanelWidth,
        saveStatusLabel,
        lastSaveTime,
    };
};

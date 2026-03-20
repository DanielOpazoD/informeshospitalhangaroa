import { useEffect, useMemo, useState } from 'react';
import { formatTimeSince } from '../utils/validationUtils';

interface UseEditorUiStateParams {
    lastLocalSave: number | null;
    hasUnsavedChanges: boolean;
}

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
        if (hasUnsavedChanges) return 'Cambios sin guardar';
        return `Guardado ${formatTimeSince(lastLocalSave, nowTick)}`;
    }, [hasUnsavedChanges, lastLocalSave, nowTick]);

    const lastSaveTime = useMemo(() => {
        if (!lastLocalSave) return '';
        return new Date(lastLocalSave).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
    }, [lastLocalSave]);

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

import { useCallback, useMemo, type Dispatch, type SetStateAction } from 'react';
import type { ClinicalRecord } from '../types';
import { persistSettings } from '../utils/settingsStorage';
import { buildAiConversationKey, buildFullRecordContext, mapSectionsForAi } from '../utils/aiContext';

interface UseAiAssistantControllerParams {
    record: ClinicalRecord;
    aiApiKey: string;
    aiProjectId: string;
    aiModel: string;
    envGeminiApiKey: string;
    envGeminiProjectId: string;
    envGeminiModel: string;
    recommendedModel: string;
    setAiModel: Dispatch<SetStateAction<string>>;
    onToast: (message: string, type?: 'success' | 'warning' | 'error') => void;
}

export const useAiAssistantController = ({
    record,
    aiApiKey,
    aiProjectId,
    aiModel,
    envGeminiApiKey,
    envGeminiProjectId,
    envGeminiModel,
    recommendedModel,
    setAiModel,
    onToast,
}: UseAiAssistantControllerParams) => {
    const resolvedAiApiKey = useMemo(() => aiApiKey || envGeminiApiKey, [aiApiKey, envGeminiApiKey]);
    const resolvedAiProjectId = useMemo(() => aiProjectId || envGeminiProjectId, [aiProjectId, envGeminiProjectId]);
    const allowAiAutoSelection = useMemo(() => {
        if (envGeminiModel) return false;
        return !aiModel || aiModel === recommendedModel;
    }, [aiModel, envGeminiModel, recommendedModel]);
    const resolvedAiModel = useMemo(() => aiModel || envGeminiModel || recommendedModel, [aiModel, envGeminiModel, recommendedModel]);
    const fullRecordContext = useMemo(() => buildFullRecordContext(record), [record]);
    const aiSections = useMemo(() => mapSectionsForAi(record.sections), [record.sections]);
    const aiConversationKey = useMemo(() => buildAiConversationKey(record), [record]);

    const handleAutoSelectAiModel = useCallback(
        (modelId: string) => {
            setAiModel(modelId);
            persistSettings({ geminiModel: modelId });
            onToast(`Modelo de IA actualizado automáticamente a ${modelId}.`);
        },
        [onToast, setAiModel],
    );

    return {
        resolvedAiApiKey,
        resolvedAiProjectId,
        allowAiAutoSelection,
        resolvedAiModel,
        fullRecordContext,
        aiSections,
        aiConversationKey,
        handleAutoSelectAiModel,
    };
};

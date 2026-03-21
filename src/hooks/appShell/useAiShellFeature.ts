import { getEnvGeminiApiKey, getEnvGeminiModel, getEnvGeminiProjectId } from '../../utils/env';
import { useAiAssistantController } from '../useAiAssistantController';
import type { ClinicalRecord } from '../../types';

const ENV_GEMINI_API_KEY = getEnvGeminiApiKey();
const ENV_GEMINI_PROJECT_ID = getEnvGeminiProjectId();
const ENV_GEMINI_MODEL = getEnvGeminiModel();

interface UseAiShellFeatureParams {
    record: ClinicalRecord;
    aiApiKey: string;
    aiProjectId: string;
    aiModel: string;
    recommendedModel: string;
    setAiModel: React.Dispatch<React.SetStateAction<string>>;
    onToast: (message: string, type?: 'success' | 'warning' | 'error') => void;
}

export const useAiShellFeature = ({
    record,
    aiApiKey,
    aiProjectId,
    aiModel,
    recommendedModel,
    setAiModel,
    onToast,
}: UseAiShellFeatureParams) => useAiAssistantController({
    record,
    aiApiKey,
    aiProjectId,
    aiModel,
    envGeminiApiKey: ENV_GEMINI_API_KEY,
    envGeminiProjectId: ENV_GEMINI_PROJECT_ID,
    envGeminiModel: ENV_GEMINI_MODEL,
    recommendedModel,
    setAiModel,
    onToast,
});

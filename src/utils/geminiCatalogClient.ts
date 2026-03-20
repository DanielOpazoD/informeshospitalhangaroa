import { stripModelPrefix } from './geminiModelUtils';
import type { GeminiApiVersion } from './geminiModelUtils';
import {
    buildRequestHeaders,
    GEMINI_ENDPOINTS,
    type GeminiListModelsResponse,
    type GeminiModelSummary,
} from './geminiShared';

export const parseModelListResponse = (version: GeminiApiVersion, response: GeminiListModelsResponse): GeminiModelSummary[] => {
    if (!response.models || !Array.isArray(response.models)) {
        return [];
    }

    return response.models
        .map(entry => ({
            id: stripModelPrefix(entry.name || ''),
            version,
            displayName: entry.displayName,
            supportsGenerateContent: Boolean(entry.supportedGenerationMethods?.includes('generateContent')),
        }))
        .filter(model => Boolean(model.id));
};

export const listAccessibleGeminiModels = async ({
    apiKey,
    projectId,
    versions,
}: {
    apiKey: string;
    projectId?: string;
    versions: GeminiApiVersion[];
}): Promise<GeminiModelSummary[]> => {
    const headers = buildRequestHeaders(projectId);
    const summaries: GeminiModelSummary[] = [];
    for (const version of versions) {
        try {
            const response = await fetch(`${GEMINI_ENDPOINTS[version]}?key=${apiKey}&pageSize=200`, {
                method: 'GET',
                headers,
            });
            if (!response.ok) continue;
            const data = (await response.json().catch(() => ({}))) as GeminiListModelsResponse;
            summaries.push(...parseModelListResponse(version, data));
        } catch {
            // Se ignora: esta llamada solo aporta sugerencias de catálogo.
        }
    }

    const unique = new Map<string, GeminiModelSummary>();
    for (const model of summaries) {
        const key = `${model.id.toLowerCase()}::${model.version}`;
        if (!unique.has(key)) {
            unique.set(key, model);
        }
    }

    return Array.from(unique.values()).filter(model => model.supportsGenerateContent);
};

export const formatAvailableModelsMessage = (models: GeminiModelSummary[]): string => {
    if (!models.length) {
        return '';
    }

    const sorted = [...models].sort((a, b) => a.id.localeCompare(b.id));
    const bullets = sorted.map(model => {
        const versionTag = model.version === 'v1beta' ? '@v1beta' : '@v1';
        const label = model.displayName ? `${model.displayName} - ${model.id}` : model.id;
        return `• ${label} (${versionTag})`;
    });

    return ['Modelos disponibles con tu clave:', ...bullets].join('\n');
};

const MODEL_AUTO_SELECTION_PRIORITY = [
    'gemini-3-pro-preview',
    'gemini-2.5-pro',
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-2.0-pro',
    'gemini-2.0-flash',
    'gemini-flash-latest',
    'gemini-pro-latest',
    'gemini-1.5-pro-latest',
    'gemini-1.5-flash-latest',
];

const MODEL_AUTO_SELECTION_BLOCKLIST = [
    'image',
    'vision',
    'robotics',
    'computer-use',
    'tts',
    'audio',
    'speech',
    'nano',
    'learnlm',
    'gemma',
];

const isAutoEligibleModel = (modelId: string) => {
    const normalized = modelId.toLowerCase();
    return !MODEL_AUTO_SELECTION_BLOCKLIST.some(keyword => normalized.includes(keyword));
};

const scoreAutoModel = (modelId: string) => {
    const normalized = modelId.toLowerCase();
    const priorityIndex = MODEL_AUTO_SELECTION_PRIORITY.findIndex(entry => normalized.startsWith(entry));
    return priorityIndex === -1 ? MODEL_AUTO_SELECTION_PRIORITY.length : priorityIndex;
};

export const suggestGeminiFallbackModel = (
    models: GeminiModelSummary[],
): { modelId: string; version: GeminiApiVersion } | null => {
    const candidates = models
        .filter(model => model.supportsGenerateContent && isAutoEligibleModel(model.id))
        .sort((a, b) => {
            const priorityDiff = scoreAutoModel(a.id) - scoreAutoModel(b.id);
            if (priorityDiff !== 0) {
                return priorityDiff;
            }
            if (a.version === b.version) {
                return a.id.localeCompare(b.id);
            }
            return a.version === 'v1' ? -1 : 1;
        });

    const best = candidates[0];
    return best ? { modelId: best.id, version: best.version } : null;
};

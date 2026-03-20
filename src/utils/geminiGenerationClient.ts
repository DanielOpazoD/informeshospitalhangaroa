import { getAlternateGeminiVersion, resolveGeminiRouting } from './geminiModelUtils';
import {
    buildRequestHeaders,
    GEMINI_ENDPOINTS,
    type GeminiApiError,
    type GeminiGenerateRequest,
    RETRYABLE_STATUS,
    sleep,
} from './geminiShared';
import { ensureGeminiRouting, shouldSwitchGeminiVersion } from './geminiRoutingResolver';

export const generateGeminiContent = async <T = unknown>({
    apiKey,
    model,
    contents,
    maxRetries = 2,
    projectId,
}: GeminiGenerateRequest): Promise<T> => {
    if (!apiKey) {
        throw new Error('Falta la clave de API de Gemini.');
    }

    const trimmedProject = projectId?.trim();
    const { modelId, apiVersion: preferredVersion, explicitVersion } = resolveGeminiRouting(model);
    let routing = await ensureGeminiRouting({
        apiKey,
        modelId,
        preferredVersion,
        projectId: trimmedProject,
        explicitVersion,
    });

    const payload = JSON.stringify({ contents });
    const headers = buildRequestHeaders(trimmedProject);
    let attempt = 0;
    let hasRefreshedRouting = false;

    while (attempt <= maxRetries) {
        const response = await fetch(`${GEMINI_ENDPOINTS[routing.apiVersion]}/${routing.modelId}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers,
            body: payload,
        });

        if (response.ok) {
            return (await response.json()) as T;
        }

        const data = (await response.json().catch(() => ({}))) as GeminiApiError;
        const message = data?.error?.message || 'La API devolvió un error desconocido.';

        if (!explicitVersion && shouldSwitchGeminiVersion(response.status, data?.error, hasRefreshedRouting)) {
            hasRefreshedRouting = true;
            routing = await ensureGeminiRouting({
                apiKey,
                modelId,
                preferredVersion: getAlternateGeminiVersion(routing.apiVersion),
                projectId: trimmedProject,
                skipCache: true,
            });
            continue;
        }

        if (RETRYABLE_STATUS.has(response.status) && attempt < maxRetries) {
            const retryAfterHeader = response.headers.get('retry-after');
            const retryAfter = retryAfterHeader ? parseInt(retryAfterHeader, 10) : NaN;
            const delayMs = Number.isFinite(retryAfter) ? retryAfter * 1000 : 1500 * Math.pow(2, attempt);
            attempt += 1;
            await sleep(delayMs);
            continue;
        }

        throw new Error(message);
    }

    throw new Error('No se pudo completar la solicitud después de varios intentos.');
};

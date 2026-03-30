import { getAlternateGeminiVersion, resolveGeminiRouting } from './geminiModelUtils';
import type { GeminiApiVersion } from './geminiModelUtils';
import {
    buildRequestHeaders,
    buildRoutingCacheKey,
    EnsureRoutingArgs,
    GEMINI_ENDPOINTS,
    GeminiApiError,
    GeminiModelUnavailableError,
    RoutingResolution,
    routingCache,
} from './geminiShared';
import { formatAvailableModelsMessage, listAccessibleGeminiModels } from './geminiCatalogClient';

const isVersionMismatchError = (error?: GeminiApiError['error']): boolean => {
    if (!error) return false;
    const normalizedMessage = error.message?.toLowerCase() ?? '';
    if (
        normalizedMessage.includes('is not found for api version') ||
        normalizedMessage.includes('is not supported for generatecontent')
    ) {
        return true;
    }

    return Boolean(
        error.details?.some(detail => {
            const normalizedReason = detail.reason?.toLowerCase() ?? '';
            const normalizedDetailMessage = detail.message?.toLowerCase() ?? '';
            return (
                normalizedReason.includes('api_version') ||
                normalizedDetailMessage.includes('is not found for api version') ||
                normalizedDetailMessage.includes('is not supported for generatecontent')
            );
        }),
    );
};

export const shouldSwitchGeminiVersion = (
    responseStatus: number,
    error: GeminiApiError['error'] | undefined,
    alreadyTriedAlternate: boolean,
): boolean => {
    if (alreadyTriedAlternate) {
        return false;
    }

    if (isVersionMismatchError(error)) {
        return true;
    }

    if (responseStatus === 404) {
        return true;
    }

    const normalizedStatus = error?.status?.toLowerCase() ?? '';
    return normalizedStatus === 'not_found';
};

const probeVersion = async (
    version: GeminiApiVersion,
    modelId: string,
    apiKey: string,
    projectId?: string,
): Promise<{ version: GeminiApiVersion; ok: true } | { version: GeminiApiVersion; ok: false; status: number; message?: string; fatal?: boolean }> => {
    const response = await fetch(`${GEMINI_ENDPOINTS[version]}/${modelId}?key=${apiKey}`, {
        method: 'GET',
        headers: buildRequestHeaders(projectId),
    });

    if (response.ok) {
        return { version, ok: true };
    }

    const data = (await response.json().catch(() => ({}))) as GeminiApiError;
    if (response.status === 401 || response.status === 403) {
        return { version, ok: false, status: response.status, message: data?.error?.message, fatal: true };
    }

    return { version, ok: false, status: response.status, message: data?.error?.message };
};

const discoverGeminiVersion = async ({
    apiKey,
    modelId,
    preferredVersion,
    projectId,
}: {
    apiKey: string;
    modelId: string;
    preferredVersion: GeminiApiVersion;
    projectId?: string;
}): Promise<GeminiApiVersion> => {
    const versions: GeminiApiVersion[] = [preferredVersion, getAlternateGeminiVersion(preferredVersion)];
    const uniqueVersions = [...new Set(versions)] as GeminiApiVersion[];

    const results = await Promise.all(uniqueVersions.map(v => probeVersion(v, modelId, apiKey, projectId)));

    // Preferir la versión preferida si ambas responden OK
    const preferred = results.find(r => r.ok && r.version === preferredVersion);
    if (preferred?.ok) return preferred.version;

    const anyOk = results.find(r => r.ok);
    if (anyOk?.ok) return anyOk.version;

    // Comprobar errores fatales (401/403) — tienen prioridad informativa
    const fatalResult = results.find(r => !r.ok && r.fatal);
    if (fatalResult && !fatalResult.ok) {
        if (fatalResult.status === 401) {
            throw new Error('La API key de Gemini no es válida o fue revocada.');
        }
        throw new Error('La cuenta asociada a la API key no tiene permisos para este modelo. Verifica los accesos en Google AI Studio.');
    }

    // Modelo no disponible en ninguna versión
    const attemptedErrors = results
        .filter((r): r is Extract<typeof r, { ok: false }> => !r.ok)
        .map(r => ({ version: r.version, message: r.message, status: r.status }));

    const availableModels = await listAccessibleGeminiModels({ apiKey, projectId, versions: uniqueVersions }).catch(() => []);
    const availabilityMessage = formatAvailableModelsMessage(availableModels);
    const attemptedMessage = attemptedErrors
        .map(error => `• ${error.version}: ${error.message || 'respuesta 404 del endpoint'}`)
        .join('\n');
    const baseMessage =
        `El modelo "${modelId}" no está disponible en tu cuenta o en las versiones públicas de la API. ` +
        'Configura otro modelo en Configuración → IA o solicita acceso en Google AI Studio.';
    const details = [availabilityMessage, attemptedMessage ? `Intentos realizados:\n${attemptedMessage}` : '']
        .filter(Boolean)
        .join('\n\n');

    throw new GeminiModelUnavailableError(details ? `${baseMessage}\n\n${details}` : baseMessage, {
        availableModels,
        attemptedVersions: attemptedErrors,
        requestedModelId: modelId,
    });
};

export const ensureGeminiRouting = async ({
    apiKey,
    modelId,
    preferredVersion,
    projectId,
    explicitVersion,
    skipCache,
}: EnsureRoutingArgs): Promise<RoutingResolution> => {
    if (explicitVersion) {
        return { modelId, apiVersion: explicitVersion, cacheKey: null, explicitVersion };
    }

    const cacheKey = buildRoutingCacheKey(modelId, projectId);
    const cachedVersion = !skipCache ? routingCache.get(cacheKey) : undefined;
    if (cachedVersion) {
        return { modelId, apiVersion: cachedVersion, cacheKey };
    }

    const apiVersion = await discoverGeminiVersion({ apiKey, modelId, preferredVersion, projectId });
    routingCache.set(cacheKey, apiVersion);
    return { modelId, apiVersion, cacheKey };
};

export const probeGeminiModelVersion = async ({
    apiKey,
    model,
    projectId,
}: {
    apiKey: string;
    model: string;
    projectId?: string;
}): Promise<{ modelId: string; apiVersion: GeminiApiVersion }> => {
    const { modelId, apiVersion, explicitVersion } = resolveGeminiRouting(model);
    if (!apiKey) {
        throw new Error('Falta la clave de API de Gemini.');
    }

    const routing = await ensureGeminiRouting({
        apiKey,
        modelId,
        preferredVersion: apiVersion,
        projectId: projectId?.trim(),
        explicitVersion,
        skipCache: true,
    });

    return { modelId: routing.modelId, apiVersion: routing.apiVersion };
};

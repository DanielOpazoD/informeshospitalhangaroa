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
    const tried = new Set<GeminiApiVersion>();
    const ordered: GeminiApiVersion[] = [preferredVersion, getAlternateGeminiVersion(preferredVersion)];
    const attemptedErrors: Array<{ version: GeminiApiVersion; message?: string; status: number }> = [];

    for (const version of ordered) {
        if (tried.has(version)) continue;
        tried.add(version);
        const response = await fetch(`${GEMINI_ENDPOINTS[version]}/${modelId}?key=${apiKey}`, {
            method: 'GET',
            headers: buildRequestHeaders(projectId),
        });

        if (response.ok) {
            return version;
        }

        const data = (await response.json().catch(() => ({}))) as GeminiApiError;
        if (response.status === 404) {
            attemptedErrors.push({ version, message: data?.error?.message, status: response.status });
            continue;
        }
        if (response.status === 401) {
            throw new Error('La API key de Gemini no es válida o fue revocada.');
        }
        if (response.status === 403) {
            throw new Error(
                'La cuenta asociada a la API key no tiene permisos para este modelo. Verifica los accesos en Google AI Studio.',
            );
        }

        throw new Error(data?.error?.message || 'No se pudo verificar la disponibilidad del modelo seleccionado.');
    }

    const availableModels = await listAccessibleGeminiModels({ apiKey, projectId, versions: ordered }).catch(() => []);
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

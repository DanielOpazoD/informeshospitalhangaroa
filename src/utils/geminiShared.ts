import type { GeminiApiVersion } from './geminiModelUtils';

export const GEMINI_ENDPOINTS = {
    v1: 'https://generativelanguage.googleapis.com/v1/models',
    v1beta: 'https://generativelanguage.googleapis.com/v1beta/models',
} as const;

export const RETRYABLE_STATUS = new Set([429, 500, 503]);

// ── Routing cache con TTL ─────────────────────────────────────────────────────

const ROUTING_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hora

interface RoutingCacheEntry {
    version: GeminiApiVersion;
    expiresAt: number;
}

class GeminiRoutingCache {
    private readonly cache = new Map<string, RoutingCacheEntry>();

    get(key: string): GeminiApiVersion | undefined {
        const entry = this.cache.get(key);
        if (!entry) return undefined;
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return undefined;
        }
        return entry.version;
    }

    set(key: string, version: GeminiApiVersion): void {
        this.cache.set(key, { version, expiresAt: Date.now() + ROUTING_CACHE_TTL_MS });
    }

    delete(key: string): void {
        this.cache.delete(key);
    }

    clear(): void {
        this.cache.clear();
    }
}

export const routingCache = new GeminiRoutingCache();

export interface GeminiListModelsResponse {
    models?: Array<{
        name?: string;
        displayName?: string;
        supportedGenerationMethods?: string[];
    }>;
}

export interface GeminiModelSummary {
    id: string;
    version: GeminiApiVersion;
    displayName?: string;
    supportsGenerateContent: boolean;
}

export interface GeminiGenerateRequest {
    apiKey: string;
    model: string;
    contents: Array<{
        role: string;
        parts: Array<{ text: string }>;
    }>;
    maxRetries?: number;
    projectId?: string;
}

export interface GeminiApiErrorDetail {
    ['@type']?: string;
    reason?: string;
    message?: string;
}

export interface GeminiApiError {
    error?: {
        message?: string;
        details?: GeminiApiErrorDetail[];
        status?: string;
    };
}

export interface EnsureRoutingArgs {
    apiKey: string;
    modelId: string;
    preferredVersion: GeminiApiVersion;
    projectId?: string;
    explicitVersion?: GeminiApiVersion;
    skipCache?: boolean;
}

export interface RoutingResolution {
    modelId: string;
    apiVersion: GeminiApiVersion;
    cacheKey: string | null;
    explicitVersion?: GeminiApiVersion;
}

export class GeminiModelUnavailableError extends Error {
    public readonly availableModels: GeminiModelSummary[];
    public readonly attemptedVersions: Array<{ version: GeminiApiVersion; message?: string; status: number }>;
    public readonly requestedModelId: string;

    constructor(
        message: string,
        {
            availableModels,
            attemptedVersions,
            requestedModelId,
        }: {
            availableModels: GeminiModelSummary[];
            attemptedVersions: Array<{ version: GeminiApiVersion; message?: string; status: number }>;
            requestedModelId: string;
        },
    ) {
        super(message);
        this.name = 'GeminiModelUnavailableError';
        this.availableModels = availableModels;
        this.attemptedVersions = attemptedVersions;
        this.requestedModelId = requestedModelId;
    }
}

export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const buildRoutingCacheKey = (modelId: string, projectId?: string) =>
    `${projectId?.toLowerCase() || 'default'}::${modelId.toLowerCase()}`;

export const buildRequestHeaders = (projectId?: string): Record<string, string> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (projectId) {
        headers['X-Goog-User-Project'] = projectId;
    }
    return headers;
};

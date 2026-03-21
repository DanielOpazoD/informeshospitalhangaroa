export interface ResilienceOptions {
    attempts: number;
    timeoutMs: number;
    label: string;
    shouldRetry?: (error: unknown) => boolean;
    backoffMs?: number;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const withTimeout = async <T>(
    operation: Promise<T>,
    timeoutMs: number,
    label: string,
): Promise<T> => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    try {
        return await Promise.race([
            operation,
            new Promise<T>((_, reject) => {
                timeoutId = setTimeout(() => {
                    reject(new Error(`${label} agotó el tiempo de espera.`));
                }, timeoutMs);
            }),
        ]);
    } finally {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
    }
};

export const runWithResilience = async <T>(
    operation: () => Promise<T>,
    {
        attempts,
        timeoutMs,
        label,
        shouldRetry = () => false,
        backoffMs = 150,
    }: ResilienceOptions,
): Promise<T> => {
    let lastError: unknown;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
        try {
            return await withTimeout(operation(), timeoutMs, label);
        } catch (error) {
            lastError = error;
            if (attempt >= attempts || !shouldRetry(error)) {
                throw error;
            }
            await sleep(backoffMs * attempt);
        }
    }

    throw lastError instanceof Error ? lastError : new Error(`${label} falló sin detalle.`);
};

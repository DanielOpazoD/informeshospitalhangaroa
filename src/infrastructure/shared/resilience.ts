export interface ResilienceOptions {
    attempts: number;
    timeoutMs: number;
    label: string;
    shouldRetry?: (error: unknown) => boolean;
    backoffMs?: number;
    onEvent?: (event: ResilienceEvent) => void;
}

export interface ResilienceEvent {
    type: 'start' | 'retry' | 'success' | 'timeout' | 'failed';
    label: string;
    attempt: number;
    error?: string;
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
        onEvent,
    }: ResilienceOptions,
): Promise<T> => {
    let lastError: unknown;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
        try {
            onEvent?.({ type: 'start', label, attempt });
            const result = await withTimeout(operation(), timeoutMs, label);
            onEvent?.({ type: 'success', label, attempt });
            return result;
        } catch (error) {
            lastError = error;
            const errorMessage = error instanceof Error ? error.message : String(error);
            const isTimeout = errorMessage.toLowerCase().includes('tiempo de espera');
            onEvent?.({
                type: isTimeout ? 'timeout' : attempt >= attempts || !shouldRetry(error) ? 'failed' : 'retry',
                label,
                attempt,
                error: errorMessage,
            });
            if (attempt >= attempts || !shouldRetry(error)) {
                throw error;
            }
            const jitter = Math.floor(Math.random() * backoffMs);
            await sleep(backoffMs * Math.pow(2, attempt - 1) + jitter);
        }
    }

    throw lastError instanceof Error ? lastError : new Error(`${label} falló sin detalle.`);
};

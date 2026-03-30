import type { AppResult, AppResultStatus } from '../../types';

export class AppResultError extends Error {
    status: AppResultStatus | undefined;

    constructor(message: string, status?: AppResultStatus) {
        super(message);
        this.name = 'AppResultError';
        this.status = status;
    }
}

export const unwrapAppResult = async <T>(value: Promise<AppResult<T>> | AppResult<T>): Promise<T> => {
    const resolved = await value;
    if (!resolved.ok) {
        throw new AppResultError(resolved.error.message, resolved.status);
    }
    return resolved.data;
};

export const getResultJobStatus = (
    status: AppResultStatus | undefined,
    fallback: 'idle' | 'success',
): 'idle' | 'success' | 'partial' | 'cancelled' | 'error' => {
    if (status === 'partial') return 'partial';
    if (status === 'cancelled') return 'cancelled';
    if (status === 'error' || status === 'timeout') return 'error';
    return fallback;
};

// ── Type guards ───────────────────────────────────────────────────────────────

export const isOk = <T>(result: AppResult<T>): result is Extract<AppResult<T>, { ok: true }> => result.ok === true;

export const isErr = <T>(result: AppResult<T>): result is Extract<AppResult<T>, { ok: false }> => result.ok === false;

export const isPartial = <T>(result: AppResult<T>): boolean => result.ok && result.status === 'partial';

export const isCancelled = <T>(result: AppResult<T>): boolean => result.status === 'cancelled';

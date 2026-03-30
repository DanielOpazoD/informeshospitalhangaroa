type LogLevel = 'info' | 'warn' | 'error';

// In production (VITE_LOG_LEVEL unset) info logs are silenced; set to 'info' to enable them.
const CONFIGURED_LEVEL: LogLevel = (import.meta.env.VITE_LOG_LEVEL as LogLevel | undefined) ?? 'warn';

const LEVEL_RANK: Record<LogLevel, number> = { info: 0, warn: 1, error: 2 };

const shouldEmit = (level: LogLevel): boolean => LEVEL_RANK[level] >= LEVEL_RANK[CONFIGURED_LEVEL];

const timestamp = (): string => new Date().toISOString().slice(11, 23); // HH:MM:SS.mmm

const serializeDetail = (detail: unknown): string => {
    if (detail instanceof Error) {
        return detail.stack || detail.message;
    }
    if (typeof detail === 'string') {
        return detail;
    }
    if (detail === undefined) {
        return '';
    }
    try {
        return JSON.stringify(detail);
    } catch {
        return String(detail);
    }
};

const emit = (level: LogLevel, scope: string, message: string, detail?: unknown) => {
    if (!shouldEmit(level)) return;

    const suffix = detail === undefined ? '' : ` ${serializeDetail(detail)}`;
    const payload = `[${timestamp()}][${scope}] ${message}${suffix}`;

    if (level === 'error') {
        console.error(payload);
        return;
    }
    if (level === 'warn') {
        console.warn(payload);
        return;
    }
    console.log(payload);
};

export const appLogger = {
    info: (scope: string, message: string, detail?: unknown) => emit('info', scope, message, detail),
    warn: (scope: string, message: string, detail?: unknown) => emit('warn', scope, message, detail),
    error: (scope: string, message: string, detail?: unknown) => emit('error', scope, message, detail),
};

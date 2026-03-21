type LogLevel = 'info' | 'warn' | 'error';

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
    const suffix = detail === undefined ? '' : ` ${serializeDetail(detail)}`;
    const payload = `[${scope}] ${message}${suffix}`;

    if (level === 'error') {
        console.error(payload);
        return;
    }
    if (level === 'warn') {
        console.warn(payload);
        return;
    }
};

export const appLogger = {
    info: (scope: string, message: string, detail?: unknown) => emit('info', scope, message, detail),
    warn: (scope: string, message: string, detail?: unknown) => emit('warn', scope, message, detail),
    error: (scope: string, message: string, detail?: unknown) => emit('error', scope, message, detail),
};

import type { EditorEffect } from '../types';

export interface EditorEffectHandlers {
    onResetHhrSync?: () => void;
    onShowWarning?: (message: string) => void;
    onShowToast?: (message: string, tone: 'success' | 'warning' | 'error') => void;
    onCloseModal?: (modal: 'open' | 'history' | 'save' | 'hhr_census') => void;
    onRequestFocus?: (target: 'record-title' | 'history' | 'patient' | 'section') => void;
    onRequestConfirmation?: (effect: Extract<EditorEffect, { type: 'request_confirmation' }>) => void;
    onLogAuditEvent?: (effect: Extract<EditorEffect, { type: 'log_audit_event' }>) => void;
}

const getEffectPriority = (effect: EditorEffect): number => {
    if (typeof effect.priority === 'number') {
        return effect.priority;
    }

    switch (effect.type) {
        case 'request_confirmation':
            return 100;
        case 'show_toast':
            return 80;
        case 'show_warning':
            return 70;
        case 'close_modal':
            return 60;
        case 'request_focus':
            return 50;
        case 'reset_hhr_sync':
            return 40;
        case 'log_audit_event':
            return 10;
        default:
            return 0;
    }
};

const getEffectDedupeKey = (effect: EditorEffect): string => {
    switch (effect.type) {
        case 'show_warning':
            return `show_warning:${effect.dedupeKey ?? effect.message}`;
        case 'show_toast':
            return `show_toast:${effect.dedupeKey ?? `${effect.tone}:${effect.message}`}`;
        case 'close_modal':
            return `close_modal:${effect.modal}`;
        case 'request_focus':
            return `request_focus:${effect.target}`;
        case 'request_confirmation':
            return `request_confirmation:${effect.confirmationId}`;
        case 'log_audit_event':
            return `log_audit_event:${effect.event}:${effect.details ?? ''}`;
        case 'reset_hhr_sync':
            return 'reset_hhr_sync';
        default:
            return JSON.stringify(effect);
    }
};

export const normalizeEditorEffects = (effects: EditorEffect[]): EditorEffect[] => {
    const deduped = new Map<string, EditorEffect>();
    effects.forEach(effect => {
        deduped.set(getEffectDedupeKey(effect), effect);
    });
    return Array.from(deduped.values()).sort((left, right) => getEffectPriority(right) - getEffectPriority(left));
};

export const interpretEditorEffects = (
    effects: EditorEffect[],
    handlers: EditorEffectHandlers,
) => {
    normalizeEditorEffects(effects).forEach((effect) => {
        switch (effect.type) {
            case 'reset_hhr_sync':
                handlers.onResetHhrSync?.();
                break;
            case 'show_warning':
                handlers.onShowWarning?.(effect.message);
                break;
            case 'show_toast':
                handlers.onShowToast?.(effect.message, effect.tone);
                break;
            case 'close_modal':
                handlers.onCloseModal?.(effect.modal);
                break;
            case 'request_focus':
                handlers.onRequestFocus?.(effect.target);
                break;
            case 'request_confirmation':
                handlers.onRequestConfirmation?.(effect);
                break;
            case 'log_audit_event':
                handlers.onLogAuditEvent?.(effect);
                break;
            default:
                break;
        }
    });
};

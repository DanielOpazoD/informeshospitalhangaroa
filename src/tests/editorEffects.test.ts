import { describe, expect, it, vi } from 'vitest';
import { interpretEditorEffects, normalizeEditorEffects } from '../application/editorEffects';
import type { EditorEffect } from '../types';

describe('editorEffects', () => {
    it('deduplica effects repetidos y prioriza los más importantes', () => {
        const effects: EditorEffect[] = [
            { type: 'log_audit_event', event: 'editor.import', priority: 10 },
            { type: 'show_toast', message: 'Importado', tone: 'success', dedupeKey: 'import', priority: 80 },
            { type: 'show_toast', message: 'Importado', tone: 'success', dedupeKey: 'import', priority: 80 },
            { type: 'close_modal', modal: 'open', priority: 60 },
        ];

        const normalized = normalizeEditorEffects(effects);

        expect(normalized).toHaveLength(3);
        expect(normalized[0]).toMatchObject({ type: 'show_toast' });
        expect(normalized[1]).toMatchObject({ type: 'close_modal' });
        expect(normalized[2]).toMatchObject({ type: 'log_audit_event' });
    });

    it('ejecuta handlers solo una vez por dedupe key', () => {
        const handlers = {
            onShowToast: vi.fn(),
            onCloseModal: vi.fn(),
            onLogAuditEvent: vi.fn(),
        };

        interpretEditorEffects([
            { type: 'show_toast', message: 'Guardado', tone: 'success', dedupeKey: 'save' },
            { type: 'show_toast', message: 'Guardado', tone: 'success', dedupeKey: 'save' },
            { type: 'close_modal', modal: 'history' },
            { type: 'log_audit_event', event: 'editor.restore', details: 'history-1' },
        ], handlers);

        expect(handlers.onShowToast).toHaveBeenCalledTimes(1);
        expect(handlers.onShowToast).toHaveBeenCalledWith('Guardado', 'success');
        expect(handlers.onCloseModal).toHaveBeenCalledWith('history');
        expect(handlers.onLogAuditEvent).toHaveBeenCalledTimes(1);
    });

    it('onResetHhrSync se invoca con el effect reset_hhr_sync', () => {
        const handlers = { onResetHhrSync: vi.fn() };

        interpretEditorEffects([
            { type: 'reset_hhr_sync' },
            { type: 'reset_hhr_sync' }, // debe deduplicarse
        ], handlers);

        expect(handlers.onResetHhrSync).toHaveBeenCalledTimes(1);
    });

    it('onShowWarning se invoca con el mensaje y deduplica por dedupeKey', () => {
        const handlers = { onShowWarning: vi.fn() };

        interpretEditorEffects([
            { type: 'show_warning', message: 'Atención', dedupeKey: 'warn-1' },
            { type: 'show_warning', message: 'Atención', dedupeKey: 'warn-1' },
            { type: 'show_warning', message: 'Otro aviso', dedupeKey: 'warn-2' },
        ], handlers);

        expect(handlers.onShowWarning).toHaveBeenCalledTimes(2);
        expect(handlers.onShowWarning).toHaveBeenCalledWith('Atención');
        expect(handlers.onShowWarning).toHaveBeenCalledWith('Otro aviso');
    });

    it('onRequestFocus se invoca con el target correcto', () => {
        const handlers = { onRequestFocus: vi.fn() };

        interpretEditorEffects([
            { type: 'request_focus', target: 'record-title' },
            { type: 'request_focus', target: 'patient' },
            { type: 'request_focus', target: 'record-title' }, // duplicado → deduplicado
        ], handlers);

        expect(handlers.onRequestFocus).toHaveBeenCalledTimes(2);
        expect(handlers.onRequestFocus).toHaveBeenCalledWith('record-title');
        expect(handlers.onRequestFocus).toHaveBeenCalledWith('patient');
    });

    it('onRequestConfirmation recibe el effect completo y deduplica por confirmationId', () => {
        const handlers = { onRequestConfirmation: vi.fn() };
        const effect: EditorEffect = {
            type: 'request_confirmation',
            confirmationId: 'delete-record',
            title: 'Confirmar eliminación',
            message: '¿Eliminar ficha?',
            confirmLabel: 'Eliminar',
            cancelLabel: 'Cancelar',
            tone: 'danger',
        };

        interpretEditorEffects([effect, effect], handlers);

        expect(handlers.onRequestConfirmation).toHaveBeenCalledTimes(1);
        expect(handlers.onRequestConfirmation).toHaveBeenCalledWith(effect);
    });

    it('los effects se ordenan por prioridad correctamente', () => {
        const order: string[] = [];
        const handlers = {
            onResetHhrSync: () => order.push('reset_hhr_sync'),
            onShowWarning: () => order.push('show_warning'),
            onRequestFocus: () => order.push('request_focus'),
            onRequestConfirmation: () => order.push('request_confirmation'),
        };

        interpretEditorEffects([
            { type: 'reset_hhr_sync' },
            { type: 'show_warning', message: 'Aviso' },
            { type: 'request_focus', target: 'section' },
            { type: 'request_confirmation', confirmationId: 'x', title: 'Confirmar', message: '?', confirmLabel: 'Sí', cancelLabel: 'No', tone: 'warning' },
        ], handlers);

        expect(order).toEqual(['request_confirmation', 'show_warning', 'request_focus', 'reset_hhr_sync']);
    });
});

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
});

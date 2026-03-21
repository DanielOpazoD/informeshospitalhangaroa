import { describe, expect, it } from 'vitest';
import { editorWorkflowReducer, initialEditorWorkflowState } from '../application/editorWorkflow';

describe('editorWorkflowReducer', () => {
    it('marca el editor como dirty cuando recibe cambios', () => {
        const next = editorWorkflowReducer(initialEditorWorkflowState, { type: 'EDITED' });

        expect(next).toEqual({
            status: 'dirty',
            hasUnsavedChanges: true,
            lastError: null,
        });
    });

    it('limpia el estado al completar un guardado', () => {
        const dirtyState = editorWorkflowReducer(initialEditorWorkflowState, { type: 'EDITED' });
        const savingState = editorWorkflowReducer(dirtyState, { type: 'SAVE_REQUESTED' });
        const next = editorWorkflowReducer(savingState, { type: 'SAVE_SUCCEEDED' });

        expect(next).toEqual({
            status: 'idle',
            hasUnsavedChanges: false,
            lastError: null,
        });
    });

    it('preserva cambios pendientes después de sincronizar con HHR', () => {
        const dirtyState = editorWorkflowReducer(initialEditorWorkflowState, { type: 'EDITED' });
        const syncingState = editorWorkflowReducer(dirtyState, { type: 'SYNC_STARTED' });
        const next = editorWorkflowReducer(syncingState, { type: 'SYNC_SUCCEEDED' });

        expect(next).toEqual({
            status: 'dirty',
            hasUnsavedChanges: true,
            lastError: null,
        });
    });

    it('vuelve a idle al cancelar una búsqueda sin cambios pendientes', () => {
        const searchingState = editorWorkflowReducer(initialEditorWorkflowState, { type: 'SEARCH_STARTED' });
        const next = editorWorkflowReducer(searchingState, { type: 'SEARCH_CANCELLED' });

        expect(next).toEqual({
            status: 'idle',
            hasUnsavedChanges: false,
            lastError: null,
        });
    });

    it('registra errores operativos', () => {
        const next = editorWorkflowReducer(initialEditorWorkflowState, {
            type: 'IMPORT_FAILED',
            error: 'fallo',
        });

        expect(next).toEqual({
            status: 'error',
            hasUnsavedChanges: false,
            lastError: 'fallo',
        });
    });
});

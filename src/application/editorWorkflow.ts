import type { EditorWorkflowState } from '../types';

export type EditorWorkflowAction =
    | { type: 'EDITED' }
    | { type: 'SET_UNSAVED_CHANGES'; value: boolean }
    | { type: 'SAVE_REQUESTED' }
    | { type: 'SAVE_SUCCEEDED' }
    | { type: 'SAVE_FAILED'; error: string }
    | { type: 'IMPORT_STARTED' }
    | { type: 'IMPORT_SUCCEEDED' }
    | { type: 'IMPORT_FAILED'; error: string }
    | { type: 'RESTORE_STARTED' }
    | { type: 'RESTORE_SUCCEEDED' }
    | { type: 'RESTORE_FAILED'; error: string }
    | { type: 'SEARCH_STARTED' }
    | { type: 'SEARCH_CANCELLED' }
    | { type: 'SYNC_STARTED' }
    | { type: 'SYNC_SUCCEEDED' }
    | { type: 'SYNC_FAILED'; error: string };

export const initialEditorWorkflowState: EditorWorkflowState = {
    status: 'idle',
    hasUnsavedChanges: false,
    lastError: null,
};

export const editorWorkflowReducer = (
    state: EditorWorkflowState,
    action: EditorWorkflowAction,
): EditorWorkflowState => {
    switch (action.type) {
        case 'EDITED':
            return {
                status: 'dirty',
                hasUnsavedChanges: true,
                lastError: null,
            };
        case 'SET_UNSAVED_CHANGES':
            return {
                status: action.value ? 'dirty' : 'idle',
                hasUnsavedChanges: action.value,
                lastError: null,
            };
        case 'SAVE_REQUESTED':
            return {
                ...state,
                status: 'saving',
                lastError: null,
            };
        case 'SAVE_SUCCEEDED':
            return {
                status: 'idle',
                hasUnsavedChanges: false,
                lastError: null,
            };
        case 'SAVE_FAILED':
            return {
                status: 'error',
                hasUnsavedChanges: true,
                lastError: action.error,
            };
        case 'IMPORT_STARTED':
            return {
                ...state,
                status: 'importing',
                lastError: null,
            };
        case 'IMPORT_SUCCEEDED':
            return {
                status: 'idle',
                hasUnsavedChanges: false,
                lastError: null,
            };
        case 'IMPORT_FAILED':
            return {
                status: 'error',
                hasUnsavedChanges: state.hasUnsavedChanges,
                lastError: action.error,
            };
        case 'RESTORE_STARTED':
            return {
                ...state,
                status: 'restoring',
                lastError: null,
            };
        case 'RESTORE_SUCCEEDED':
            return {
                status: 'idle',
                hasUnsavedChanges: false,
                lastError: null,
            };
        case 'RESTORE_FAILED':
            return {
                status: 'error',
                hasUnsavedChanges: state.hasUnsavedChanges,
                lastError: action.error,
            };
        case 'SEARCH_STARTED':
            return {
                ...state,
                status: 'searching_drive',
                lastError: null,
            };
        case 'SEARCH_CANCELLED':
            return {
                ...state,
                status: state.hasUnsavedChanges ? 'dirty' : 'idle',
                lastError: null,
            };
        case 'SYNC_STARTED':
            return {
                ...state,
                status: 'syncing_hhr',
                lastError: null,
            };
        case 'SYNC_SUCCEEDED':
            return {
                ...state,
                status: state.hasUnsavedChanges ? 'dirty' : 'idle',
                lastError: null,
            };
        case 'SYNC_FAILED':
            return {
                ...state,
                status: 'error',
                lastError: action.error,
            };
        default:
            return state;
    }
};

import type { EditorEffect } from '../types';

export interface EditorEffectHandlers {
    onResetHhrSync?: () => void;
    onShowWarning?: (message: string) => void;
    onCloseOpenModal?: () => void;
    onCloseHistoryModal?: () => void;
    onMarkImportCompleted?: () => void;
    onMarkRestoreCompleted?: () => void;
}

export const interpretEditorEffects = (
    effects: EditorEffect[],
    handlers: EditorEffectHandlers,
) => {
    effects.forEach((effect) => {
        switch (effect.type) {
            case 'reset_hhr_sync':
                handlers.onResetHhrSync?.();
                break;
            case 'show_warning':
                handlers.onShowWarning?.(effect.message);
                break;
            case 'close_open_modal':
                handlers.onCloseOpenModal?.();
                break;
            case 'close_history_modal':
                handlers.onCloseHistoryModal?.();
                break;
            case 'mark_import_completed':
                handlers.onMarkImportCompleted?.();
                break;
            case 'mark_restore_completed':
                handlers.onMarkRestoreCompleted?.();
                break;
            default:
                break;
        }
    });
};

/**
 * @module hooks
 * Barrel export for all custom React hooks.
 * Import from `@/hooks` instead of individual files.
 */
export { useAppSettings } from './useAppSettings';
export { useAiAssistantController } from './useAiAssistantController';
export { useClinicalRecord } from './useClinicalRecord';
export { useConfirmDialog, ConfirmDialogProvider } from './useConfirmDialog';
export { useDocumentEffects } from './useDocumentEffects';
export { useDriveModals } from './useDriveModals';
export { useEditorUiState } from './useEditorUiState';
export { useFileOperations } from './useFileOperations';
export { useKeyboardShortcuts } from './useKeyboardShortcuts';
export { useRecordForm } from './useRecordForm';
export { useToast } from './useToast';
export type { ToastState } from './useToast';
export { useToolbarCommands } from './useToolbarCommands';

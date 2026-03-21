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
export { useGoogleApiBootstrap } from './useGoogleApiBootstrap';
export { useDriveModals } from './useDriveModals';
export { useDriveOperations } from './useDriveOperations';
export { useEditorUiState } from './useEditorUiState';
export { useFileOperations } from './useFileOperations';
export { useHhrIntegrationController } from './useHhrIntegrationController';
export { useKeyboardShortcuts } from './useKeyboardShortcuts';
export { useRecordForm } from './useRecordForm';
export { useRecordTitleController } from './useRecordTitleController';
export { useToast } from './useToast';
export type { ToastState } from './useToast';
export { useToolbarCommands } from './useToolbarCommands';

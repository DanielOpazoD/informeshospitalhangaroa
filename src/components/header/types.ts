import type { GoogleTokenClient, GoogleUserProfile } from '../../types';

export interface HeaderAuthProps {
    isSignedIn: boolean;
    isGisReady: boolean;
    isGapiReady: boolean;
    isPickerApiReady: boolean;
    tokenClient: GoogleTokenClient | null;
    userProfile: GoogleUserProfile | null;
    onSignIn: () => void;
    onSignOut: () => void;
    onChangeUser: () => void;
}

export interface HeaderDriveProps {
    isSaving: boolean;
    hasApiKey: boolean;
    onSaveToDrive: () => void;
    onOpenFromDrive: () => void;
    onDownloadJson: () => void;
}

export interface HeaderEditingProps {
    isEditing: boolean;
    onToggleEdit: () => void;
    isAdvancedEditing: boolean;
    onToggleAdvancedEditing: () => void;
    isAiAssistantVisible: boolean;
    onToggleAiAssistant: () => void;
    onToolbarCommand: (command: string) => void;
}

export interface HeaderSaveProps {
    saveStatusLabel: string;
    lastSaveTime: string;
    hasUnsavedChanges: boolean;
    canUndo: boolean;
    canRedo: boolean;
    onQuickSave: () => void;
    onOpenHistory: () => void;
    onUndo: () => void;
    onRedo: () => void;
}

export interface HeaderProps {
    templateId: string;
    onTemplateChange: (id: string) => void;
    onAddClinicalUpdateSection: () => void;
    onPrint: () => void;
    onOpenSettings: () => void;
    onRestoreTemplate: () => void;
    onOpenCartolaApp: () => void;
    auth: HeaderAuthProps;
    drive: HeaderDriveProps;
    editing: HeaderEditingProps;
    save: HeaderSaveProps;
}

export type ActionMenu = 'archivo' | 'drive';

import React, { useEffect, useState } from 'react';
import UserAccountMenu from './UserAccountMenu';
import {
    DownloadIcon,
    EditIcon,
    FileGroupIcon,
    FolderOpenIcon,
    GoogleDriveColoredIcon,
    LoginIcon,
    PenIcon,
    SettingsIcon,
    SignOutIcon,
    SwitchUserIcon,
    UploadIcon,
} from './icons';
import AppLauncher from './header/AppLauncher';
import HeaderActionMenu from './header/HeaderActionMenu';
import HeaderAiToggle from './header/HeaderAiToggle';
import HeaderQuickActions from './header/HeaderQuickActions';
import HeaderSaveStatus from './header/HeaderSaveStatus';
import HeaderTemplateControls from './header/HeaderTemplateControls';
import type { ActionMenu, HeaderProps } from './header/types';

export type {
    HeaderAuthProps,
    HeaderDriveProps,
    HeaderEditingProps,
    HeaderProps,
    HeaderSaveProps,
} from './header/types';

const Header: React.FC<HeaderProps> = ({
    templateId,
    onTemplateChange,
    onAddClinicalUpdateSection,
    onPrint,
    onOpenSettings,
    onRestoreTemplate,
    onOpenCartolaApp,
    auth,
    drive,
    editing,
    save,
}) => {
    const [openActionMenu, setOpenActionMenu] = useState<ActionMenu | null>(null);

    useEffect(() => {
        if (!auth.isSignedIn) {
            setOpenActionMenu(null);
        }
    }, [auth.isSignedIn]);

    const handleDropdownAction = (action: () => void) => {
        action();
        setOpenActionMenu(null);
    };

    const driveOptionDisabled = drive.hasApiKey && !auth.isPickerApiReady;
    const driveSignInDisabled = !auth.isGisReady || !auth.isGapiReady || !auth.tokenClient;

    return (
        <div className="topbar">
            <div className="topbar-main">
                <div className="topbar-left">
                    <AppLauncher onOpenCartolaApp={onOpenCartolaApp} />
                    <div className="topbar-left-scroll">
                        <div className="topbar-section topbar-section-template">
                            <HeaderTemplateControls
                                templateId={templateId}
                                onTemplateChange={onTemplateChange}
                                onAddClinicalUpdateSection={onAddClinicalUpdateSection}
                            />
                        </div>
                        <div className="topbar-section topbar-section-document">
                            <HeaderSaveStatus
                                saveStatusLabel={save.saveStatusLabel}
                                lastSaveTime={save.lastSaveTime}
                                hasUnsavedChanges={save.hasUnsavedChanges}
                            />
                        </div>
                        <div className="topbar-section topbar-section-tools">
                            <HeaderQuickActions
                                canUndo={save.canUndo}
                                canRedo={save.canRedo}
                                onOpenHistory={save.onOpenHistory}
                                onPrint={onPrint}
                                onRestoreTemplate={onRestoreTemplate}
                                onUndo={save.onUndo}
                                onRedo={save.onRedo}
                            />
                            <button
                                type="button"
                                className={`action-btn action-btn-mode ${editing.isAdvancedEditing ? 'active is-active' : ''}`}
                                onClick={editing.onToggleAdvancedEditing}
                                aria-pressed={editing.isAdvancedEditing}
                                aria-label={
                                    editing.isAdvancedEditing ? 'Desactivar edición avanzada' : 'Activar edición avanzada'
                                }
                                title={editing.isAdvancedEditing ? 'Desactivar edición avanzada' : 'Activar edición avanzada'}
                            >
                                <PenIcon />
                                <span>Formato</span>
                            </button>
                            <HeaderAiToggle
                                isVisible={editing.isAiAssistantVisible}
                                onToggle={editing.onToggleAiAssistant}
                            />
                        </div>
                    </div>
                </div>
                <div className="topbar-actions">
                    <div className="topbar-actions-document">
                        <HeaderActionMenu
                            label="Archivo"
                            title="Archivo"
                            isOpen={openActionMenu === 'archivo'}
                            onToggle={() => setOpenActionMenu(current => (current === 'archivo' ? null : 'archivo'))}
                            onClose={() => setOpenActionMenu(null)}
                            icon={<FileGroupIcon />}
                            buttonText="Archivo"
                            buttonClassName="action-btn-subtle action-btn-menu"
                        >
                            <button
                                type="button"
                                id="toggleEdit"
                                onClick={() => handleDropdownAction(editing.onToggleEdit)}
                            >
                                <EditIcon />
                                <span>{editing.isEditing ? 'Bloquear estructura' : 'Editar estructura'}</span>
                            </button>
                            <button type="button" onClick={() => handleDropdownAction(drive.onDownloadJson)}>
                                <DownloadIcon />
                                <span>Guardar JSON</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => handleDropdownAction(() => document.getElementById('importJson')?.click())}
                            >
                                <UploadIcon />
                                <span>Importar JSON</span>
                            </button>
                            <div className="action-dropdown-divider" />
                            <button
                                type="button"
                                onClick={() => handleDropdownAction(onOpenSettings)}
                                title="Configuración de Google API"
                            >
                                <SettingsIcon />
                                <span>Google API {drive.hasApiKey && <span className="api-badge">✓</span>}</span>
                            </button>
                        </HeaderActionMenu>
                    </div>
                    <div className="topbar-actions-external">
                    <HeaderActionMenu
                        label="Google Drive"
                        title="Google Drive"
                        isOpen={openActionMenu === 'drive'}
                        onToggle={() => setOpenActionMenu(current => (current === 'drive' ? null : 'drive'))}
                        onClose={() => setOpenActionMenu(null)}
                        icon={<GoogleDriveColoredIcon />}
                        showChevron={false}
                        buttonClassName="action-btn-icon action-btn-drive action-btn-subtle"
                    >
                        {auth.isSignedIn ? (
                            <>
                                <button
                                    type="button"
                                    onClick={() => handleDropdownAction(drive.onSaveToDrive)}
                                    disabled={drive.isSaving}
                                >
                                    <GoogleDriveColoredIcon />
                                    <span>{drive.isSaving ? 'Guardando…' : 'Guardar en Drive'}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleDropdownAction(drive.onOpenFromDrive)}
                                    disabled={driveOptionDisabled}
                                    title={driveOptionDisabled ? 'Cargando Google Picker…' : undefined}
                                >
                                    <FolderOpenIcon />
                                    <span>Abrir desde Drive</span>
                                </button>
                                <div className="action-dropdown-divider" />
                                <button type="button" onClick={() => handleDropdownAction(auth.onChangeUser)}>
                                    <SwitchUserIcon />
                                    <span>Cambiar usuario Drive</span>
                                </button>
                                <button type="button" onClick={() => handleDropdownAction(auth.onSignOut)}>
                                    <SignOutIcon />
                                    <span>Cerrar sesión Drive</span>
                                </button>
                            </>
                        ) : (
                            <button
                                type="button"
                                onClick={() => handleDropdownAction(auth.onSignIn)}
                                disabled={driveSignInDisabled}
                                title={driveSignInDisabled ? 'Google Drive aún no está disponible' : undefined}
                            >
                                <LoginIcon />
                                <span>Iniciar sesión en Drive</span>
                            </button>
                        )}
                    </HeaderActionMenu>
                    </div>
                </div>
            </div>
            <div className="topbar-account">
                <UserAccountMenu
                    isSignedIn={auth.isSignedIn}
                    userProfile={auth.userProfile}
                    onSignOut={auth.onSignOut}
                    onChangeUser={auth.onChangeUser}
                />
            </div>
        </div>
    );
};

export default Header;

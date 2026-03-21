import React, { useEffect, useState } from 'react';
import type { GoogleUserProfile } from '../types';
import { LaunchIcon, GmailIcon, SwitchUserIcon, SignOutIcon } from './icons';
import { useDismissibleLayer } from '../hooks/useDismissibleLayer';

interface UserAccountMenuProps {
    isSignedIn: boolean;
    userProfile: GoogleUserProfile | null;
    onSignOut: () => void;
    onChangeUser: () => void;
}

const UserAccountMenu: React.FC<UserAccountMenuProps> = ({ isSignedIn, userProfile, onSignOut, onChangeUser }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useDismissibleLayer<HTMLDivElement>({
        isOpen: isMenuOpen,
        onDismiss: () => setIsMenuOpen(false),
    });

    useEffect(() => {
        if (!isSignedIn) setIsMenuOpen(false);
    }, [isSignedIn]);

    const userEmail = userProfile?.email?.trim() ?? '';
    const fallbackName = userProfile?.name?.trim() ?? '';
    const avatarLetter = (userEmail || fallbackName || 'U').charAt(0).toUpperCase();
    const displayEmail = userEmail || fallbackName || 'Correo no disponible';

    const openExternalLink = (url: string) => {
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    const handleMenuAction = (action: () => void) => {
        action();
        setIsMenuOpen(false);
    };

    if (!isSignedIn) {
        return null;
    }

    return (
        <div className="user-menu" ref={menuRef}>
            <button
                type="button"
                className={`user-menu-button ${isMenuOpen ? 'open' : ''}`}
                onClick={() => setIsMenuOpen(c => !c)}
                aria-haspopup="true"
                aria-expanded={isMenuOpen}
                title={displayEmail}
            >
                {userProfile?.picture ? (
                    <img src={userProfile.picture} alt={userProfile.name || 'Usuario'} />
                ) : (
                    <span>{avatarLetter}</span>
                )}
            </button>
            {isMenuOpen && (
                <div className="user-menu-dropdown" role="menu">
                    <div className="user-menu-header">
                        <div className="user-menu-avatar-large">
                            {userProfile?.picture ? (
                                <img src={userProfile.picture} alt={userProfile.name || 'Usuario'} />
                            ) : (
                                <span>{avatarLetter}</span>
                            )}
                        </div>
                        <div>
                            <div className="user-menu-name">{userProfile?.name || displayEmail}</div>
                            <div className="user-menu-email" title={displayEmail}>
                                {displayEmail}
                            </div>
                        </div>
                    </div>
                    <div className="user-menu-divider" />
                    <button
                        type="button"
                        className="user-menu-option"
                        onClick={() => handleMenuAction(() => openExternalLink('https://drive.google.com'))}
                    >
                        <LaunchIcon />
                        <span>Ir a Google Drive</span>
                    </button>
                    <button
                        type="button"
                        className="user-menu-option"
                        onClick={() => handleMenuAction(() => openExternalLink('https://mail.google.com'))}
                    >
                        <GmailIcon />
                        <span>Abrir Gmail</span>
                    </button>
                    <div className="user-menu-divider" />
                    <button type="button" className="user-menu-option" onClick={() => handleMenuAction(onChangeUser)}>
                        <SwitchUserIcon />
                        <span>Cambiar de usuario</span>
                    </button>
                    <button type="button" className="user-menu-option" onClick={() => handleMenuAction(onSignOut)}>
                        <SignOutIcon />
                        <span>Cerrar sesión</span>
                    </button>
                </div>
            )}
        </div>
    );
};

export default UserAccountMenu;

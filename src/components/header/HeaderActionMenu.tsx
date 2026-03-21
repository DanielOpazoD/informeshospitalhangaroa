import React from 'react';
import { ChevronDownIcon } from '../icons';
import { useDismissibleLayer } from '../../hooks/useDismissibleLayer';

interface HeaderActionMenuProps {
    label: string;
    title: string;
    isOpen: boolean;
    onToggle: () => void;
    onClose: () => void;
    icon: React.ReactNode;
    children: React.ReactNode;
    showChevron?: boolean;
    buttonClassName?: string;
}

const HeaderActionMenu: React.FC<HeaderActionMenuProps> = ({
    label,
    title,
    isOpen,
    onToggle,
    onClose,
    icon,
    children,
    showChevron = true,
    buttonClassName,
}) => {
    const menuRef = useDismissibleLayer<HTMLDivElement>({
        isOpen,
        onDismiss: onClose,
    });

    return (
        <div className={`action-group ${isOpen ? 'open' : ''}`} ref={menuRef}>
            <button
                type="button"
                className={`action-btn action-group-toggle ${buttonClassName ?? ''}`.trim()}
                onClick={onToggle}
                aria-haspopup="true"
                aria-expanded={isOpen}
                aria-label={label}
                title={title}
            >
                {icon}
                {showChevron && <ChevronDownIcon />}
            </button>
            {isOpen && (
                <div className="action-dropdown" role="menu">
                    {children}
                </div>
            )}
        </div>
    );
};

export default HeaderActionMenu;

import React, { useState } from 'react';
import { BloodTestIcon, FileGroupIcon, GlucoseIcon, GridIcon } from '../icons';
import { useDismissibleLayer } from '../../hooks/useDismissibleLayer';

interface AppLauncherProps {
    onOpenCartolaApp: () => void;
}

const AppLauncher: React.FC<AppLauncherProps> = ({ onOpenCartolaApp }) => {
    const [isOpen, setIsOpen] = useState(false);
    const launcherRef = useDismissibleLayer<HTMLDivElement>({
        isOpen,
        onDismiss: () => setIsOpen(false),
    });

    return (
        <div className={`app-launcher ${isOpen ? 'open' : ''}`} ref={launcherRef}>
            <button
                type="button"
                className="app-launcher-btn action-btn-plain"
                onClick={() => setIsOpen(current => !current)}
                aria-haspopup="true"
                aria-expanded={isOpen}
                aria-label="Abrir aplicaciones"
            >
                <GridIcon />
            </button>
            {isOpen && (
                <div className="app-launcher-dropdown" role="menu">
                    <div className="app-launcher-grid">
                        <button
                            type="button"
                            className="app-tile"
                            onClick={() => {
                                onOpenCartolaApp();
                                setIsOpen(false);
                            }}
                        >
                            <FileGroupIcon />
                            <span>Cartola de medicamentos</span>
                        </button>
                        <button type="button" className="app-tile" onClick={() => setIsOpen(false)}>
                            <BloodTestIcon />
                            <span>Análisis de Sangre</span>
                        </button>
                        <button type="button" className="app-tile" onClick={() => setIsOpen(false)}>
                            <GlucoseIcon />
                            <span>Registro Glicemia</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AppLauncher;

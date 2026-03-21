import React from 'react';

interface HeaderSaveStatusProps {
    saveStatusLabel: string;
    lastSaveTime: string;
    hasUnsavedChanges: boolean;
}

const HeaderSaveStatus: React.FC<HeaderSaveStatusProps> = ({ saveStatusLabel, lastSaveTime, hasUnsavedChanges }) => {
    const statusState = hasUnsavedChanges || !lastSaveTime ? 'unsaved' : 'saved';

    return (
        <div className={`save-status ${statusState}`}>
            <span className="status-dot" data-state={statusState} />
            <div>
                <div className="status-label">{saveStatusLabel}</div>
                {!hasUnsavedChanges && lastSaveTime && (
                    <div className="status-meta">Último guardado: {lastSaveTime}</div>
                )}
            </div>
        </div>
    );
};

export default HeaderSaveStatus;

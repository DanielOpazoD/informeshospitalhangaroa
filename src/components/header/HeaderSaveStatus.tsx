import React from 'react';

interface HeaderSaveStatusProps {
    saveStatusLabel: string;
    lastSaveTime: string;
    hasUnsavedChanges: boolean;
}

const HeaderSaveStatus: React.FC<HeaderSaveStatusProps> = ({ saveStatusLabel, lastSaveTime, hasUnsavedChanges }) => {
    const statusState = hasUnsavedChanges || !lastSaveTime ? 'unsaved' : 'saved';
    const title = !hasUnsavedChanges && lastSaveTime ? `${saveStatusLabel} · ${lastSaveTime}` : saveStatusLabel;

    return (
        <div className={`save-status ${statusState}`} title={title}>
            <span className="status-dot" data-state={statusState} />
            <span className="save-status-copy">
                <span className="status-label">{saveStatusLabel}</span>
                {!hasUnsavedChanges && lastSaveTime && <span className="status-meta">{lastSaveTime}</span>}
            </span>
        </div>
    );
};

export default HeaderSaveStatus;

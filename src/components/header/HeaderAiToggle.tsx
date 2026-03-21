import React from 'react';
import { RobotIcon } from '../icons';

interface HeaderAiToggleProps {
    isVisible: boolean;
    onToggle: () => void;
}

const HeaderAiToggle: React.FC<HeaderAiToggleProps> = ({ isVisible, onToggle }) => (
    <button
        type="button"
        className={`ai-launch-btn ${isVisible ? 'is-active' : ''}`}
        onClick={onToggle}
        aria-pressed={isVisible}
        aria-label={isVisible ? 'Ocultar asistente clínico' : 'Abrir asistente clínico'}
        title={isVisible ? 'Ocultar asistente clínico' : 'Abrir asistente clínico'}
    >
        <span className="ai-launch-icon" aria-hidden="true">
            <RobotIcon />
        </span>
        <span className="ai-launch-label">IA</span>
    </button>
);

export default HeaderAiToggle;

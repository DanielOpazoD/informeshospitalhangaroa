import React from 'react';
import { HistoryIcon, PrintIcon, RefreshIcon, RedoIcon, UndoIcon } from '../icons';

interface HeaderQuickActionsProps {
    canUndo: boolean;
    canRedo: boolean;
    onOpenHistory: () => void;
    onPrint: () => void;
    onRestoreTemplate: () => void;
    onUndo: () => void;
    onRedo: () => void;
}

const HeaderQuickActions: React.FC<HeaderQuickActionsProps> = ({
    canUndo,
    canRedo,
    onOpenHistory,
    onPrint,
    onRestoreTemplate,
    onUndo,
    onRedo,
}) => (
    <div className="topbar-group topbar-quick-actions">
        <button type="button" className="action-btn action-btn-plain" onClick={onOpenHistory} title="Historial">
            <HistoryIcon />
        </button>
        <button type="button" className="action-btn action-btn-plain" onClick={onPrint} title="Imprimir PDF">
            <PrintIcon />
        </button>
        <button
            type="button"
            className="action-btn action-btn-plain"
            onClick={onRestoreTemplate}
            title="Restablecer planilla"
        >
            <RefreshIcon />
        </button>
        <button
            type="button"
            className="action-btn action-btn-plain"
            onClick={onUndo}
            disabled={!canUndo}
            title={!canUndo ? 'No hay cambios previos para deshacer' : 'Deshacer último cambio persistido'}
        >
            <UndoIcon />
        </button>
        <button
            type="button"
            className="action-btn action-btn-plain"
            onClick={onRedo}
            disabled={!canRedo}
            title={!canRedo ? 'No hay cambios posteriores para rehacer' : 'Rehacer cambio revertido'}
        >
            <RedoIcon />
        </button>
    </div>
);

export default HeaderQuickActions;

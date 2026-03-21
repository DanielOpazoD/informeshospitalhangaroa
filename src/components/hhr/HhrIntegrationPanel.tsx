import React from 'react';
import type { AsyncJobState } from '../../types';
import type { HhrAuthenticatedUser, HhrCensusPatient } from '../../hhrTypes';
import { formatHhrDisplayDate } from '../../utils/hhrIntegration';
import { UploadIcon, SignOutIcon, SearchIcon } from '../icons';

interface HhrIntegrationPanelProps {
    isConfigured: boolean;
    missingEnvKeys: string[];
    isAuthLoading: boolean;
    user: HhrAuthenticatedUser | null;
    censusDateKey: string;
    censusCount: number;
    isCensusLoading: boolean;
    censusError: string | null;
    selectedPatient: HhrCensusPatient | null;
    lastSyncLabel: string | null;
    saveJob: AsyncJobState;
    onSignIn: () => void;
    onSignOut: () => void;
    onOpenCensusModal: () => void;
    onClearSelectedPatient: () => void;
    canSave?: boolean;
    isSaving?: boolean;
    disabledReason?: string;
    onSaveToHhr?: () => void;
}

const HhrIntegrationPanel: React.FC<HhrIntegrationPanelProps> = ({
    isConfigured,
    missingEnvKeys,
    isAuthLoading,
    user,
    censusDateKey,
    censusCount,
    isCensusLoading,
    censusError,
    selectedPatient,
    lastSyncLabel,
    saveJob,
    onSignIn,
    onSignOut,
    onOpenCensusModal,
    onClearSelectedPatient,
    canSave = false,
    isSaving = false,
    disabledReason,
    onSaveToHhr,
}) => {
    if (!user) {
        return (
            <div className="hhr-compact-bar" aria-label="Integración HHR">
                <div className="hhr-compact-brand">
                    <span className="brand-badge">HHR</span>
                    <span className="brand-text">Sistema Central</span>
                </div>
                <div className="hhr-compact-actions">
                    <span className="hhr-compact-status">Desconectado</span>
                    <button
                        type="button"
                        className="btn primary round btn-sm"
                        onClick={onSignIn}
                        disabled={!isConfigured || isAuthLoading}
                    >
                        {isAuthLoading ? 'Conectando…' : 'Conectar con HHR'}
                    </button>
                    {!isConfigured && (
                        <div className="hhr-compact-notice warning" title={`Faltan variables configurables: ${missingEnvKeys.join(', ')}`}>
                            ⚠️ Faltan config
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="hhr-compact-bar connected" aria-label="Integración HHR">
            <div className="hhr-compact-left">
                <div className="hhr-compact-brand">
                    <span className="brand-badge active">HHR</span>
                    <span className="hhr-session-email" title={user.email}>{user.email}</span>
                    <button type="button" className="btn secondary round btn-sm hhr-logout-btn" onClick={onSignOut} title="Cerrar sesión">
                       <SignOutIcon />
                       <span>Cerrar sesión</span>
                    </button>
                </div>
            </div>

            <div className="hhr-compact-center">
                {selectedPatient ? (
                    <div className="hhr-compact-patient">
                        <span className="patient-name">{selectedPatient.patientName}</span>
                        <span className="patient-rut">{selectedPatient.rut || 'Sin RUT'}</span>
                        <button
                            type="button"
                            className="action-btn-plain hhr-clear-icon"
                            onClick={onClearSelectedPatient}
                            title="Desvincular"
                        >
                            ✕
                        </button>
                    </div>
                ) : (
                    <div className="hhr-compact-census" title={`Última carga: ${formatHhrDisplayDate(censusDateKey)}`}>
                        <span className="census-info">{isCensusLoading ? 'Actualizando' : `${censusCount} pctes.`}</span>
                        <button type="button" className="btn secondary round btn-sm" onClick={onOpenCensusModal}>
                            <SearchIcon />
                            <span>Buscar paciente</span>
                        </button>
                        {censusError && <span className="hhr-compact-error" title={censusError}>⚠️</span>}
                    </div>
                )}
            </div>

            <div className="hhr-compact-right">
                <div className="hhr-save-meta-compact">
                    {lastSyncLabel && <span className="sync-time">{lastSyncLabel}</span>}
                    {saveJob.message && <span className="sync-msg" title={saveJob.message}>💬</span>}
                </div>
                <button
                    type="button"
                    className={`btn hhr-upload-btn round btn-sm ${!canSave ? 'disabled' : ''}`}
                    onClick={onSaveToHhr}
                    disabled={!canSave || isSaving}
                    title={!canSave ? disabledReason : 'Guardar borrador clínico en la ficha HHR'}
                >
                    <UploadIcon />
                    <span>{isSaving ? 'Guardando…' : 'Guardar ficha HHR'}</span>
                </button>
            </div>
        </div>
    );
};

export default HhrIntegrationPanel;

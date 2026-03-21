import React from 'react';
import type { AsyncJobState } from '../../types';
import type { HhrAuthenticatedUser, HhrCensusPatient } from '../../hhrTypes';
import { formatHhrDisplayDate } from '../../utils/hhrIntegration';
import { UploadIcon } from '../icons';

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
            <section className="hhr-auth-hero" aria-label="Integración HHR">
                <div className="hhr-auth-content">
                    <h2 className="hhr-auth-title">Ficha Clínica HHR</h2>
                    <p className="hhr-auth-desc">Inicia sesión para sincronizar pacientes y guardar registros en la base de datos central.</p>
                    <button
                        type="button"
                        className="btn primary lg"
                        onClick={onSignIn}
                        disabled={!isConfigured || isAuthLoading}
                    >
                        {isAuthLoading ? 'Conectando…' : 'Iniciar sesión en HHR'}
                    </button>
                    {!isConfigured && (
                        <div className="hhr-panel-notice warning mt-4">
                            Faltan variables: {missingEnvKeys.join(', ')}
                        </div>
                    )}
                </div>
            </section>
        );
    }

    return (
        <section className="hhr-panel" aria-label="Integración HHR">
            <div className="hhr-panel-top">
                <div className="hhr-panel-brand">HHR</div>
                <div className="hhr-session-inline">
                    <span className="hhr-session-dot" aria-hidden="true" />
                    <span className="hhr-session-email">{user.email}</span>
                    <button type="button" className="action-btn-plain hhr-logout-btn" onClick={onSignOut} title="Cerrar sesión HHR">
                        Cerrar sesión
                    </button>
                </div>
            </div>

            <div className="hhr-panel-main">
                <div className="hhr-census-block">
                    <div className="hhr-panel-meta">
                        <span>{formatHhrDisplayDate(censusDateKey)}</span>
                        <span>{isCensusLoading ? 'Actualizando pacientes…' : `${censusCount} pacientes visibles`}</span>
                    </div>
                    <button type="button" className="action-btn hhr-select-btn" onClick={onOpenCensusModal}>
                        Buscar paciente
                    </button>
                    {censusError && <div className="hhr-panel-notice error">{censusError}</div>}
                </div>

                <div className="hhr-patient-block">
                    {selectedPatient ? (
                        <div className="hhr-patient-summary">
                            <div className="hhr-patient-summary-title">{selectedPatient.patientName}</div>
                            <div className="hhr-patient-summary-meta">
                                <span>{selectedPatient.rut || 'Sin RUT'}</span>
                                {selectedPatient.admissionDate && (
                                    <span>Ingreso {formatHhrDisplayDate(selectedPatient.admissionDate)}</span>
                                )}
                            </div>
                            <button
                                type="button"
                                className="action-btn-plain hhr-clear-btn"
                                onClick={onClearSelectedPatient}
                                title="Desvincular paciente"
                            >
                                Limpiar
                            </button>
                        </div>
                    ) : (
                        <div className="hhr-panel-empty">Sin paciente seleccionado</div>
                    )}
                </div>

                <div className="hhr-save-block">
                    <button
                        type="button"
                        className={`action-btn primary hhr-cloud-save ${!canSave ? 'disabled' : ''}`}
                        onClick={onSaveToHhr}
                        disabled={!canSave || isSaving}
                        title={!canSave ? disabledReason : 'Guardar borrador clínico en la ficha HHR'}
                    >
                        <UploadIcon />
                        <span>{isSaving ? 'Guardando HHR…' : 'Guardar en Ficha HHR'}</span>
                    </button>
                    <div className="hhr-save-meta">
                        {lastSyncLabel && <span>{lastSyncLabel}</span>}
                        {saveJob.message && <span>{saveJob.message}</span>}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default HhrIntegrationPanel;

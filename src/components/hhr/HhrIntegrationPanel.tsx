import React from 'react';
import type { AsyncJobState } from '../../types';
import type { HhrAuthenticatedUser, HhrCensusPatient } from '../../hhrTypes';
import { formatHhrDisplayDate, formatHhrRoleLabel } from '../../utils/hhrIntegration';

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
}) => (
    <section className="hhr-panel" aria-label="Integración HHR">
        <div className="hhr-panel-main">
            <div className="hhr-panel-header">
                <div className="hhr-panel-heading">
                    <div className="hhr-panel-title">HHR</div>
                </div>
            </div>

            <div className="hhr-panel-meta">
                <span>{formatHhrDisplayDate(censusDateKey)}</span>
                <span>{isCensusLoading ? 'Actualizando pacientes…' : `${censusCount} pacientes visibles`}</span>
                {lastSyncLabel && <span>{lastSyncLabel}</span>}
                {saveJob.message && <span>{saveJob.message}</span>}
                {user && <span>{formatHhrRoleLabel(user.role)}</span>}
            </div>

            {user && (
                <div className="hhr-session-inline">
                    <span className="hhr-session-dot" aria-hidden="true" />
                    <span className="hhr-session-email">{user.email}</span>
                </div>
            )}

            {selectedPatient ? (
                <div className="hhr-patient-summary">
                    <div className="hhr-patient-summary-title">{selectedPatient.patientName}</div>
                    <div className="hhr-patient-summary-meta">
                        <span>{selectedPatient.rut || 'Sin RUT'}</span>
                        {selectedPatient.admissionDate && (
                            <span>Ingreso {formatHhrDisplayDate(selectedPatient.admissionDate)}</span>
                        )}
                    </div>
                </div>
            ) : (
                <div className="hhr-panel-empty">
                    Sin paciente seleccionado
                </div>
            )}

            {censusError && <div className="hhr-panel-notice error">{censusError}</div>}
            {!isConfigured && (
                <div className="hhr-panel-notice warning">
                    Faltan variables de Firebase: {missingEnvKeys.join(', ')}
                </div>
            )}
        </div>

        <div className="hhr-panel-actions">
            {user ? (
                <>
                    <button type="button" className="hhr-panel-action primary" onClick={onOpenCensusModal}>
                        Seleccionar
                    </button>
                    <button
                        type="button"
                        className="hhr-panel-action"
                        onClick={onClearSelectedPatient}
                        disabled={!selectedPatient}
                    >
                        Limpiar
                    </button>
                    <button type="button" className="hhr-panel-action danger" onClick={onSignOut}>
                        Cerrar sesión
                    </button>
                </>
            ) : (
                <button
                    type="button"
                    className="hhr-panel-action primary"
                    onClick={onSignIn}
                    disabled={!isConfigured || isAuthLoading}
                >
                    {isAuthLoading ? 'Conectando…' : 'Iniciar sesión'}
                </button>
            )}
        </div>
    </section>
);

export default HhrIntegrationPanel;

import React from 'react';
import type { HhrCensusPatient } from '../../hhrTypes';
import { formatHhrDisplayDate } from '../../utils/hhrIntegration';

interface HhrCensusModalProps {
    isOpen: boolean;
    isLoading: boolean;
    error: string | null;
    patients: HhrCensusPatient[];
    onClose: () => void;
    onSelectPatient: (patient: HhrCensusPatient) => void;
}

const HhrCensusModal: React.FC<HhrCensusModalProps> = ({
    isOpen,
    isLoading,
    error,
    patients,
    onClose,
    onSelectPatient,
}) => {
    if (!isOpen) {
        return null;
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className="modal-content hhr-census-modal"
                onClick={event => event.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="hhr-census-modal-title"
            >
                <div className="modal-header">
                    <div className="modal-title" id="hhr-census-modal-title">
                        Seleccionar paciente
                    </div>
                    <button type="button" onClick={onClose} className="modal-close" aria-label="Cerrar">
                        &times;
                    </button>
                </div>

                {error && <div className="hhr-panel-notice error">{error}</div>}
                {isLoading && <div className="drive-progress">Cargando censo desde HHR…</div>}

                {!isLoading && !error && patients.length === 0 && (
                    <div className="hhr-empty-state">No hay pacientes hospitalizados visibles para hoy.</div>
                )}

                {!isLoading && patients.length > 0 && (
                    <div className="hhr-census-list">
                        {patients.map(patient => (
                            <button
                                key={`${patient.bedId}-${patient.rut || patient.patientName}`}
                                type="button"
                                className="hhr-census-item"
                                onClick={() => onSelectPatient(patient)}
                            >
                                <div className="hhr-census-item-main">
                                    <span className="hhr-census-bed">{patient.bedLabel}</span>
                                    <span className="hhr-census-name">{patient.patientName}</span>
                                </div>
                                <div className="hhr-census-item-meta">
                                    <span>{patient.rut || 'Sin RUT'}</span>
                                    <span>{patient.age ? `${patient.age} años` : 'Edad no registrada'}</span>
                                    <span>
                                        {patient.admissionDate
                                            ? `Ingreso ${formatHhrDisplayDate(patient.admissionDate)}`
                                            : 'Sin fecha de ingreso'}
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default HhrCensusModal;

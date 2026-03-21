import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { FIELD_IDS } from '../appConstants';
import type { ClinicalRecord } from '../types';
import type {
    HhrAuthenticatedUser,
    HhrClinicalSyncState,
    HhrCensusPatient,
} from '../hhrTypes';
import { useHospitalCensus } from './useHospitalCensus';
import {
    getHhrFirebaseMissingEnvKeys,
    isHhrFirebaseConfigured,
} from '../services/hhrFirebaseService';
import {
    getClinicalRecordPatientFieldValue,
    getHhrTodayKey,
} from '../utils/hhrIntegration';
import { createHhrGateway } from '../infrastructure/hhr/hhrGateway';
import type { EditorWorkflowAction } from '../application/editorWorkflow';
import type { ClinicalRecordCommand, ClinicalRecordCommandResult } from '../application/clinicalRecordCommands';

interface UseHhrIntegrationControllerParams {
    record: ClinicalRecord;
    dispatchRecordCommand: (command: ClinicalRecordCommand) => ClinicalRecordCommandResult;
    setHasUnsavedChanges: Dispatch<SetStateAction<boolean>>;
    markRecordAsReplaced: () => void;
    showToast: (message: string, type?: 'success' | 'warning' | 'error') => void;
    dispatchWorkflow?: Dispatch<EditorWorkflowAction>;
}

export const useHhrIntegrationController = ({
    record,
    dispatchRecordCommand,
    setHasUnsavedChanges,
    markRecordAsReplaced,
    showToast,
    dispatchWorkflow,
}: UseHhrIntegrationControllerParams) => {
    const hhrConfigured = isHhrFirebaseConfigured();
    const hhrMissingEnvKeys = getHhrFirebaseMissingEnvKeys();
    const hhrDateKey = getHhrTodayKey();
    const hhrGateway = useMemo(() => createHhrGateway(), []);
    const [hhrUser, setHhrUser] = useState<HhrAuthenticatedUser | null>(null);
    const [isHhrAuthLoading, setIsHhrAuthLoading] = useState(hhrConfigured);
    const [selectedHhrPatient, setSelectedHhrPatient] = useState<HhrCensusPatient | null>(null);
    const [isHhrCensusModalOpen, setIsHhrCensusModalOpen] = useState(false);
    const [hhrSyncState, setHhrSyncState] = useState<HhrClinicalSyncState | null>(null);
    const [isSavingToHhr, setIsSavingToHhr] = useState(false);
    const [lastHhrSyncAt, setLastHhrSyncAt] = useState<string | null>(null);
    const { patients: hhrPatients, isLoading: isHhrCensusLoading, error: hhrCensusError } = useHospitalCensus({
        enabled: hhrConfigured && Boolean(hhrUser),
        dateKey: hhrDateKey,
    });

    useEffect(() => {
        if (!hhrConfigured) {
            setIsHhrAuthLoading(false);
            setHhrUser(null);
            return;
        }

        setIsHhrAuthLoading(true);
        const unsubscribe = hhrGateway.subscribeAuthState(
            user => {
                setHhrUser(user);
                setIsHhrAuthLoading(false);
            },
            error => {
                console.error('No se pudo resolver la sesión HHR:', error);
                setHhrUser(null);
                setIsHhrAuthLoading(false);
                showToast('No fue posible restaurar la sesión HHR.', 'error');
            },
        );

        return unsubscribe;
    }, [hhrConfigured, hhrGateway, showToast]);

    useEffect(() => {
        if (hhrUser) {
            return;
        }

        setSelectedHhrPatient(null);
        setHhrSyncState(null);
        setLastHhrSyncAt(null);
    }, [hhrUser]);

    const clearSyncState = useCallback(() => {
        setHhrSyncState(null);
        setLastHhrSyncAt(null);
    }, []);

    const handleHhrSignIn = useCallback(() => {
        void (async () => {
            try {
                setIsHhrAuthLoading(true);
                const signInResult = await hhrGateway.signIn();
                if (!signInResult.ok) {
                    showToast(signInResult.error.message, 'error');
                    return;
                }
                setHhrUser(signInResult.data);
                showToast('Sesión HHR iniciada correctamente.');
            } finally {
                setIsHhrAuthLoading(false);
            }
        })();
    }, [hhrGateway, showToast]);

    const handleHhrSignOut = useCallback(() => {
        void (async () => {
            const signOutResult = await hhrGateway.signOut();
            if (!signOutResult.ok) {
                showToast(signOutResult.error.message, 'error');
                return;
            }
            setSelectedHhrPatient(null);
            clearSyncState();
            showToast('Sesión HHR cerrada.');
        })();
    }, [clearSyncState, hhrGateway, showToast]);

    const handleSelectHhrPatient = useCallback((patient: HhrCensusPatient) => {
        markRecordAsReplaced();
        const result = dispatchRecordCommand({ type: 'apply_hhr_patient', patient, todayKey: hhrDateKey });
        if (!result.ok) {
            showToast(result.errors.join('\n') || 'No se pudo cargar el paciente desde HHR.', 'error');
            return;
        }
        setHasUnsavedChanges(true);
        setSelectedHhrPatient(patient);
        clearSyncState();
        setIsHhrCensusModalOpen(false);
        showToast(`Paciente ${patient.patientName} cargado desde HHR.`);
    }, [clearSyncState, dispatchRecordCommand, hhrDateKey, markRecordAsReplaced, setHasUnsavedChanges, showToast]);

    const handleClearSelectedHhrPatient = useCallback(() => {
        setSelectedHhrPatient(null);
        clearSyncState();
    }, [clearSyncState]);

    const patientRut = getClinicalRecordPatientFieldValue(record, FIELD_IDS.rut);
    const patientName = getClinicalRecordPatientFieldValue(record, FIELD_IDS.nombre);
    const hhrSaveDisabledReason = !hhrConfigured
        ? 'Configura las variables de Firebase para habilitar HHR.'
        : !hhrUser
            ? 'Inicia sesión en HHR para guardar en la ficha clínica.'
            : !patientName || !patientRut
                ? 'Completa nombre y RUT antes de guardar en HHR.'
                : undefined;
    const canSaveToHhr = !hhrSaveDisabledReason && !isSavingToHhr;

    const handleSaveToHhr = useCallback(() => {
        if (!hhrConfigured || !hhrUser) {
            showToast(hhrSaveDisabledReason || 'La sesión HHR no está disponible.', 'warning');
            return;
        }

        if (!patientName || !patientRut) {
            showToast('Completa nombre y RUT antes de guardar en HHR.', 'warning');
            return;
        }

        void (async () => {
            try {
                setIsSavingToHhr(true);
                dispatchWorkflow?.({ type: 'SYNC_STARTED' });
                const result = await hhrGateway.saveClinicalDocument({
                    record,
                    actor: hhrUser,
                    sourcePatient: selectedHhrPatient,
                    syncState: hhrSyncState,
                });
                if (!result.ok) {
                    dispatchWorkflow?.({ type: 'SYNC_FAILED', error: result.error.message });
                    showToast(result.error.message, 'error');
                    return;
                }
                setHhrSyncState(result.data.syncState);
                setLastHhrSyncAt(result.data.savedAt);
                dispatchWorkflow?.({ type: 'SYNC_SUCCEEDED' });
                showToast(
                    hhrSyncState
                        ? 'Documento clínico actualizado en la ficha HHR.'
                        : 'Documento clínico guardado en la ficha HHR.',
                );
            } finally {
                setIsSavingToHhr(false);
            }
        })();
    }, [dispatchWorkflow, hhrConfigured, hhrGateway, hhrSaveDisabledReason, hhrSyncState, hhrUser, patientName, patientRut, record, selectedHhrPatient, showToast]);

    const lastHhrSyncLabel = useMemo(() => {
        if (!lastHhrSyncAt) {
            return null;
        }

        return `Último guardado HHR: ${new Date(lastHhrSyncAt).toLocaleTimeString('es-CL', {
            hour: '2-digit',
            minute: '2-digit',
        })}`;
    }, [lastHhrSyncAt]);

    return {
        hhrConfigured,
        hhrMissingEnvKeys,
        hhrDateKey,
        hhrPatients,
        isHhrAuthLoading,
        isHhrCensusLoading,
        hhrCensusError,
        selectedHhrPatient,
        isHhrCensusModalOpen,
        setIsHhrCensusModalOpen,
        lastHhrSyncLabel,
        hhrHeader: {
            isEnabled: hhrConfigured,
            canSave: Boolean(canSaveToHhr),
            isSaving: isSavingToHhr,
            disabledReason: hhrSaveDisabledReason,
            onSaveToHhr: handleSaveToHhr,
        },
        hhrPanel: {
            isConfigured: hhrConfigured,
            missingEnvKeys: hhrMissingEnvKeys,
            isAuthLoading: isHhrAuthLoading,
            user: hhrUser,
            censusDateKey: hhrDateKey,
            censusCount: hhrPatients.length,
            isCensusLoading: isHhrCensusLoading,
            censusError: hhrCensusError,
            selectedPatient: selectedHhrPatient,
            lastSyncLabel: lastHhrSyncLabel,
            onSignIn: handleHhrSignIn,
            onSignOut: handleHhrSignOut,
            onOpenCensusModal: () => setIsHhrCensusModalOpen(true),
            onClearSelectedPatient: handleClearSelectedHhrPatient,
        },
        hhrModal: {
            isOpen: isHhrCensusModalOpen,
            isLoading: isHhrCensusLoading,
            error: hhrCensusError,
            patients: hhrPatients,
            onClose: () => setIsHhrCensusModalOpen(false),
            onSelectPatient: handleSelectHhrPatient,
        },
        resetSyncState: clearSyncState,
    };
};

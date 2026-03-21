import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import HhrIntegrationPanel from '../components/hhr/HhrIntegrationPanel';

const baseProps: React.ComponentProps<typeof HhrIntegrationPanel> = {
    isConfigured: true,
    missingEnvKeys: [],
    isAuthLoading: false,
    user: null,
    censusDateKey: '2026-03-20',
    censusCount: 14,
    isCensusLoading: false,
    censusError: null,
    selectedPatient: null,
    lastSyncLabel: null,
    saveJob: { operation: 'hhr_save', status: 'idle', message: null, updatedAt: null },
    onSignIn: vi.fn(),
    onSignOut: vi.fn(),
    onOpenCensusModal: vi.fn(),
    onClearSelectedPatient: vi.fn(),
    canSave: false,
    isSaving: false,
    disabledReason: 'Seleccione un paciente',
    onSaveToHhr: vi.fn(),
};

const renderPanel = (overrides: Partial<React.ComponentProps<typeof HhrIntegrationPanel>> = {}) =>
    render(<HhrIntegrationPanel {...baseProps} {...overrides} />);

const connectedUser = {
    uid: 'user-1',
    email: 'medico@hospital.cl',
    displayName: 'Médico',
    photoURL: '',
    role: 'doctor_specialist',
} as const;

const selectedPatient = {
    bedId: 'bed-12a',
    bedLabel: '12A',
    patientName: 'Juan Pérez',
    rut: '11.111.111-1',
    age: '54',
    birthDate: '1971-01-01',
    admissionDate: '2026-03-20',
    specialty: 'Medicina interna',
    sourceDailyRecordDate: '2026-03-20',
} as const;

describe('HhrIntegrationPanel', () => {
    it('shows missing configuration notice when disconnected and not configured', () => {
        const onSignIn = vi.fn();
        renderPanel({
            isConfigured: false,
            missingEnvKeys: ['VITE_HHR_API_URL'],
            onSignIn,
        });

        expect(screen.getByText('Faltan config')).toBeTruthy();
        const connectButton = screen.getByText('Conectar con HHR') as HTMLButtonElement;
        expect(connectButton.disabled).toBe(true);
        fireEvent.click(connectButton);
        expect(onSignIn).not.toHaveBeenCalled();
    });

    it('shows selected patient controls when connected', () => {
        const onClearSelectedPatient = vi.fn();
        const onSignOut = vi.fn();
        renderPanel({
            user: connectedUser,
            selectedPatient,
            onClearSelectedPatient,
            onSignOut,
        });

        expect(screen.getByText('Juan Pérez')).toBeTruthy();
        expect(screen.getByText('11.111.111-1')).toBeTruthy();
        fireEvent.click(screen.getByTitle('Desvincular'));
        fireEvent.click(screen.getByTitle('Cerrar sesión'));
        expect(onClearSelectedPatient).toHaveBeenCalledOnce();
        expect(onSignOut).toHaveBeenCalledOnce();
    });

    it('shows census state, search action, and save message when no patient is selected', () => {
        const onOpenCensusModal = vi.fn();
        const onSaveToHhr = vi.fn();
        renderPanel({
            user: connectedUser,
            censusError: 'No fue posible cargar el censo',
            lastSyncLabel: 'Sincronizado hace 2 min',
            saveJob: { operation: 'hhr_save', status: 'success', message: 'Borrador subido', updatedAt: 1711015200000 },
            canSave: true,
            disabledReason: undefined,
            onOpenCensusModal,
            onSaveToHhr,
        });

        expect(screen.getByText('14 pctes.')).toBeTruthy();
        expect(screen.getByText('Sincronizado hace 2 min')).toBeTruthy();
        expect(screen.getByTitle('No fue posible cargar el censo')).toBeTruthy();
        expect(screen.getByTitle('Borrador subido')).toBeTruthy();

        fireEvent.click(screen.getByText('Buscar paciente'));
        fireEvent.click(screen.getByText('Guardar ficha HHR'));

        expect(onOpenCensusModal).toHaveBeenCalledOnce();
        expect(onSaveToHhr).toHaveBeenCalledOnce();
    });

    it('disables HHR save when the record cannot be uploaded yet', () => {
        renderPanel({
            user: connectedUser,
            canSave: false,
            disabledReason: 'Seleccione un paciente antes de guardar',
        });

        const saveButton = screen.getByTitle('Seleccione un paciente antes de guardar') as HTMLButtonElement;
        expect(saveButton.disabled).toBe(true);
    });
});

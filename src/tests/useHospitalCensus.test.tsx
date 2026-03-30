import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useHospitalCensus } from '../hooks/useHospitalCensus';
import type { HhrCensusSnapshot } from '../hhrTypes';
import type { HhrGateway } from '../infrastructure/hhr/hhrGateway';

const mocks = vi.hoisted(() => ({
    isHhrFirebaseConfigured: vi.fn(() => true),
}));

vi.mock('../infrastructure/hhr/hhrConfig', () => ({
    isHhrFirebaseConfigured: mocks.isHhrFirebaseConfigured,
}));

const createMockGateway = (): HhrGateway => {
    const snapshots = new Map<string, (snapshot: HhrCensusSnapshot) => void>();
    return {
        signIn: vi.fn(),
        signOut: vi.fn(),
        subscribeAuthState: vi.fn(),
        subscribeCensus: vi.fn().mockImplementation((dateKey, onSnapshotChange) => {
            snapshots.set(dateKey, onSnapshotChange);
            return vi.fn();
        }),
        saveClinicalDocument: vi.fn(),
        __snapshots: snapshots,
    } as unknown as HhrGateway & { __snapshots: Map<string, (s: HhrCensusSnapshot) => void> };
};

describe('useHospitalCensus', () => {
    it('usa censo del día anterior cuando el documento de hoy no existe', () => {
        const gateway = createMockGateway() as HhrGateway & { __snapshots: Map<string, (s: HhrCensusSnapshot) => void> };

        const { result } = renderHook(() => useHospitalCensus({ enabled: true, dateKey: '2026-03-29', gateway }));

        act(() => {
            gateway.__snapshots.get('2026-03-29')?.({
                dateKey: '2026-03-29',
                exists: false,
                patients: [],
            });
            gateway.__snapshots.get('2026-03-28')?.({
                dateKey: '2026-03-28',
                exists: true,
                patients: [{
                    bedId: 'b-1',
                    bedLabel: 'B-1',
                    patientName: 'Paciente fallback',
                    rut: '1-9',
                    age: '40',
                    birthDate: '1986-01-01',
                    admissionDate: '2026-03-20',
                    specialty: 'Medicina',
                    sourceDailyRecordDate: '2026-03-28',
                }],
            });
        });

        expect(result.current.isLoading).toBe(false);
        expect(result.current.patients).toHaveLength(1);
        expect(result.current.patients[0]?.patientName).toBe('Paciente fallback');
    });
});

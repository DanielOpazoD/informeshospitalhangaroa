import { afterEach, describe, expect, it, vi } from 'vitest';

const signInToHhrWithGoogle = vi.fn();
const signOutFromHhr = vi.fn();
const subscribeToHhrAuthState = vi.fn();
const saveClinicalDocumentToHhr = vi.fn();

vi.mock('../services/hhrFirebaseService', () => ({
    signInToHhrWithGoogle,
    signOutFromHhr,
    subscribeToHhrAuthState,
    saveClinicalDocumentToHhr,
}));

describe('hhrGateway', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it('envuelve el login exitoso en un Result', async () => {
        const { createHhrGateway } = await import('../infrastructure/hhr/hhrGateway');
        signInToHhrWithGoogle.mockResolvedValueOnce({ uid: 'user-1' });

        const gateway = createHhrGateway();
        const result = await gateway.signIn();

        expect(result).toEqual({ ok: true, status: 'complete', data: { uid: 'user-1' } });
    });

    it('normaliza errores al guardar documentos clínicos', async () => {
        const { createHhrGateway } = await import('../infrastructure/hhr/hhrGateway');
        saveClinicalDocumentToHhr.mockRejectedValue(new Error('save failed'));

        const gateway = createHhrGateway();
        const result = await gateway.saveClinicalDocument({
            record: {
                version: 'v14',
                templateId: '2',
                title: 'Ficha',
                patientFields: [],
                sections: [],
                medico: '',
                especialidad: '',
            },
            actor: {
                uid: 'user-1',
                email: 'test@example.com',
                displayName: 'Test',
                photoURL: '',
                role: 'editor',
            },
            sourcePatient: null,
            syncState: null,
        });

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error.source).toBe('hhr');
            expect(result.error.code).toBe('save_document');
            expect(result.error.operation).toBe('save_document');
            expect(result.error.transient).toBe(true);
        }
    });

    it('reintenta guardados retryable de HHR', async () => {
        const { createHhrGateway } = await import('../infrastructure/hhr/hhrGateway');
        saveClinicalDocumentToHhr
            .mockRejectedValueOnce(new Error('temporary outage'))
            .mockResolvedValueOnce({ syncState: null, savedAt: '2026-03-21T00:00:00.000Z' });

        const gateway = createHhrGateway();
        const result = await gateway.saveClinicalDocument({
            record: {
                version: 'v14',
                templateId: '2',
                title: 'Ficha',
                patientFields: [],
                sections: [],
                medico: '',
                especialidad: '',
            },
            actor: {
                uid: 'user-1',
                email: 'test@example.com',
                displayName: 'Test',
                photoURL: '',
                role: 'editor',
            },
            sourcePatient: null,
            syncState: null,
        });

        expect(saveClinicalDocumentToHhr).toHaveBeenCalledTimes(2);
        expect(result.ok).toBe(true);
    });
});

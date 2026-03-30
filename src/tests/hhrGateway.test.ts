import { afterEach, describe, expect, it, vi } from 'vitest';

const signInToHhrWithGoogle = vi.fn();
const signOutFromHhr = vi.fn();
const subscribeToHhrAuthState = vi.fn();
const subscribeToHospitalCensusSnapshot = vi.fn();
const saveClinicalDocumentToHhr = vi.fn();

vi.mock('../infrastructure/hhr/hhrFirebaseService', () => ({
    signInToHhrWithGoogle,
    signOutFromHhr,
    subscribeToHhrAuthState,
    subscribeToHospitalCensusSnapshot,
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

    it('no reintenta login interactivo cancelado y lo marca como cancelled', async () => {
        const { createHhrGateway } = await import('../infrastructure/hhr/hhrGateway');
        const popupCancelledError = Object.assign(new Error('Popup closed by user'), {
            code: 'auth/popup-closed-by-user',
        });
        signInToHhrWithGoogle.mockRejectedValueOnce(popupCancelledError);

        const gateway = createHhrGateway();
        const result = await gateway.signIn();

        expect(signInToHhrWithGoogle).toHaveBeenCalledTimes(1);
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.status).toBe('cancelled');
            expect(result.error.code).toBe('sign_in_cancelled');
            expect(result.error.retryable).toBe(false);
        }
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

    it('subscribeCensus delega en subscribeToHospitalCensusSnapshot y retorna el unsubscribe', async () => {
        const { createHhrGateway } = await import('../infrastructure/hhr/hhrGateway');
        const unsubscribe = vi.fn();
        subscribeToHospitalCensusSnapshot.mockReturnValueOnce(unsubscribe);

        const gateway = createHhrGateway();
        const onSnapshot = vi.fn();
        const returned = gateway.subscribeCensus('2026-03-29', onSnapshot);

        expect(subscribeToHospitalCensusSnapshot).toHaveBeenCalledTimes(1);
        expect(subscribeToHospitalCensusSnapshot).toHaveBeenCalledWith(
            '2026-03-29',
            onSnapshot,
            expect.any(Function),
        );
        expect(returned).toBe(unsubscribe);
    });

    it('subscribeCensus envuelve errores del stream con appLogger.warn', async () => {
        const { createHhrGateway } = await import('../infrastructure/hhr/hhrGateway');
        const unsubscribe = vi.fn();
        let capturedErrorCb: ((e: Error) => void) | undefined;
        subscribeToHospitalCensusSnapshot.mockImplementationOnce((_dateKey: string, _onSnap: unknown, onError: (e: Error) => void) => {
            capturedErrorCb = onError;
            return unsubscribe;
        });

        const onErrorProp = vi.fn();
        const gateway = createHhrGateway();
        gateway.subscribeCensus('2026-03-29', vi.fn(), onErrorProp);

        const err = new Error('stream failure');
        capturedErrorCb?.(err);

        expect(onErrorProp).toHaveBeenCalledWith(err);
    });

    it('subscribeCensus acepta llamada sin onError opcional sin lanzar', async () => {
        const { createHhrGateway } = await import('../infrastructure/hhr/hhrGateway');
        let capturedErrorCb: ((e: Error) => void) | undefined;
        subscribeToHospitalCensusSnapshot.mockImplementationOnce((_dateKey: string, _onSnap: unknown, onError: (e: Error) => void) => {
            capturedErrorCb = onError;
            return vi.fn();
        });

        const gateway = createHhrGateway();
        gateway.subscribeCensus('2026-03-29', vi.fn()); // no onError

        expect(() => capturedErrorCb?.(new Error('silent error'))).not.toThrow();
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

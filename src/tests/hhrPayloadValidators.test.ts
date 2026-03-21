import { describe, expect, it } from 'vitest';
import { resolveHhrFirebaseRuntimeConfig } from '../infrastructure/hhr/hhrConfig';
import { parseHhrDailyRecordPayload } from '../utils/hhrPayloadValidators';

describe('hhr payload validation', () => {
    it('normaliza payloads incompletos del censo antes del mapeo clínico', () => {
        const parsed = parseHhrDailyRecordPayload({
            beds: {
                'A-1': {
                    patientName: '  Paciente Uno  ',
                    isBlocked: 0,
                    rut: '11.111.111-1',
                },
                'A-2': 'valor-invalido',
            },
        });

        expect(parsed.beds['A-1']).toEqual(expect.objectContaining({
            patientName: 'Paciente Uno',
            isBlocked: false,
            rut: '11.111.111-1',
        }));
        expect(parsed.beds['A-2']).toEqual(expect.objectContaining({
            patientName: '',
            isBlocked: false,
        }));
    });

    it('detecta configuración HHR/Firebase incompleta', () => {
        const config = resolveHhrFirebaseRuntimeConfig({
            VITE_FIREBASE_API_KEY: 'api',
            VITE_FIREBASE_PROJECT_ID: 'project',
        });

        expect(config.configured).toBe(false);
        expect(config.missingEnvKeys).toContain('VITE_FIREBASE_AUTH_DOMAIN');
        expect(config.hospitalId).toBe('hanga_roa');
    });
});

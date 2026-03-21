
import { describe, it, expect } from 'vitest';
import type { ClinicalRecord, PatientField } from '../types';
import { formatTimeSince, isClinicalRecord, parseClinicalRecord, validateCriticalFields } from '../utils/validationUtils';
import { normalizePatientFields } from '../utils/recordTemplates';

const buildRecord = (fields: PatientField[]): ClinicalRecord => ({
    version: 'v14',
    templateId: 'demo',
    title: 'Test',
    titleMode: 'custom',
    patientFields: fields,
    sections: [],
    medico: 'Dr. Test',
    especialidad: 'General',
});

describe('validateCriticalFields', () => {
    it('detecta campos obligatorios vacíos cuando el template los incluye', () => {
        const fields: PatientField[] = [
            { id: 'nombre', label: 'Nombre', value: '', type: 'text' },
            { id: 'rut', label: 'RUT', value: '  ', type: 'text' },
        ];
        const errors = validateCriticalFields(buildRecord(fields));
        expect(errors.length).toBe(2);
        expect(errors.some(error => error.includes('nombre'))).toBeTruthy();
        expect(errors.some(error => error.includes('RUT'))).toBeTruthy();
    });

    it('valida el formato de fechas antes de aplicarlas a la ficha', () => {
        const fields: PatientField[] = [
            { id: 'nombre', label: 'Nombre', value: 'Paciente', type: 'text' },
            { id: 'rut', label: 'RUT', value: '11.111.111-1', type: 'text' },
            { id: 'fecnac', label: 'Nacimiento', value: 'fecha-invalid', type: 'date' },
        ];
        const errors = validateCriticalFields(buildRecord(fields));
        expect(errors).toEqual(['Ingrese una fecha de nacimiento válida.']);
    });

    it('impide inconsistencias cronológicas entre ingreso y alta', () => {
        const fields: PatientField[] = [
            { id: 'nombre', label: 'Nombre', value: 'Paciente', type: 'text' },
            { id: 'rut', label: 'RUT', value: '22.222.222-2', type: 'text' },
            { id: 'fecnac', label: 'Nacimiento', value: '2000-01-05', type: 'date' },
            { id: 'fing', label: 'Ingreso', value: '2000-01-04', type: 'date' },
            { id: 'finf', label: 'Informe', value: '2000-01-03', type: 'date' },
        ];
        const errors = validateCriticalFields(buildRecord(fields));
        expect(errors.some(error => error.includes('nacimiento'))).toBeTruthy();
        expect(errors.some(error => error.includes('informe'))).toBeTruthy();
    });

    it('regresa una lista vacía cuando los datos son coherentes', () => {
        const fields: PatientField[] = [
            { id: 'nombre', label: 'Nombre', value: 'Paciente', type: 'text' },
            { id: 'rut', label: 'RUT', value: '33.333.333-3', type: 'text' },
            { id: 'fecnac', label: 'Nacimiento', value: '2000-01-01', type: 'date' },
            { id: 'fing', label: 'Ingreso', value: '2024-01-01', type: 'date' },
            { id: 'finf', label: 'Informe', value: '2024-01-02', type: 'date' },
        ];
        const errors = validateCriticalFields(buildRecord(fields));
        expect(errors).toEqual([]);
    });
});

describe('formatTimeSince', () => {
    it('resume el tiempo transcurrido en minutos u horas', () => {
        const reference = 1_000_000;
        expect(formatTimeSince(reference - 10_000, reference)).toBe('hace instantes');
        expect(formatTimeSince(reference - 60_000, reference)).toBe('hace 1 minuto');
        expect(formatTimeSince(reference - 15 * 60_000, reference)).toBe('hace 15 minutos');
        expect(formatTimeSince(reference - 3 * 60 * 60_000, reference)).toBe('hace 3 horas');
    });

    it('cambia a días cuando corresponde', () => {
        const reference = 10_000_000;
        expect(formatTimeSince(reference - 24 * 60 * 60_000, reference)).toBe('hace 1 día');
        expect(formatTimeSince(reference - 3 * 24 * 60 * 60_000, reference)).toBe('hace 3 días');
    });
});

describe('parseClinicalRecord', () => {
    it('reconoce una ficha clínica válida', () => {
        const record = {
            ...buildRecord([
                { id: 'nombre', label: 'Nombre', value: 'Paciente', type: 'text' },
            ]),
            sections: [{ id: 'sec-1', title: 'Diagnóstico', content: '<p>Contenido</p>' }],
        };
        const parsed = parseClinicalRecord(record);
        expect(isClinicalRecord(record)).toBe(true);
        expect(parsed.warnings).toEqual([]);
        expect(parsed.record).toEqual({
            ...record,
            patientFields: normalizePatientFields(record.patientFields),
        });
    });

    it('rechaza payloads incompletos o malformados', () => {
        expect(isClinicalRecord({ version: '1' })).toBe(false);
        expect(parseClinicalRecord({ version: '1' })).toEqual({ record: null, warnings: [] });
        expect(parseClinicalRecord({
            version: '1',
            templateId: '2',
            title: 'x',
            patientFields: [{ label: 'Nombre', value: 'Paciente', type: 'unsupported' }],
            sections: [],
            medico: '',
            especialidad: '',
        })).toEqual({ record: null, warnings: [] });
    });

    it('normaliza los patientFields cuando se entrega un normalizador', () => {
        const record = {
            ...buildRecord([
                { id: 'nombre', label: 'Nombre', value: 'Paciente', type: 'text' },
            ]),
            sections: [{ id: 'sec-1', title: 'Diagnóstico', content: '<p>Contenido</p>' }],
        };
        const parsed = parseClinicalRecord(record, fields => [...fields, { label: 'Extra', value: '', type: 'text' }]);
        expect(parsed.record?.patientFields).toHaveLength(2);
    });

    it('sanitiza HTML peligroso y reporta warnings', () => {
        const parsed = parseClinicalRecord({
            ...buildRecord([{ id: 'nombre', label: 'Nombre', value: 'Paciente', type: 'text' }]),
            sections: [{
                title: 'Plan',
                content: '<script>alert(1)</script><p onclick="hack()">Seguro</p><img src="https://evil.test/a.png" alt="x" />',
            }],
        });

        expect(parsed.record?.sections[0]?.content).toBe('<p>Seguro</p>');
        expect(parsed.record?.sections[0]?.id).toBeTruthy();
        expect(parsed.warnings.length).toBeGreaterThan(0);
    });
});

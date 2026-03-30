import { describe, expect, it } from 'vitest';
import type { ClinicalRecord } from '../types';
import type { HhrAuthenticatedUser } from '../hhrTypes';
import { buildHhrClinicalDocumentSave } from '../utils/hhrIntegration';

const actor: HhrAuthenticatedUser = {
    uid: 'doctor-1',
    email: 'doctor@hospitalhangaroa.cl',
    displayName: 'Doctor HHR',
    photoURL: '',
    role: 'doctor_urgency',
};

const createBaseRecord = (overrides: Partial<ClinicalRecord>): ClinicalRecord => ({
    version: 'v14',
    templateId: '3',
    title: 'Epicrisis médica',
    patientFields: [
        { id: 'nombre', label: 'Nombre', value: 'Paciente Ejemplo', type: 'text' },
        { id: 'rut', label: 'Rut', value: '11.111.111-1', type: 'text' },
        { id: 'fing', label: 'Fecha de ingreso', value: '2026-03-20', type: 'date' },
    ],
    sections: [],
    medico: 'Doctor Ejemplo',
    especialidad: 'Medicina',
    ...overrides,
});

describe('buildHhrClinicalDocumentSave', () => {
    it('usa ids canónicos de HHR para epicrisis y evita secciones duplicadas', () => {
        const record = createBaseRecord({
            templateId: '3',
            sections: [
                { id: 's-a', title: 'Antecedentes', content: 'Antecedentes clínicos' },
                { id: 's-b', title: 'Historia y evolución clínica', content: 'Curso hospitalario' },
                { id: 's-c', title: 'Exámenes complementarios', content: 'Laboratorio' },
                { id: 's-d', title: 'Diagnosticos de egreso', content: 'Neumonía' },
                { id: 's-e', title: 'Indicaciones al alta', content: 'Control en APS' },
            ],
        });

        const result = buildHhrClinicalDocumentSave({
            record,
            actor,
            hospitalId: 'hanga_roa',
            sourcePatient: null,
            syncState: null,
            now: new Date('2026-03-20T12:00:00.000Z'),
        });

        expect(result.payload.documentType).toBe('epicrisis');
        expect(result.payload.templateId).toBe('epicrisis');
        expect(result.payload.sections).toEqual([
            expect.objectContaining({ id: 'antecedentes', title: 'Antecedentes', content: 'Antecedentes clínicos' }),
            expect.objectContaining({ id: 'historia-evolucion', title: 'Historia y evolución clínica', content: 'Curso hospitalario' }),
            expect.objectContaining({ id: 'examenes-complementarios', title: 'Exámenes complementarios', content: 'Laboratorio' }),
            expect.objectContaining({ id: 'diagnosticos', title: 'Diagnósticos de egreso', content: 'Neumonía' }),
            expect.objectContaining({ id: 'plan', title: 'Indicaciones al alta', content: 'Control en APS' }),
        ]);
    });

    it('normaliza evolución al contrato de HHR y conserva solo las secciones base', () => {
        const record = createBaseRecord({
            templateId: '2',
            title: 'Evolución médica',
            sections: [
                { id: 'old-1', title: 'Antecedentes', content: 'HTA' },
                { id: 'old-2', title: 'Historia y evolución clínica', content: 'Paciente estable' },
                { id: 'old-3', title: 'Plan', content: 'Continuar manejo' },
            ],
        });

        const result = buildHhrClinicalDocumentSave({
            record,
            actor,
            hospitalId: 'hanga_roa',
            sourcePatient: null,
            syncState: null,
            now: new Date('2026-03-20T12:00:00.000Z'),
        });

        expect(result.payload.documentType).toBe('evolucion');
        expect(result.payload.templateId).toBe('evolucion');
        expect(result.payload.sections).toEqual([
            expect.objectContaining({ id: 'antecedentes', title: 'Antecedentes', content: 'HTA' }),
            expect.objectContaining({ id: 'historia-evolucion', title: 'Historia y evolución clínica', content: 'Paciente estable' }),
            expect.objectContaining({ id: 'plan', title: 'Plan', content: 'Continuar manejo' }),
        ]);
    });
});

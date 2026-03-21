import { describe, expect, it } from 'vitest';
import type { ClinicalRecord, VersionHistoryEntry } from '../types';
import {
    canExecuteClinicalRecordCommand,
    executeClinicalRecordCommand,
    normalizeClinicalRecordSnapshot,
} from '../application/clinicalRecordCommands';

const buildRecord = (overrides?: Partial<ClinicalRecord>): ClinicalRecord => ({
    version: 'v14',
    templateId: '2',
    title: 'Evolución médica (____) - Hospital Hanga Roa',
    titleMode: 'auto',
    patientFields: [
        { id: 'nombre', label: 'Nombre', value: 'Paciente', type: 'text' },
        { id: 'fecnac', label: 'Fecha de nacimiento', value: '2000-01-15', type: 'date' },
        { id: 'finf', label: 'Fecha del informe', value: '2025-01-15', type: 'date' },
        { id: 'edad', label: 'Edad', value: '', type: 'text', readonly: true },
    ],
    sections: [{ id: 'sec-1', title: 'Plan', content: '<p>Ok</p>' }],
    medico: '',
    especialidad: '',
    ...overrides,
});

describe('clinicalRecordCommands', () => {
    it('edita campos de paciente y recalcula edad', () => {
        const result = executeClinicalRecordCommand(buildRecord(), {
            type: 'edit_patient_field',
            index: 1,
            value: '1995-01-15',
        });

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.record.patientFields[1]?.value).toBe('1995-01-15');
            expect(result.record.patientFields.find(field => field.id === 'edad')?.value).toBe('30');
        }
    });

    it('sanitiza contenido al editar una sección', () => {
        const result = executeClinicalRecordCommand(buildRecord(), {
            type: 'edit_section_content',
            index: 0,
            content: '<script>alert(1)</script><p>Seguro</p>',
        });

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.record.sections[0]?.content).toBe('<p>Seguro</p>');
            expect(result.warnings.length).toBeGreaterThan(0);
        }
    });

    it('respeta títulos custom al cambiar plantilla', () => {
        const result = executeClinicalRecordCommand(buildRecord({
            title: 'Título manual',
            titleMode: 'custom',
        }), {
            type: 'change_template',
            templateId: '3',
        });

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.record.title).toBe('Título manual');
            expect(result.record.titleMode).toBe('custom');
        }
    });

    it('preserva los datos del paciente al cambiar plantilla', () => {
        const result = executeClinicalRecordCommand(buildRecord({
            patientFields: [
                { id: 'nombre', label: 'Nombre', value: 'Jane Roe', type: 'text' },
                { id: 'rut', label: 'Rut', value: '11.111.111-1', type: 'text' },
                { id: 'fecnac', label: 'Fecha de nacimiento', value: '1992-03-20', type: 'date' },
                { id: 'finf', label: 'Fecha del informe', value: '2026-03-21', type: 'date' },
                { id: 'edad', label: 'Edad', value: '34', type: 'text', readonly: true },
                { label: 'Alergias', value: 'Penicilina', type: 'text', isCustom: true },
            ],
        }), {
            type: 'change_template',
            templateId: '3',
        });

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.record.patientFields.find(field => field.id === 'nombre')?.value).toBe('Jane Roe');
            expect(result.record.patientFields.find(field => field.id === 'rut')?.value).toBe('11.111.111-1');
            expect(result.record.patientFields.find(field => field.id === 'finf')?.value).toBe('2026-03-21');
            expect(result.record.patientFields.find(field => field.id === 'finf')?.label).toBe('Fecha de alta');
            expect(result.record.patientFields.find(field => field.label === 'Alergias')?.value).toBe('Penicilina');
        }
    });

    it('marca como no-op los comandos válidos que no cambian el documento', () => {
        const current = normalizeClinicalRecordSnapshot(buildRecord()).record;
        const result = executeClinicalRecordCommand(current, {
            type: 'edit_section_content',
            index: 0,
            content: '<p>Ok</p>',
        });

        expect(result.ok).toBe(true);
        expect(result.changed).toBe(false);
        if (result.ok) {
            expect(result.record).toEqual(current);
        }
    });

    it('usa el mismo pipeline para importación e historial', () => {
        const importPayload = {
            version: 'v13',
            templateId: '2',
            title: 'Importado',
            patientFields: [{ id: 'nombre', label: 'Nombre', value: 'Paciente', type: 'text' }],
            sections: [{ title: 'Plan', content: '<p>Seguro</p>' }],
            medico: '',
            especialidad: '',
        };
        const historyEntry: VersionHistoryEntry = {
            id: '1',
            timestamp: 1,
            record: importPayload as ClinicalRecord,
        };

        const importResult = executeClinicalRecordCommand(buildRecord(), {
            type: 'replace_record_from_import',
            value: importPayload,
        });
        const historyResult = executeClinicalRecordCommand(buildRecord(), {
            type: 'replace_record_from_history',
            entry: historyEntry,
        });

        expect(importResult.record).toEqual(historyResult.record);
        expect(importResult.warnings).toEqual(historyResult.warnings);
        expect(importResult.changed).toBe(true);
        expect(historyResult.changed).toBe(true);
    });

    it('no rompe el documento si se recibe un comando inválido', () => {
        const current = buildRecord();
        const result = executeClinicalRecordCommand(current, {
            type: 'remove_section',
            index: 99,
        });

        expect(result.ok).toBe(false);
        expect(result.record).toEqual(current);
        if (!result.ok) {
            expect(result.errors).toContain('La sección que intenta eliminar no existe.');
        }
    });

    it('aplica paciente HHR sin perder coherencia del documento', () => {
        const result = executeClinicalRecordCommand(buildRecord(), {
            type: 'apply_hhr_patient',
            todayKey: '2026-03-20',
            patient: {
                bedId: 'c1',
                bedLabel: 'C1',
                patientName: 'Jane Roe',
                rut: '11.111.111-1',
                age: '34',
                birthDate: '1992-03-20',
                admissionDate: '2026-03-10',
                specialty: 'Medicina',
                sourceDailyRecordDate: '2026-03-20',
            },
        });

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.record.patientFields.find(field => field.id === 'nombre')?.value).toBe('Jane Roe');
            expect(result.record.patientFields.find(field => field.id === 'rut')?.value).toBe('11.111.111-1');
        }
    });

    it('preserva la etiqueta de fecha según la plantilla al aplicar paciente HHR', () => {
        const result = executeClinicalRecordCommand(buildRecord({
            templateId: '3',
            title: 'Epicrisis médica',
            patientFields: [
                { id: 'nombre', label: 'Nombre', value: '', type: 'text' },
                { id: 'rut', label: 'Rut', value: '', type: 'text' },
                { id: 'fecnac', label: 'Fecha de nacimiento', value: '', type: 'date' },
                { id: 'fing', label: 'Fecha de ingreso', value: '', type: 'date' },
                { id: 'finf', label: 'Fecha de alta', value: '', type: 'date' },
                { id: 'edad', label: 'Edad', value: '', type: 'text', readonly: true },
            ],
        }), {
            type: 'apply_hhr_patient',
            todayKey: '2026-03-20',
            patient: {
                bedId: 'c1',
                bedLabel: 'C1',
                patientName: 'Jane Roe',
                rut: '11.111.111-1',
                age: '34',
                birthDate: '1992-03-20',
                admissionDate: '2026-03-10',
                specialty: 'Medicina',
                sourceDailyRecordDate: '2026-03-20',
            },
        });

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.record.patientFields.find(field => field.id === 'finf')?.label).toBe('Fecha de alta');
            expect(result.record.patientFields.find(field => field.id === 'finf')?.value).toBe('2026-03-20');
        }
    });

    it('bloquea comandos incompatibles con el workflow actual', () => {
        const decision = canExecuteClinicalRecordCommand(
            { type: 'edit_patient_field', index: 0, value: 'Otro nombre' },
            'saving',
        );

        expect(decision.allowed).toBe(false);
        if (!decision.allowed) {
            expect(decision.reason).toContain('No se puede editar el documento');
        }
    });
});

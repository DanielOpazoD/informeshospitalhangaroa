import { describe, expect, it } from 'vitest';
import type { ClinicalRecord } from '../types';
import {
    applyAutoTitle,
    changeRecordTitle,
    changeTemplate,
    importRecordFromJson,
    saveDraftSnapshot,
} from '../application/clinicalRecordUseCases';

const buildRecord = (overrides?: Partial<ClinicalRecord>): ClinicalRecord => ({
    version: 'v14',
    templateId: '2',
    title: 'Evolución médica (____) - Hospital Hanga Roa',
    titleMode: 'auto',
    patientFields: [
        { id: 'finf', label: 'Fecha del informe', value: '', type: 'date' },
        { id: 'nombre', label: 'Nombre', value: 'Paciente', type: 'text' },
    ],
    sections: [{ id: 'sec-1', title: 'Plan', content: '<p>Ok</p>' }],
    medico: '',
    especialidad: '',
    ...overrides,
});

describe('clinicalRecordUseCases', () => {
    it('mantiene títulos personalizados al cambiar plantilla', () => {
        const next = changeTemplate(buildRecord({
            title: 'Título manual',
            titleMode: 'custom',
        }), '3');

        expect(next.title).toBe('Título manual');
        expect(next.titleMode).toBe('custom');
        expect(next.templateId).toBe('3');
    });

    it('marca el título como custom cuando el usuario lo edita', () => {
        const next = changeRecordTitle(buildRecord(), 'Nuevo título');

        expect(next.title).toBe('Nuevo título');
        expect(next.titleMode).toBe('custom');
    });

    it('recalcula títulos automáticos según la fecha del informe', () => {
        const next = applyAutoTitle(buildRecord({
            patientFields: [
                { id: 'finf', label: 'Fecha del informe', value: '2026-03-20', type: 'date' },
            ],
        }));

        expect(next.title).toContain('20/03/26');
        expect(next.titleMode).toBe('auto');
    });

    it('importa registros sanitizando contenido clínico', () => {
        const imported = importRecordFromJson({
            ...buildRecord(),
            sections: [{ title: 'Plan', content: '<script>alert(1)</script><p>Seguro</p>' }],
        });

        expect(imported.errors).toEqual([]);
        expect(imported.record?.sections[0]?.content).toBe('<p>Seguro</p>');
        expect(imported.warnings.length).toBeGreaterThan(0);
    });

    it('mantiene etiquetas específicas de epicrisis al importar', () => {
        const imported = importRecordFromJson({
            ...buildRecord({
                templateId: '3',
                title: 'Epicrisis médica',
            }),
            patientFields: [
                { id: 'finf', label: 'Fecha del informe', value: '2026-03-20', type: 'date' },
                { id: 'nombre', label: 'Nombre', value: 'Paciente', type: 'text' },
            ],
        });

        expect(imported.errors).toEqual([]);
        expect(imported.record?.patientFields.find(field => field.id === 'finf')?.label).toBe('Fecha de alta');
    });

    it('persiste snapshots normalizados y sanitizados', () => {
        const snapshot = saveDraftSnapshot(buildRecord({
            sections: [{ id: 'sec-1', title: 'Plan', content: '<p onclick="bad()">Ok</p>' }],
        }));

        expect(snapshot.sections[0]?.content).toBe('<p>Ok</p>');
        expect(snapshot.patientFields.some(field => field.id === 'rut')).toBe(false);
    });
});

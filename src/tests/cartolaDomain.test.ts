import { describe, expect, it } from 'vitest';
import { DosageForm, Frequency, MedicationCategory, type Medication } from '../components/cartola/types';
import { buildExportBaseName, describeMedicationDose, normalizeMedications } from '../components/cartola/cartolaDomain';

describe('cartolaDomain', () => {
    it('normaliza medicamentos legacy y reordena por categoría', () => {
        const input = [
            {
                id: 1,
                name: 'A',
                presentacion: '10 mg',
                dose: '1',
                frequency: Frequency.EVERY_24H,
                dosageForm: DosageForm.TABLET,
                category: 'insulinas_glp1',
                order: 5,
            },
            {
                id: 2,
                name: 'B',
                presentacion: '20 mg',
                dose: '1',
                frequency: Frequency.EVERY_12H,
                dosageForm: DosageForm.TABLET,
                category: MedicationCategory.CARDIOVASCULAR,
                order: 0,
            },
        ] as unknown as Medication[];

        const normalized = normalizeMedications(input);
        expect(normalized[0].category).toBe(MedicationCategory.CARDIOVASCULAR);
        expect(normalized[1].category).toBe(MedicationCategory.DIABETES);
    });

    it('genera nombres de exportación sanitizados y describe dosis', () => {
        expect(buildExportBaseName({ name: 'Ana / Test', rut: '1-9', date: '2025-01-01' }, '2025-01-01'))
            .toBe('Lista de fármacos - Ana Test - 2025-01-01');
        expect(describeMedicationDose({
            id: 1,
            name: 'Paracetamol',
            presentacion: '500 mg',
            dose: '1',
            frequency: Frequency.EVERY_8H,
            dosageForm: DosageForm.TABLET,
            category: MedicationCategory.OTHER,
            order: 0,
        })).toBe('1 comprimido - cada 8 horas');
    });
});

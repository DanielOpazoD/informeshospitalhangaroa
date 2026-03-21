import { describe, expect, it } from 'vitest';
import type { ClinicalRecord, EditorWorkflowState, VersionHistoryEntry } from '../types';
import {
    executeApplyHhrPatient,
    executeImportRecord,
    executeResetRecord,
    executeRestoreHistoryEntry,
    executeSaveDraft,
    executeSyncToHhr,
} from '../application/editorUseCases';

const workflowState: EditorWorkflowState = {
    status: 'idle',
    hasUnsavedChanges: false,
    lastError: null,
};

const buildRecord = (overrides?: Partial<ClinicalRecord>): ClinicalRecord => ({
    version: 'v14',
    templateId: '2',
    title: 'Informe clínico',
    patientFields: [{ id: 'nombre', label: 'Nombre', value: 'Jane Roe', type: 'text' }],
    sections: [{ id: 'sec-1', title: 'Plan', content: '<p>Ok</p>' }],
    medico: '',
    especialidad: '',
    ...overrides,
});

describe('editorUseCases', () => {
    it('agrega effects y workflow al importar desde Drive', () => {
        const result = executeImportRecord(buildRecord(), workflowState, buildRecord(), 'drive');

        expect(result.commandResult.ok).toBe(true);
        expect(result.workflowActions).toEqual([{ type: 'IMPORT_STARTED' }, { type: 'IMPORT_SUCCEEDED' }]);
        expect(result.effects).toContainEqual({ type: 'close_modal', modal: 'open', priority: 60 });
        expect(result.effects.some(effect => effect.type === 'show_toast')).toBe(true);
    });

    it('propaga cierre de historial al restaurar una entrada', () => {
        const entry: VersionHistoryEntry = {
            id: 'history-1',
            timestamp: 1,
            record: buildRecord({ title: 'Versión anterior' }),
        };

        const result = executeRestoreHistoryEntry(buildRecord(), workflowState, entry);

        expect(result.commandResult.ok).toBe(true);
        expect(result.effects).toContainEqual({ type: 'close_modal', modal: 'history', priority: 60 });
    });

    it('emite reset_hhr_sync al restablecer la ficha', () => {
        const result = executeResetRecord(buildRecord(), workflowState, '2');

        expect(result.commandResult.ok).toBe(true);
        expect(result.effects).toContainEqual({ type: 'reset_hhr_sync', priority: 40 });
    });

    it('construye metadata semántica al guardar borradores', () => {
        const result = executeSaveDraft(buildRecord(), 'manual');

        expect(result.historyMetadata?.commandType).toBe('save_manual');
        expect(result.historyMetadata?.summary).toBe('Guardado manual');
    });

    it('prepara carga de paciente HHR con reset de sync', () => {
        const result = executeApplyHhrPatient(buildRecord(), workflowState, {
            bedId: 'c1',
            bedLabel: 'C1',
            patientName: 'Jane Roe',
            rut: '11.111.111-1',
            age: '34',
            birthDate: '1992-03-20',
            admissionDate: '2026-03-10',
            specialty: 'Medicina',
            sourceDailyRecordDate: '2026-03-20',
        }, '2026-03-21');

        expect(result.commandResult.ok).toBe(true);
        expect(result.effects).toContainEqual({ type: 'reset_hhr_sync', priority: 40 });
    });

    it('bloquea sync HHR cuando el workflow está ocupado', () => {
        const result = executeSyncToHhr(
            { status: 'saving', hasUnsavedChanges: true, lastError: null },
            true,
        );

        expect(result.allowed).toBe(false);
        expect(result.userMessage).toContain('ocupado');
    });
});

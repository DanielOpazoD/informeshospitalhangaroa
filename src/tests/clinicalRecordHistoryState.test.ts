import { describe, expect, it } from 'vitest';
import type { VersionHistoryEntry } from '../types';
import {
    buildHistoryStateFromEntries,
    flattenHistoryState,
    pushHistoryEntry,
    redoHistoryState,
    restoreHistoryEntryState,
    undoHistoryState,
} from '../hooks/clinicalRecord/historyState';

const buildEntry = (id: string, timestamp: number, groupKey?: string): VersionHistoryEntry => ({
    id,
    timestamp,
    record: {
        version: 'v14',
        templateId: '3',
        title: id,
        patientFields: [],
        sections: [],
        medico: '',
        especialidad: '',
    },
    metadata: {
        commandType: 'save_manual',
        commandCategory: 'persistence',
        summary: id,
        changed: true,
        ...(groupKey ? { groupKey } : {}),
    },
});

describe('clinicalRecord history state', () => {
    it('agrupa entradas consecutivas compatibles', () => {
        const initial = buildHistoryStateFromEntries([buildEntry('a', 1_000, 'save:manual')]);
        const next = pushHistoryEntry(initial, buildEntry('b', 2_000, 'save:manual'));

        expect(next.present?.id).toBe('b');
        expect(next.past).toHaveLength(0);
    });

    it('crea una nueva entrada cuando cambia el groupKey', () => {
        const initial = buildHistoryStateFromEntries([buildEntry('a', 1_000, 'save:manual')]);
        const next = pushHistoryEntry(initial, buildEntry('b', 2_000, 'save:auto'));

        expect(next.present?.id).toBe('b');
        expect(next.past.map(entry => entry.id)).toEqual(['a']);
    });

    it('restaura y aplana el estado de historial', () => {
        const state = buildHistoryStateFromEntries([
            buildEntry('c', 3_000),
            buildEntry('b', 2_000),
            buildEntry('a', 1_000),
        ]);

        const restored = restoreHistoryEntryState(state, buildEntry('a', 1_000));
        expect(restored.present?.id).toBe('a');
        expect(flattenHistoryState(restored).map(entry => entry.id)).toEqual(['c', 'b', 'a']);
    });

    it('soporta undo y redo sobre snapshots persistidos', () => {
        const state = buildHistoryStateFromEntries([
            buildEntry('c', 3_000),
            buildEntry('b', 2_000),
            buildEntry('a', 1_000),
        ]);

        const undone = undoHistoryState(state);
        expect(undone.present?.id).toBe('b');
        expect(undone.future.map(entry => entry.id)).toEqual(['c']);

        const redone = redoHistoryState(undone);
        expect(redone.present?.id).toBe('c');
    });
});

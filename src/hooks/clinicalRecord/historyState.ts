import { HISTORY_GROUP_WINDOW_MS, MAX_HISTORY_ENTRIES } from '../../appConstants';
import type { HistoryStacks, VersionHistoryEntry } from '../../types';

export type HistoryState = HistoryStacks;

export const flattenHistoryState = (state: HistoryState): VersionHistoryEntry[] =>
    Array.from(
        new Map(
            [state.present, ...state.past, ...state.future]
                .filter((entry): entry is VersionHistoryEntry => Boolean(entry))
                .sort((left, right) => right.timestamp - left.timestamp)
                .map(entry => [entry.id, entry]),
        ).values(),
    );

export const buildHistoryStateFromEntries = (entries: VersionHistoryEntry[]): HistoryState => ({
    present: entries[0] ?? null,
    past: entries.slice(1, MAX_HISTORY_ENTRIES),
    future: [],
});

export const pushHistoryEntry = (
    state: HistoryState,
    entry: VersionHistoryEntry,
    groupWindowMs = HISTORY_GROUP_WINDOW_MS,
): HistoryState => {
    const latest = state.present;
    const shouldGroup = Boolean(
        latest?.metadata?.groupKey &&
        latest.metadata.groupKey === entry.metadata?.groupKey &&
        entry.timestamp - latest.timestamp <= groupWindowMs,
    );

    if (shouldGroup) {
        return { ...state, present: entry, future: [] };
    }

    return {
        past: state.present ? [state.present, ...state.past].slice(0, MAX_HISTORY_ENTRIES - 1) : state.past,
        present: entry,
        future: [],
    };
};

export const restoreHistoryEntryState = (
    state: HistoryState,
    restored: VersionHistoryEntry,
): HistoryState => ({
    past: state.present && state.present.id !== restored.id
        ? [state.present, ...state.past.filter(entry => entry.id !== restored.id)].slice(0, MAX_HISTORY_ENTRIES - 1)
        : state.past,
    present: restored,
    future: state.present && state.present.id !== restored.id
        ? [state.present, ...state.future].slice(0, MAX_HISTORY_ENTRIES - 1)
        : state.future,
});

export const undoHistoryState = (state: HistoryState): HistoryState => {
    const [target, ...remainingPast] = state.past;
    if (!target) {
        return state;
    }

    return {
        past: remainingPast,
        present: target,
        future: state.present ? [state.present, ...state.future].slice(0, MAX_HISTORY_ENTRIES - 1) : state.future,
    };
};

export const redoHistoryState = (state: HistoryState): HistoryState => {
    const [target, ...remainingFuture] = state.future;
    if (!target) {
        return state;
    }

    return {
        past: state.present ? [state.present, ...state.past].slice(0, MAX_HISTORY_ENTRIES - 1) : state.past,
        present: target,
        future: remainingFuture,
    };
};

import { type AiMode, type RevisionEntry, type RevisionSource } from "@/lib/document";

export interface RevisionDraft {
  label: string;
  source: RevisionSource;
  mode: AiMode | null;
  text: string;
}

export interface RevisionHistoryState {
  entries: RevisionEntry[];
  index: number;
}

export const emptyRevisionHistory: RevisionHistoryState = {
  entries: [],
  index: -1,
};

function createRevisionId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2, 10);
}

export function createRevisionEntry(draft: RevisionDraft): RevisionEntry {
  return {
    id: createRevisionId(),
    label: draft.label,
    source: draft.source,
    mode: draft.mode,
    text: draft.text,
    timestamp: new Date().toISOString(),
  };
}

export function revisionHistoryReducer(state: RevisionHistoryState, action:
  | { type: "reset"; entry: RevisionEntry }
  | { type: "clear" }
  | { type: "push"; entry: RevisionEntry }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "jump"; index: number },
): RevisionHistoryState {
  switch (action.type) {
    case "clear":
      return emptyRevisionHistory;
    case "reset":
      return {
        entries: [action.entry],
        index: 0,
      };
    case "push": {
      const baseEntries = state.entries.slice(0, state.index + 1);
      const previousEntry = baseEntries[baseEntries.length - 1];

      if (previousEntry?.text === action.entry.text) {
        return state;
      }

      const nextEntries = [...baseEntries, action.entry];

      return {
        entries: nextEntries,
        index: nextEntries.length - 1,
      };
    }
    case "undo":
      return state.index > 0 ? { ...state, index: state.index - 1 } : state;
    case "redo":
      return state.index < state.entries.length - 1 ? { ...state, index: state.index + 1 } : state;
    case "jump":
      return action.index >= 0 && action.index < state.entries.length ? { ...state, index: action.index } : state;
    default:
      return state;
  }
}

export function getActiveRevision(state: RevisionHistoryState): RevisionEntry | null {
  return state.entries[state.index] ?? null;
}

export function canUndoRevision(state: RevisionHistoryState): boolean {
  return state.index > 0;
}

export function canRedoRevision(state: RevisionHistoryState): boolean {
  return state.index >= 0 && state.index < state.entries.length - 1;
}

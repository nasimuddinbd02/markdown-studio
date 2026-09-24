import { useSettings } from "../stores/settingsStore";

type Source = "editor" | "preview";
type Listener = (ratio: number) => void;

const listeners: Record<Source, Set<Listener>> = { editor: new Set(), preview: new Set() };
let lockedBy: Source | null = null;
let unlockTimer: ReturnType<typeof setTimeout> | undefined;

/**
 * Proportional scroll synchronisation between the editor and preview panes.
 * Scroll events caused by the sync itself are ignored to avoid feedback loops.
 */
export const scrollSync = {
  emit(source: Source, ratio: number) {
    if (!useSettings.getState().settings.syncScroll) return;
    if (lockedBy && lockedBy !== source) return;
    lockedBy = source;
    clearTimeout(unlockTimer);
    unlockTimer = setTimeout(() => (lockedBy = null), 120);
    for (const l of listeners[source]) l(ratio);
  },
  on(source: Source, listener: Listener) {
    listeners[source].add(listener);
    return () => listeners[source].delete(listener);
  },
};

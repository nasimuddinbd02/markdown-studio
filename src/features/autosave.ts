import { isDirty, useDocuments } from "../stores/documentsStore";
import { useSettings } from "../stores/settingsStore";
import type { Doc } from "../types";
import { saveDocument } from "./documents";

const timers = new Map<string, ReturnType<typeof setTimeout>>();
/** Content that failed to auto-save, per document: don't retry until it changes. */
const failedAt = new Map<string, string>();

const eligible = (d: Doc | undefined): d is Doc =>
  !!d && !!d.path && isDirty(d) && !d.saving && !d.externalChange && failedAt.get(d.id) !== d.content;

async function autoSave(id: string) {
  timers.delete(id);
  const doc = useDocuments.getState().docs.find((d) => d.id === id);
  if (!eligible(doc)) return;
  const content = doc.content;
  const ok = await saveDocument(id, { auto: true });
  if (ok) failedAt.delete(id);
  else failedAt.set(id, content);
}

function saveAllEligible() {
  for (const d of useDocuments.getState().docs) if (eligible(d)) void autoSave(d.id);
}

let installed = false;

/**
 * Auto save (Settings → Files): "after a delay" saves each edited file once
 * typing pauses; "on focus change" saves when switching tabs or leaving the
 * window. Only files that already have a path are saved, and never on top of
 * an unresolved external change.
 */
export function installAutoSave() {
  if (installed) return;
  installed = true;

  useDocuments.subscribe((s, prev) => {
    const mode = useSettings.getState().settings.autoSave;
    if (mode === "afterDelay" && s.docs !== prev.docs) {
      const delay = useSettings.getState().settings.autoSaveDelayMs;
      for (const d of s.docs) {
        const before = prev.docs.find((p) => p.id === d.id);
        if (before && before.content === d.content) continue;
        clearTimeout(timers.get(d.id));
        if (eligible(d)) timers.set(d.id, setTimeout(() => void autoSave(d.id), delay));
      }
    }
    if (mode === "onFocusChange" && s.activeId !== prev.activeId && prev.activeId) {
      void autoSave(prev.activeId);
    }
  });

  window.addEventListener("blur", () => {
    if (useSettings.getState().settings.autoSave !== "off") saveAllEligible();
  });
}

/** Test helper. */
export function resetAutoSaveState() {
  timers.forEach(clearTimeout);
  timers.clear();
  failedAt.clear();
}

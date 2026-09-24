import { MemoryBackend } from "../src/services/memoryBackend";
import { setBackend } from "../src/services";
import { useDocuments } from "../src/stores/documentsStore";
import { useUi } from "../src/stores/uiStore";
import { useWorkspace } from "../src/stores/workspaceStore";

export function setupBackend(files: Record<string, string> = {}, prompts: string[] = []) {
  const answers = [...prompts];
  const backend = new MemoryBackend({
    files,
    approved: ["/ws"],
    prompt: () => answers.shift() ?? null,
  });
  setBackend(backend);
  useDocuments.setState({ docs: [], activeId: null });
  useWorkspace.getState().setRoot(null);
  useUi.setState({ dialogs: [], toasts: [] });
  return backend;
}

/**
 * Answers the next modal dialog(s) with the given button ids, in order.
 * Returns the titles of the dialogs that were answered.
 */
export function autoAnswer(...buttons: string[]) {
  const queue = [...buttons];
  const titles: string[] = [];
  const unsub = useUi.subscribe((s) => {
    const d = s.dialogs[0];
    if (!d || queue.length === 0) return;
    titles.push(d.title);
    const button = queue.shift()!;
    queueMicrotask(() => useUi.getState().closeDialog(d.id, { button }));
  });
  return { titles, stop: unsub };
}

export const docs = () => useDocuments.getState().docs;

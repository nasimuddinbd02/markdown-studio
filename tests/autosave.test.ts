import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installAutoSave, resetAutoSaveState } from "../src/features/autosave";
import { newDocument, openPath } from "../src/features/documents";
import { isDirty, useDocuments } from "../src/stores/documentsStore";
import { useSettings } from "../src/stores/settingsStore";
import { useUi } from "../src/stores/uiStore";
import { AppError } from "../src/services/errors";
import { docs, setupBackend } from "./helpers";

const setMode = (autoSave: "off" | "afterDelay" | "onFocusChange") =>
  useSettings.setState((s) => ({ settings: { ...s.settings, autoSave, autoSaveDelayMs: 500 } }));

/** Runs pending timers and lets the async saves settle. */
async function flush(ms = 600) {
  await vi.advanceTimersByTimeAsync(ms);
}

describe("auto save", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetAutoSaveState();
    installAutoSave();
  });
  afterEach(() => {
    vi.useRealTimers();
    setMode("off");
  });

  it("saves after the delay once typing pauses", async () => {
    const backend = setupBackend({ "/ws/a.md": "a" });
    setMode("afterDelay");
    const id = (await openPath("/ws/a.md"))!;
    useDocuments.getState().setContent(id, "a1");
    await flush(300);
    useDocuments.getState().setContent(id, "a12");
    await flush(300);
    expect((await backend.readTextFile("/ws/a.md")).content).toBe("a"); // timer was reset
    await flush(300);
    expect((await backend.readTextFile("/ws/a.md")).content).toBe("a12");
    expect(isDirty(docs()[0])).toBe(false);
  });

  it("does nothing when off, and never saves untitled documents", async () => {
    const backend = setupBackend({ "/ws/a.md": "a" });
    setMode("off");
    const id = (await openPath("/ws/a.md"))!;
    useDocuments.getState().setContent(id, "changed");
    await flush(2000);
    expect((await backend.readTextFile("/ws/a.md")).content).toBe("a");

    setMode("afterDelay");
    const untitled = newDocument();
    useDocuments.getState().setContent(untitled, "draft");
    await flush(2000);
    expect(useUi.getState().dialogs).toHaveLength(0);
    expect(docs().find((d) => d.id === untitled)?.path).toBeNull();
  });

  it("saves the previous tab when switching tabs (on focus change)", async () => {
    const backend = setupBackend({ "/ws/a.md": "a", "/ws/b.md": "b" });
    setMode("onFocusChange");
    const a = (await openPath("/ws/a.md"))!;
    const b = (await openPath("/ws/b.md"))!;
    useDocuments.getState().setActive(a);
    useDocuments.getState().setContent(a, "a-edited");
    useDocuments.getState().setActive(b);
    await flush(10);
    expect((await backend.readTextFile("/ws/a.md")).content).toBe("a-edited");
  });

  it("flags conflicts instead of overwriting or prompting", async () => {
    const backend = setupBackend({ "/ws/a.md": "a" });
    setMode("afterDelay");
    const id = (await openPath("/ws/a.md"))!;
    backend.externalWrite("/ws/a.md", "theirs");
    useDocuments.getState().setContent(id, "mine");
    await flush();
    expect((await backend.readTextFile("/ws/a.md")).content).toBe("theirs");
    expect(docs()[0].externalChange).toBe("modified");
    expect(useUi.getState().dialogs).toHaveLength(0);
  });

  it("reports a failure once and retries only after the next edit", async () => {
    const backend = setupBackend({ "/ws/a.md": "a" });
    setMode("afterDelay");
    const id = (await openPath("/ws/a.md"))!;
    const write = vi.spyOn(backend, "writeTextFile").mockRejectedValue(new AppError("diskFull", "full"));
    useDocuments.getState().setContent(id, "x");
    await flush();
    await flush();
    expect(write).toHaveBeenCalledTimes(1);
    expect(useUi.getState().toasts.at(-1)?.message).toMatch(/auto-save/);
    write.mockRestore();
    useDocuments.getState().setContent(id, "xy");
    await flush();
    expect((await backend.readTextFile("/ws/a.md")).content).toBe("xy");
  });
});

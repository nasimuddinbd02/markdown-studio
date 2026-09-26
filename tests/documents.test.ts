import { describe, expect, it, vi } from "vitest";
import {
  checkExternalChanges, closeDocument, newDocument, openPath, saveDocument,
} from "../src/features/documents";
import { isDirty, useDocuments } from "../src/stores/documentsStore";
import { useUi } from "../src/stores/uiStore";
import { AppError } from "../src/services/errors";
import { autoAnswer, docs, setupBackend } from "./helpers";

describe("document lifecycle (Appendix A.2)", () => {
  it("creates, edits, saves, closes and reopens a document", async () => {
    const backend = setupBackend({}, ["/ws/notes.md"]);
    const id = newDocument();
    useDocuments.getState().setContent(id, "# Notes\n\nhéllo 世界 🚀\n");
    expect(isDirty(docs()[0])).toBe(true);

    expect(await saveDocument(id)).toBe(true);
    expect(docs()[0]).toMatchObject({ path: "/ws/notes.md", name: "notes.md" });
    expect(isDirty(docs()[0])).toBe(false);

    expect(await closeDocument(id)).toBe(true);
    expect(docs()).toHaveLength(0);

    await openPath("/ws/notes.md");
    expect(docs()[0].content).toBe("# Notes\n\nhéllo 世界 🚀\n");
    expect((await backend.readTextFile("/ws/notes.md")).content).toContain("🚀");
  });

  it("focuses an already-open file instead of opening a duplicate tab", async () => {
    setupBackend({ "/ws/a.md": "a", "/ws/b.md": "b" });
    const a = await openPath("/ws/a.md");
    await openPath("/ws/b.md");
    expect(await openPath("/ws/a.md")).toBe(a);
    expect(docs()).toHaveLength(2);
    expect(useDocuments.getState().activeId).toBe(a);
  });

  it("preserves CRLF line endings on save", async () => {
    const backend = setupBackend({ "/ws/win.md": "a\r\nb\r\n" });
    const id = (await openPath("/ws/win.md"))!;
    expect(docs()[0].content).toBe("a\nb\n");
    useDocuments.getState().setContent(id, "a\nb\nc\n");
    await saveDocument(id);
    expect((backend as unknown as { files: Map<string, { content: string }> }).files.get("/ws/win.md")!.content).toBe(
      "a\r\nb\r\nc\r\n",
    );
  });
});

describe("unsaved changes protection (FR-042, Appendix A.3)", () => {
  it("cancel keeps the tab open", async () => {
    setupBackend({ "/ws/a.md": "a" });
    const id = (await openPath("/ws/a.md"))!;
    useDocuments.getState().setContent(id, "changed");
    const a = autoAnswer("cancel");
    expect(await closeDocument(id)).toBe(false);
    expect(a.titles).toEqual(["Unsaved changes"]);
    expect(docs()).toHaveLength(1);
    a.stop();
  });

  it("don't save discards; save writes then closes", async () => {
    const backend = setupBackend({ "/ws/a.md": "a", "/ws/b.md": "b" });
    const a = (await openPath("/ws/a.md"))!;
    const b = (await openPath("/ws/b.md"))!;
    useDocuments.getState().setContent(a, "a2");
    useDocuments.getState().setContent(b, "b2");
    const answers = autoAnswer("discard", "save");
    expect(await closeDocument(a)).toBe(true);
    expect(await closeDocument(b)).toBe(true);
    answers.stop();
    expect((await backend.readTextFile("/ws/a.md")).content).toBe("a");
    expect((await backend.readTextFile("/ws/b.md")).content).toBe("b2");
  });

  it("a clean document closes without prompting", async () => {
    setupBackend({ "/ws/a.md": "a" });
    const id = (await openPath("/ws/a.md"))!;
    expect(await closeDocument(id)).toBe(true);
    expect(useUi.getState().dialogs).toHaveLength(0);
  });
});

describe("safe save (SRS §10.2, NFR-004)", () => {
  it("keeps the document dirty when the save fails", async () => {
    const backend = setupBackend({ "/ws/a.md": "a" });
    const id = (await openPath("/ws/a.md"))!;
    useDocuments.getState().setContent(id, "important");
    backend.writeTextFile = async () => {
      throw new AppError("diskFull", "No space left on device");
    };
    expect(await saveDocument(id)).toBe(false);
    expect(docs()[0].content).toBe("important");
    expect(isDirty(docs()[0])).toBe(true);
    expect(useUi.getState().toasts[0].message).toMatch(/disk is full/);
  });

  it("offers Save As when permission is denied", async () => {
    const backend = setupBackend({ "/ws/a.md": "a" }, ["/ws/copy.md"]);
    const id = (await openPath("/ws/a.md"))!;
    useDocuments.getState().setContent(id, "mine");
    const original = backend.writeTextFile.bind(backend);
    backend.writeTextFile = async (req) => {
      if (req.path === "/ws/a.md") throw new AppError("permissionDenied", "Access is denied");
      return original(req);
    };
    const a = autoAnswer("saveAs");
    expect(await saveDocument(id)).toBe(true);
    a.stop();
    expect(docs()[0].path).toBe("/ws/copy.md");
    expect((await backend.readTextFile("/ws/copy.md")).content).toBe("mine");
  });

  it("does not overwrite a file changed by another program without asking (FR-018)", async () => {
    const backend = setupBackend({ "/ws/a.md": "original" });
    const id = (await openPath("/ws/a.md"))!;
    useDocuments.getState().setContent(id, "mine");
    backend.externalWrite("/ws/a.md", "theirs");

    const cancel = autoAnswer("cancel");
    expect(await saveDocument(id)).toBe(false);
    cancel.stop();
    expect(cancel.titles).toEqual(["File changed on disk"]);
    expect((await backend.readTextFile("/ws/a.md")).content).toBe("theirs");

    const overwrite = autoAnswer("overwrite");
    expect(await saveDocument(id)).toBe(true);
    overwrite.stop();
    expect((await backend.readTextFile("/ws/a.md")).content).toBe("mine");
  });
});

describe("saving while a save is in flight", () => {
  it("saves again afterwards so later edits are not left unsaved", async () => {
    const backend = setupBackend({ "/ws/a.md": "a" });
    const id = (await openPath("/ws/a.md"))!;
    const original = backend.writeTextFile.bind(backend);
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    let calls = 0;
    backend.writeTextFile = async (req) => {
      if (calls++ === 0) await gate; // first write is slow
      return original(req);
    };
    useDocuments.getState().setContent(id, "one");
    const first = saveDocument(id);
    useDocuments.getState().setContent(id, "one two");
    expect(await saveDocument(id)).toBe(false); // queued, not dropped
    release();
    await first;
    await vi.waitFor(async () => expect((await backend.readTextFile("/ws/a.md")).content).toBe("one two"));
    expect(isDirty(docs()[0])).toBe(false);
  });
});

describe("external change detection (FR-018)", () => {
  it("reloads clean documents and flags dirty ones", async () => {
    const backend = setupBackend({ "/ws/clean.md": "c1", "/ws/dirty.md": "d1" });
    await openPath("/ws/clean.md");
    const dirty = (await openPath("/ws/dirty.md"))!;
    useDocuments.getState().setContent(dirty, "local edit");
    backend.externalWrite("/ws/clean.md", "c2");
    backend.externalWrite("/ws/dirty.md", "d2");

    await checkExternalChanges();

    const [clean, d] = docs();
    expect(clean.content).toBe("c2");
    expect(clean.externalChange).toBeNull();
    expect(d.content).toBe("local edit");
    expect(d.externalChange).toBe("modified");
  });

  it("flags deleted files and keeps their text", async () => {
    const backend = setupBackend({ "/ws/gone.md": "text" });
    await openPath("/ws/gone.md");
    backend.externalDelete("/ws/gone.md");
    await checkExternalChanges();
    expect(docs()[0]).toMatchObject({ externalChange: "deleted", content: "text" });
  });
});

describe("error handling (SRS §12)", () => {
  it("reports a missing file without crashing", async () => {
    setupBackend({});
    expect(await openPath("/ws/missing.md")).toBeNull();
    expect(useUi.getState().toasts[0].message).toMatch(/no longer exists/);
  });

  it("refuses paths outside the approved scope (SEC-002/003)", async () => {
    setupBackend({ "/secret/keys.md": "secret", "/ws/a.md": "a" });
    expect(await openPath("/secret/keys.md")).toBeNull();
    expect(await openPath("/ws/../secret/keys.md")).toBeNull();
    expect(docs()).toHaveLength(0);
  });
});

describe("reopen closed tab", () => {
  it("reopens closed files most recent first, skipping missing and already open ones", async () => {
    const { reopenClosedDocument, hasClosedDocuments } = await import("../src/features/documents");
    const activeDoc = () => useDocuments.getState().docs.find((d) => d.id === useDocuments.getState().activeId);
    const backend = setupBackend({ "/ws/a.md": "A", "/ws/b.md": "B", "/ws/c.md": "C" });
    const a = (await openPath("/ws/a.md"))!;
    const b = (await openPath("/ws/b.md"))!;
    const c = (await openPath("/ws/c.md"))!;
    await closeDocument(a);
    await closeDocument(c);
    await closeDocument(b);
    expect(hasClosedDocuments()).toBe(true);

    await backend.deletePath("/ws/b.md");
    expect(await reopenClosedDocument()).toBe(true); // b is gone, so c
    expect(activeDoc()?.path).toBe("/ws/c.md");
    await openPath("/ws/a.md");
    expect(await reopenClosedDocument()).toBe(false); // a is already open
    expect(useUi.getState().toasts.at(-1)?.message).toBe("There are no closed files to reopen.");
    expect(hasClosedDocuments()).toBe(false);
  });
});

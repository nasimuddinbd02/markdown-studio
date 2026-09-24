import { describe, expect, it } from "vitest";
import { basename, dirname, isInside, join, resolveRelative } from "../src/services/paths";
import { DEFAULT_SETTINGS, sanitizeSettings } from "../src/stores/settingsStore";
import { MemoryBackend } from "../src/services/memoryBackend";
import { describeError, toAppError } from "../src/services/errors";
import { eventToShortcut } from "../src/features/commands";
import { useDocuments } from "../src/stores/documentsStore";
import type { Doc } from "../src/types";

describe("paths", () => {
  it("handles POSIX and Windows paths", () => {
    expect(basename("/a/b/c.md")).toBe("c.md");
    expect(basename("C:\\docs\\x.md")).toBe("x.md");
    expect(dirname("/a/b/c.md")).toBe("/a/b");
    expect(dirname("C:\\x.md")).toBe("C:\\");
    expect(dirname("/x.md")).toBe("/");
    expect(join("/a", "b.md")).toBe("/a/b.md");
    expect(join("C:\\a", "b.md")).toBe("C:\\a\\b.md");
  });

  it("resolves relative links and refuses to escape the root", () => {
    expect(resolveRelative("/ws/docs/a.md", "../img/p.png")).toBe("/ws/img/p.png");
    expect(resolveRelative("/ws/a.md", "./b%20c.md#x")).toBe("/ws/b c.md");
    expect(resolveRelative("C:\\ws\\docs\\a.md", "..\\img\\p.png")).toBe("C:\\ws\\img\\p.png");
    expect(resolveRelative("/ws/a.md", "../../../etc/passwd")).toBeNull();
    expect(resolveRelative("/ws/a.md", "https://x.y/z.png")).toBeNull();
  });

  it("checks containment case-insensitively and by segment", () => {
    expect(isInside("/ws/a/b.md", "/ws")).toBe(true);
    expect(isInside("/ws2/b.md", "/ws")).toBe(false);
    expect(isInside("C:\\WS\\a.md", "c:\\ws")).toBe(true);
  });
});

describe("settings (FR-062, corrupt configuration)", () => {
  it("falls back to defaults for missing or corrupt values", () => {
    expect(sanitizeSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(sanitizeSettings("garbage")).toEqual(DEFAULT_SETTINGS);
    const s = sanitizeSettings({ theme: "neon", fontSize: 999, viewMode: "preview", lineNumbers: "yes", session: { files: [1, "/a.md"] } });
    expect(s.theme).toBe("system");
    expect(s.fontSize).toBe(40);
    expect(s.viewMode).toBe("preview");
    expect(s.lineNumbers).toBe(true);
    expect(s.session.files).toEqual(["/a.md"]);
  });
});

describe("memory backend scope rules (mirrors the native backend)", () => {
  const backend = new MemoryBackend({ files: { "/ws/a.md": "a", "/other/b.md": "b" }, approved: ["/ws"] });

  it("rejects traversal and out-of-scope paths", async () => {
    await expect(backend.readTextFile("/ws/../other/b.md")).rejects.toMatchObject({ kind: "invalidPath" });
    await expect(backend.readTextFile("/other/b.md")).rejects.toMatchObject({ kind: "outOfScope" });
    await expect(backend.readTextFile("relative.md")).rejects.toMatchObject({ kind: "invalidPath" });
    await expect(backend.createFile("/ws", "../x.md")).rejects.toMatchObject({ kind: "invalidPath" });
    await expect(backend.renamePath("/ws/a.md", "sub/x.md")).rejects.toMatchObject({ kind: "invalidPath" });
  });

  it("lists only folders and Markdown files", async () => {
    const b = new MemoryBackend({ files: { "/ws/z.md": "", "/ws/A.markdown": "", "/ws/img.png": "", "/ws/sub/x.md": "" }, approved: ["/ws"] });
    expect((await b.listDir("/ws")).map((e) => e.name)).toEqual(["sub", "A.markdown", "z.md"]);
  });

  it("only opens http(s) and mailto links externally", async () => {
    await expect(backend.openExternal("file:///etc/passwd")).rejects.toMatchObject({ kind: "invalidPath" });
  });
});

describe("errors", () => {
  it("maps backend payloads to actionable messages", () => {
    const e = toAppError({ kind: "permissionDenied", message: "Access is denied" });
    expect(e.kind).toBe("permissionDenied");
    expect(describeError(e, "save “a.md”")).toMatch(/Save As/);
    expect(toAppError(new Error("boom")).kind).toBe("io");
  });
});

describe("keyboard shortcuts", () => {
  it("normalizes key events", () => {
    const ev = (init: KeyboardEventInit) => new KeyboardEvent("keydown", init);
    expect(eventToShortcut(ev({ key: "s", code: "KeyS", ctrlKey: true }))).toBe("Mod+S");
    expect(eventToShortcut(ev({ key: "S", code: "KeyS", ctrlKey: true, shiftKey: true }))).toBe("Mod+Shift+S");
    expect(eventToShortcut(ev({ key: "Tab", code: "Tab", ctrlKey: true }))).toBe("Mod+Tab");
    expect(eventToShortcut(ev({ key: "\\", code: "Backslash", ctrlKey: true }))).toBe("Mod+\\");
  });
});

describe("tab navigation (FR-043)", () => {
  it("cycles through tabs and picks a neighbour when closing", () => {
    const mk = (id: string): Doc => ({
      id, path: null, name: id, content: "", savedContent: "", lineEnding: "lf", bom: false, mtime: null, externalChange: null, saving: false,
    });
    const s = useDocuments.getState();
    useDocuments.setState({ docs: [], activeId: null });
    ["a", "b", "c"].forEach((id) => s.add(mk(id)));
    expect(useDocuments.getState().activeId).toBe("c");
    s.cycle(1);
    expect(useDocuments.getState().activeId).toBe("a");
    s.cycle(-1);
    expect(useDocuments.getState().activeId).toBe("c");
    s.setActive("b");
    s.remove("b");
    expect(useDocuments.getState().activeId).toBe("c");
  });
});

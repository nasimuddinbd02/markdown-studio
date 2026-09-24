import { describe, expect, it } from "vitest";
import { handleOpenPaths, installOsOpenHandlers, openDroppedFiles } from "../src/features/osOpen";
import { useDocuments } from "../src/stores/documentsStore";
import { useWorkspace } from "../src/stores/workspaceStore";
import { useUi } from "../src/stores/uiStore";
import { docs, setupBackend } from "./helpers";

describe("opening files from the OS", () => {
  it("opens a folder as the workspace and activates the first file", async () => {
    setupBackend({ "/proj/a.md": "# A", "/proj/b.md": "# B" });
    await handleOpenPaths({ files: ["/ws/../proj/a.md"], folders: [] }); // rejected by scope
    expect(docs()).toHaveLength(0);

    const backend = setupBackend({ "/proj/a.md": "# A", "/proj/b.md": "# B" });
    backend.simulateOpen({ files: [], folders: ["/proj"] });
    await handleOpenPaths({ files: ["/proj/a.md", "/proj/b.md"], folders: ["/proj"] });
    expect(useWorkspace.getState().root).toBe("/proj");
    expect(docs().map((d) => d.name)).toEqual(["a.md", "b.md"]);
    expect(useDocuments.getState().activeId).toBe(docs()[0].id);
  });

  it("reacts to paths opened while running (drop / second launch)", async () => {
    const backend = setupBackend({ "/other/n.md": "note" });
    await installOsOpenHandlers();
    backend.simulateOpen({ files: ["/other/n.md"], folders: [] });
    await new Promise((r) => setTimeout(r, 0));
    expect(docs().map((d) => d.content)).toEqual(["note"]);
  });

  it("opens dropped Markdown files as new documents in the browser", async () => {
    setupBackend();
    const md = new File(["# Dropped\r\nline"], "dropped.md", { type: "text/markdown" });
    const png = new File(["x"], "image.png", { type: "image/png" });
    await openDroppedFiles([md, png]);
    expect(docs()).toHaveLength(1);
    expect(docs()[0]).toMatchObject({ name: "dropped.md", content: "# Dropped\nline", path: null });

    await openDroppedFiles([png]);
    expect(useUi.getState().toasts.at(-1)?.message).toMatch(/Only Markdown/);
  });
});

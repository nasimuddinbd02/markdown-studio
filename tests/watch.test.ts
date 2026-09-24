import { describe, expect, it } from "vitest";
import { applyFsChanges, installWorkspaceWatcher } from "../src/features/watch";
import { openPath } from "../src/features/documents";
import { setWorkspace, toggleDir } from "../src/features/workspace";
import { useWorkspace } from "../src/stores/workspaceStore";
import { docs, setupBackend } from "./helpers";

const names = (dir: string) => (useWorkspace.getState().children[dir] ?? []).map((e) => e.name);

describe("workspace watching", () => {
  it("refreshes listed folders when files appear or disappear", async () => {
    const backend = setupBackend({ "/ws/a.md": "a", "/ws/docs/b.md": "b" });
    await setWorkspace("/ws");
    await toggleDir("/ws/docs");
    expect(names("/ws/docs")).toEqual(["b.md"]);

    backend.externalWrite("/ws/docs/new.md", "new");
    backend.externalDelete("/ws/a.md");
    await applyFsChanges(["/ws/docs/new.md", "/ws/a.md"]);
    expect(names("/ws/docs")).toEqual(["b.md", "new.md"]);
    expect(names("/ws")).toEqual(["docs"]);
  });

  it("re-checks open documents that changed on disk", async () => {
    const backend = setupBackend({ "/ws/a.md": "old" });
    await setWorkspace("/ws");
    await openPath("/ws/a.md");
    backend.externalWrite("/ws/a.md", "new from another app");
    await applyFsChanges(["/ws/a.md"]);
    expect(docs()[0].content).toBe("new from another app");
  });

  it("ignores changes outside the workspace", async () => {
    setupBackend({ "/ws/a.md": "a" });
    await setWorkspace("/ws");
    const before = useWorkspace.getState().children;
    await applyFsChanges(["/elsewhere/x.md"]);
    expect(useWorkspace.getState().children).toBe(before);
  });

  it("follows the backend watcher events end to end", async () => {
    const backend = setupBackend({ "/ws/a.md": "a" });
    await installWorkspaceWatcher();
    await setWorkspace("/ws");
    await new Promise((r) => setTimeout(r, 0));
    backend.externalWrite("/ws/c.md", "c");
    await new Promise((r) => setTimeout(r, 200));
    expect(names("/ws")).toEqual(["a.md", "c.md"]);
  });
});

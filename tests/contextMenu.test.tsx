import { describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ContextMenu } from "../src/components/ContextMenu";
import { TabBar } from "../src/components/TabBar";
import { closeOthers, closeSaved, closeToTheRight, copyRelativePath } from "../src/features/pathActions";
import { newDocument, openPath } from "../src/features/documents";
import { setWorkspace } from "../src/features/workspace";
import { useDocuments } from "../src/stores/documentsStore";
import { autoAnswer, docs, setupBackend } from "./helpers";

describe("ContextMenu", () => {
  it("focuses the first item, navigates with arrows and runs on Enter", async () => {
    const a = vi.fn();
    const b = vi.fn();
    const onClose = vi.fn();
    render(<ContextMenu x={10} y={10} label="Test" onClose={onClose} items={[{ label: "A", run: a }, "separator", { label: "B", run: b }]} />);
    expect(screen.getByRole("menuitem", { name: "A" })).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "B" })).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    expect(b).toHaveBeenCalled();
    expect(a).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("closes on Escape and skips disabled items", async () => {
    const onClose = vi.fn();
    render(
      <ContextMenu x={0} y={0} label="T" onClose={onClose} items={[{ label: "Off", run: vi.fn(), disabled: true }, { label: "On", run: vi.fn() }]} />,
    );
    expect(screen.getByRole("menuitem", { name: "On" })).toHaveFocus();
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });
});

describe("tab close actions", () => {
  async function openThree() {
    setupBackend({ "/ws/a.md": "a", "/ws/b.md": "b", "/ws/c.md": "c" });
    const ids = [];
    for (const f of ["a", "b", "c"]) ids.push((await openPath(`/ws/${f}.md`))!);
    return ids;
  }

  it("closes others and to the right", async () => {
    const [a, b] = await openThree();
    await closeToTheRight(b);
    expect(docs().map((d) => d.name)).toEqual(["a.md", "b.md"]);
    await closeOthers(a);
    expect(docs().map((d) => d.name)).toEqual(["a.md"]);
  });

  it("closes only saved tabs, and stops if a dirty tab prompt is cancelled", async () => {
    const [a, b] = await openThree();
    useDocuments.getState().setContent(b, "edited");
    await closeSaved();
    expect(docs().map((d) => d.name)).toEqual(["b.md"]);

    await openPath("/ws/c.md");
    const answers = autoAnswer("cancel");
    await closeOthers(docs().find((d) => d.name === "c.md")!.id);
    answers.stop();
    expect(docs().map((d) => d.name)).toEqual(["b.md", "c.md"]);
    void a;
  });

  it("opens the tab menu with a right-click", async () => {
    setupBackend();
    render(<TabBar />);
    act(() => {
      newDocument();
    });
    await userEvent.pointer({ keys: "[MouseRight]", target: screen.getByRole("tab") });
    expect(screen.getByRole("menu", { name: /Actions for Untitled-1.md/ })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Copy Path" })).toBeDisabled();
  });
});

describe("copy relative path", () => {
  it("copies the workspace-relative path", async () => {
    setupBackend({ "/ws/docs/a.md": "" });
    await setWorkspace("/ws");
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    await copyRelativePath("/ws/docs/a.md");
    expect(writeText).toHaveBeenCalledWith("docs/a.md");
  });
});

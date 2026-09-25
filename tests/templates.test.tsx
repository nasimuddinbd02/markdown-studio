import { describe, expect, it } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BUILT_IN_TEMPLATES, fillTemplate, listTemplates, newFromTemplate } from "../src/features/templates";
import { CommandPalette } from "../src/components/CommandPalette";
import { commands } from "../src/features/commands";
import { useUi } from "../src/stores/uiStore";
import { useWorkspace } from "../src/stores/workspaceStore";
import { docs, setupBackend } from "./helpers";

describe("templates", () => {
  it("fills date placeholders and finds the cursor", () => {
    const now = new Date(2026, 0, 1, 9, 5); // Thu 1 Jan 2026 = ISO week 1
    const { text, cursor } = fillTemplate("# {{title}} {{ date }}\n{{time}} w{{week}} {{year}} {{datetime}}\n- {{cursor}}\n{{unknown}}", "Plan", now);
    expect(text).toBe("# Plan 2026-01-01\n09:05 w1 2026 2026-01-01 09:05\n- \n{{unknown}}");
    expect(text.slice(0, cursor).endsWith("\n- ")).toBe(true);
    expect(fillTemplate("x", "t").cursor).toBe(1);
    expect(fillTemplate("{{week}}", "t", new Date(2027, 0, 1)).text).toBe("53");
  });

  it("every built-in template has a cursor and valid placeholders", () => {
    for (const t of BUILT_IN_TEMPLATES) {
      const { text } = fillTemplate(t.body!, t.name);
      expect(text, t.id).not.toMatch(/\{\{/);
      expect(t.body, t.id).toMatch(/\{\{cursor\}\}/);
    }
  });

  it("adds Markdown files from the workspace templates/ folder", async () => {
    setupBackend({ "/ws/templates/Bug report.md": "# Bug: {{cursor}}\n\nFound {{date}}", "/ws/notes/x.md": "no" });
    expect((await listTemplates()).some((t) => t.path)).toBe(false);
    useWorkspace.getState().setRoot("/ws");
    const list = await listTemplates();
    expect(list[0]).toMatchObject({ name: "Bug report", path: "/ws/templates/Bug report.md" });
    expect(list).toHaveLength(BUILT_IN_TEMPLATES.length + 1);
    await newFromTemplate(list[0]);
    expect(docs()[0].content).toMatch(/^# Bug: \n\nFound \d{4}-\d\d-\d\d$/);
    expect(docs()[0].path).toBeNull();
  });

  it("is picked from the palette with New from Template", async () => {
    setupBackend();
    render(<CommandPalette />);
    act(() => void commands.newFromTemplate.run());
    const dialog = await screen.findByRole("dialog", { name: "New from template" });
    await waitFor(() => expect(screen.getAllByRole("option").length).toBe(BUILT_IN_TEMPLATES.length));
    await userEvent.type(screen.getByRole("combobox"), "adr{Enter}");
    expect(dialog).not.toBeInTheDocument();
    await waitFor(() => expect(docs()).toHaveLength(1));
    expect(docs()[0].content).toMatch(/^# ADR: \n\n- \*\*Status:\*\* Proposed/);
    // The normal palette still lists commands afterwards.
    act(() => useUi.getState().setPaletteOpen(true));
    expect(screen.getByRole("dialog", { name: "Command palette" })).toBeInTheDocument();
  });
});

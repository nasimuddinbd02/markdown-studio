import { describe, expect, it } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { fuzzyFilter, fuzzyScore } from "../src/features/fuzzy";
import { CommandPalette } from "../src/components/CommandPalette";
import { useUi } from "../src/stores/uiStore";
import { useSettings } from "../src/stores/settingsStore";
import { setupBackend } from "./helpers";

describe("fuzzy matching", () => {
  it("matches characters in order and rejects others", () => {
    expect(fuzzyScore("sv", "Save")).not.toBeNull();
    expect(fuzzyScore("vs", "Save")).toBeNull();
    expect(fuzzyScore("", "anything")).toEqual({ score: 0, indices: [] });
  });

  it("ranks word-start and consecutive matches first", () => {
    const labels = ["Close Tab", "Save As", "Save", "Select All"];
    expect(fuzzyFilter(labels, "save", (s) => s).map((r) => r.item)).toEqual(["Save", "Save As"]);
    expect(fuzzyFilter(labels, "sa", (s) => s)[0].item).toBe("Save");
    expect(fuzzyFilter(labels, "ct", (s) => s)[0].item).toBe("Close Tab");
  });
});

describe("command palette", () => {
  it("filters commands and runs the chosen one with the keyboard", async () => {
    setupBackend();
    useSettings.setState((s) => ({ settings: { ...s.settings, viewMode: "split" } }));
    render(<CommandPalette />);
    act(() => useUi.getState().setPaletteOpen(true));

    const input = screen.getByRole("combobox");
    expect(input).toHaveFocus();
    await userEvent.type(input, "preview only");
    const options = screen.getAllByRole("option");
    expect(options[0]).toHaveTextContent("Preview Only");
    expect(options[0]).toHaveAttribute("aria-selected", "true");

    await userEvent.keyboard("{Enter}");
    expect(useUi.getState().paletteOpen).toBe(false);
    await new Promise((r) => setTimeout(r, 0));
    expect(useSettings.getState().settings.viewMode).toBe("preview");
  });

  it("closes on Escape and shows an empty state", async () => {
    setupBackend();
    render(<CommandPalette />);
    act(() => useUi.getState().setPaletteOpen(true));
    await userEvent.type(screen.getByRole("combobox"), "zzzzqqq");
    expect(screen.getByText("No matching commands")).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    expect(useUi.getState().paletteOpen).toBe(false);
  });
});

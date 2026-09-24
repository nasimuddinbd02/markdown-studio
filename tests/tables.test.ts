import { describe, expect, it } from "vitest";
import { EditorSelection, EditorState } from "@codemirror/state";
import { displayWidth, formatTable, formatTableAtCursor, splitRow } from "../src/features/tables";
import { applyCommand } from "../src/features/formatting";

describe("table formatting", () => {
  it("aligns columns and normalises the delimiter row", () => {
    const out = formatTable(["|Name|Qty|Note|", "|:-|-:|:-:|", "|Apple|10|fresh|", "|Kiwi|2|x|"]);
    expect(out).toEqual([
      "| Name  | Qty | Note  |",
      "| :---- | --: | :---: |",
      "| Apple |  10 | fresh |",
      "| Kiwi  |   2 |   x   |",
    ]);
  });

  it("fills missing cells and handles rows without outer pipes", () => {
    expect(formatTable(["a | b", "--- | ---", "1"])).toEqual(["| a   | b   |", "| --- | --- |", "| 1   |     |"]);
  });

  it("keeps escaped pipes and pipes in code spans inside a cell", () => {
    expect(splitRow("| a \\| b | `x|y` | c |")).toEqual(["a \\| b", "`x|y`", "c"]);
  });

  it("measures wide characters as two columns", () => {
    expect(displayWidth("日本")).toBe(4);
    expect(displayWidth("🚀a")).toBe(3);
    expect(formatTable(["| 日本 | a |", "|---|---|", "| x | y |"])).toEqual(["| 日本 | a   |", "| ---- | --- |", "| x    | y   |"]);
  });

  it("rejects non-tables", () => {
    expect(formatTable(["| a |", "| not a delimiter |"])).toBeNull();
    expect(formatTable(["| a |"])).toBeNull();
  });

  it("formats the table around the cursor and keeps the cursor in its cell", () => {
    const doc = "Intro\n\n|a|bb|\n|-|-|\n|ccc|d|\n\nAfter";
    const cursor = doc.indexOf("d|");
    let state = EditorState.create({ doc, selection: EditorSelection.cursor(cursor) });
    state = applyCommand(state, formatTableAtCursor);
    expect(state.doc.toString()).toBe("Intro\n\n| a   | bb  |\n| --- | --- |\n| ccc | d   |\n\nAfter");
    const line = state.doc.lineAt(state.selection.main.head);
    expect(line.text).toBe("| ccc | d   |");
    expect(state.selection.main.head - line.from).toBe(8);
  });
});

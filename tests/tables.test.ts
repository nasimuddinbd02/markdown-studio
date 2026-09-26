import { describe, expect, it } from "vitest";
import { EditorSelection, EditorState } from "@codemirror/state";
import { displayWidth, formatTable, formatTableAtCursor, sortTableAtCursor, sortTableRows, splitRow } from "../src/features/tables";
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

describe("sort table by column", () => {
  const table = ["| Name | Size |", "| --- | ---: |", "| beta | 1,200 |", "| Alpha | 90 |", "| gamma |  |", "| item10 | 3.5 |", "| item9 | 3 |"];

  it("sorts numbers numerically and puts empty cells last", () => {
    expect(sortTableRows(table, 1, false)!.slice(2)).toEqual(["| item9 | 3 |", "| item10 | 3.5 |", "| Alpha | 90 |", "| beta | 1,200 |", "| gamma |  |"]);
    expect(sortTableRows(table, 1, true)!.slice(2, 4)).toEqual(["| beta | 1,200 |", "| Alpha | 90 |"]);
  });

  it("sorts text in natural, case-insensitive order", () => {
    expect(sortTableRows(table, 0, false)!.slice(2).map((l) => l.split("|")[1].trim())).toEqual(["Alpha", "beta", "gamma", "item9", "item10"]);
  });

  it("sorts by the cursor's column and formats the table", () => {
    const doc = "Intro\n\n| Name | Qty |\n| --- | --- |\n| b | 2 |\n| a | 10 |\n";
    const cursor = doc.indexOf("Qty");
    const state = EditorState.create({ doc, selection: EditorSelection.cursor(cursor) });
    const out = applyCommand(state, sortTableAtCursor(true)).doc.toString();
    expect(out).toBe("Intro\n\n| Name | Qty |\n| ---- | --- |\n| a    | 10  |\n| b    | 2   |\n");
    expect(sortTableRows(["| a |", "| b |"], 0, false)).toBeNull();
  });
});

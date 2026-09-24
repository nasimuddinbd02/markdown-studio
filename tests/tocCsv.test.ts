import { describe, expect, it } from "vitest";
import { EditorState, EditorSelection } from "@codemirror/state";
import { buildToc, insertOrUpdateToc, updateToc, TOC_START, TOC_END } from "../src/features/toc";
import { applyCommand } from "../src/features/formatting";
import {
  csvToMarkdownTable, detectDelimiter, looksLikeTsv, markdownTableToCsv, parseDelimited,
} from "../src/services/convert/csv";
import { convertSource } from "../src/features/importing";
import { openPath, saveDocument } from "../src/features/documents";
import { useDocuments } from "../src/stores/documentsStore";
import { DEFAULT_SETTINGS, useSettings } from "../src/stores/settingsStore";
import { docs, setupBackend } from "./helpers";

const DOC = `# Guide

Intro.

## Install

### On Windows

### On macOS

## Use [it](https://x.y)

#### Too deep

## Install
`;

describe("table of contents", () => {
  it("builds nested links with GitHub slugs, skipping the title and very deep levels", () => {
    expect(buildToc(DOC)).toBe(
      [
        TOC_START,
        "- [Install](#install)",
        "  - [On Windows](#on-windows)",
        "  - [On macOS](#on-macos)",
        "- [Use it](#use-it)",
        "- [Install](#install-1)",
        TOC_END,
      ].join("\n"),
    );
  });

  it("inserts at the cursor and updates an existing TOC in place", () => {
    const at = DOC.indexOf("Intro.") + "Intro.".length;
    let state = EditorState.create({ doc: DOC, selection: EditorSelection.cursor(at) });
    state = applyCommand(state, insertOrUpdateToc);
    const text = state.doc.toString();
    expect(text).toContain(`Intro.\n\n${TOC_START}\n- [Install](#install)`);
    // Renaming a heading and running the command again refreshes the block.
    const renamed = EditorState.create({ doc: text.replace("## Use [it](https://x.y)", "## Usage") });
    const updated = applyCommand(renamed, insertOrUpdateToc).doc.toString();
    expect(updated).toContain("- [Usage](#usage)");
    expect(updated.match(/<!-- toc -->/g)).toHaveLength(1);
  });

  it("ignores headings listed inside the TOC and leaves documents without a TOC unchanged", () => {
    expect(updateToc("# A\n\n## B\n")).toBe("# A\n\n## B\n");
    const withToc = `# A\n\n${TOC_START}\n- [Old](#old)\n${TOC_END}\n\n## New\n`;
    expect(updateToc(withToc)).toContain("- [New](#new)");
    expect(updateToc(withToc)).not.toContain("Old");
  });

  it("is refreshed on save when enabled", async () => {
    const backend = setupBackend({ "/ws/a.md": `# A\n\n${TOC_START}\n${TOC_END}\n\n## First\n` });
    useSettings.setState({ settings: { ...DEFAULT_SETTINGS, updateTocOnSave: true } });
    const id = (await openPath("/ws/a.md"))!;
    useDocuments.getState().setContent(id, docs()[0].content + "\n## Second\n");
    await saveDocument(id);
    const saved = (await backend.readTextFile("/ws/a.md")).content;
    expect(saved).toContain("- [First](#first)\n- [Second](#second)");
    expect(docs()[0].content).toBe(saved);
  });
});

describe("CSV / TSV", () => {
  it("parses quoted fields, escaped quotes and embedded newlines", () => {
    expect(parseDelimited('name,note\n"Smith, J","said ""hi""\nthen left"\n', ",")).toEqual([
      ["name", "note"],
      ["Smith, J", 'said "hi"\nthen left'],
    ]);
  });

  it("detects the delimiter", () => {
    expect(detectDelimiter("a;b;c\n1;2;3")).toBe(";");
    expect(detectDelimiter("a\tb\n1\t2")).toBe("\t");
    expect(detectDelimiter("a,b\n1,2")).toBe(",");
  });

  it("converts to an aligned table with numeric columns right-aligned", () => {
    expect(csvToMarkdownTable("Item,Qty,Note\nPens,10,blue|black\nPaper,200,")).toBe(
      ["| Item  | Qty | Note        |", "| ----- | --: | ----------- |", "| Pens  |  10 | blue\\|black |", "| Paper | 200 |             |"].join("\n"),
    );
  });

  it("recognises spreadsheet clipboard text", () => {
    expect(looksLikeTsv("a\tb\n1\t2\n")).toBe(true);
    expect(looksLikeTsv("just\ttext")).toBe(false);
    expect(looksLikeTsv("a\tb\n1\t2\t3")).toBe(false);
  });

  it("exports a Markdown table back to CSV", () => {
    const lines = ["| Name | Note |", "| --- | --- |", "| Ann | a\\|b |", '| Bob | say "hi", ok |'];
    expect(markdownTableToCsv(lines)).toBe('Name,Note\r\nAnn,a|b\r\nBob,"say ""hi"", ok"\r\n');
  });

  it("imports a CSV file as a titled table", async () => {
    const r = await convertSource("csv", new TextEncoder().encode("City,Pop\nOslo,700000\n").buffer as ArrayBuffer, "cities.csv");
    expect(r.markdown).toBe("# cities\n\n| City |    Pop |\n| ---- | -----: |\n| Oslo | 700000 |\n");
  });
});

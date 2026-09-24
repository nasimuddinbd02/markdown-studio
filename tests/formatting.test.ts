import { describe, expect, it } from "vitest";
import { EditorSelection, EditorState, type StateCommand } from "@codemirror/state";
import * as fmt from "../src/features/formatting";
import { editorKeymap } from "../src/features/commands";

/** Builds a state from text where `|` marks the cursor and `[` `]` mark a selection. */
function stateOf(marked: string) {
  const from = marked.indexOf("[");
  if (from >= 0 && !marked.includes("|")) {
    const to = marked.indexOf("]") - 1;
    const doc = marked.replace("[", "").replace("]", "");
    return EditorState.create({ doc, selection: EditorSelection.single(from, to) });
  }
  const cursor = marked.indexOf("|");
  return EditorState.create({ doc: marked.replace("|", ""), selection: EditorSelection.cursor(cursor) });
}

function run(marked: string, command: StateCommand) {
  const s = fmt.applyCommand(stateOf(marked), command);
  const r = s.selection.main;
  return { doc: s.doc.toString(), selected: s.sliceDoc(r.from, r.to), cursor: r.head };
}

describe("inline formatting", () => {
  it("wraps a selection and keeps it selected", () => {
    expect(run("say [hello] now", fmt.toggleBold)).toMatchObject({ doc: "say **hello** now", selected: "hello" });
    expect(run("[x]", fmt.toggleItalic).doc).toBe("*x*");
    expect(run("[gone]", fmt.toggleStrikethrough).doc).toBe("~~gone~~");
    expect(run("[a()]", fmt.toggleInlineCode).doc).toBe("`a()`");
  });

  it("unwraps when the markers surround the selection", () => {
    expect(run("say **[hello]** now", fmt.toggleBold)).toMatchObject({ doc: "say hello now", selected: "hello" });
    expect(run("say [**hello**] now", fmt.toggleBold)).toMatchObject({ doc: "say hello now", selected: "hello" });
  });

  it("inserts an empty pair with the cursor inside", () => {
    expect(run("a | b", fmt.toggleBold)).toMatchObject({ doc: "a **** b", cursor: 4 });
  });
});

describe("links", () => {
  it("wraps text and selects the URL placeholder", () => {
    expect(run("see [docs]", fmt.insertLink)).toMatchObject({ doc: "see [docs](https://)", selected: "https://" });
  });
  it("wraps a URL and puts the cursor in the label", () => {
    expect(run("[https://tauri.app]", fmt.insertLink)).toMatchObject({ doc: "[](https://tauri.app)", cursor: 1 });
  });
  it("inserts a placeholder link with the label selected", () => {
    expect(run("|", fmt.insertLink)).toMatchObject({ doc: "[link text](https://)", selected: "link text" });
  });
});

describe("headings", () => {
  it("sets, changes and removes heading levels", () => {
    expect(run("Ti|tle", fmt.setHeading(2)).doc).toBe("## Title");
    expect(run("# Ti|tle", fmt.setHeading(3)).doc).toBe("### Title");
    expect(run("## Ti|tle", fmt.setHeading(2)).doc).toBe("Title");
    expect(run("### Ti|tle", fmt.setHeading(0)).doc).toBe("Title");
  });
});

describe("line prefixes", () => {
  it("toggles bullet lists across several lines", () => {
    expect(run("[a\nb]", fmt.toggleBulletList).doc).toBe("- a\n- b");
    expect(run("[- a\n- b]", fmt.toggleBulletList).doc).toBe("a\nb");
  });

  it("numbers ordered lists and converts between list kinds", () => {
    expect(run("[a\nb\nc]", fmt.toggleOrderedList).doc).toBe("1. a\n2. b\n3. c");
    expect(run("[- a\n- b]", fmt.toggleOrderedList).doc).toBe("1. a\n2. b");
    expect(run("[1. a\n2. b]", fmt.toggleTaskList).doc).toBe("- [ ] a\n- [ ] b");
    expect(run("- [x] a|", fmt.toggleTaskList).doc).toBe("a");
  });

  it("preserves indentation and skips blank lines", () => {
    expect(run("[  a\n\n  b]", fmt.toggleQuote).doc).toBe("  > a\n\n  > b");
  });
});

describe("blocks", () => {
  it("inserts a code block around the selection on its own lines", () => {
    expect(run("[let x = 1;]", fmt.insertCodeBlock).doc).toBe("```\nlet x = 1;\n```\n");
    expect(run("intro|", fmt.insertCodeBlock).doc).toBe("intro\n\n```\n```\n");
  });

  it("inserts a table with the first header selected", () => {
    const r = run("|", fmt.insertTable);
    expect(r.doc).toContain("| Column 1 | Column 2 |");
    expect(r.selected).toBe("Column 1");
  });
});

describe("editor keymap", () => {
  it("derives CodeMirror key names from menu shortcuts", () => {
    const keys = editorKeymap().map((k) => k.key).filter(Boolean);
    expect(keys).toEqual(expect.arrayContaining(["Mod-b", "Mod-i", "Mod-k", "Mod-Shift-x", "Mod-Alt-1", "Mod-Shift-8", "Mod-Alt-c"]));
  });
});

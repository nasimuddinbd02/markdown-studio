import { describe, expect, it } from "vitest";
import { EditorSelection, EditorState } from "@codemirror/state";
import { linkOverSelection } from "../src/features/richPaste";

function paste(doc: string, ranges: Array<[number, number]>, text: string) {
  const state = EditorState.create({
    doc,
    selection: EditorSelection.create(ranges.map(([a, b]) => EditorSelection.range(a, b))),
    extensions: EditorState.allowMultipleSelections.of(true),
  });
  const spec = linkOverSelection(state, text);
  if (!spec) return null;
  const next = state.update(spec).state;
  return { doc: next.doc.toString(), head: next.selection.main.head };
}

describe("paste a URL over selected text", () => {
  it("wraps the selection in a link and puts the cursor after it", () => {
    expect(paste("Read our docs today", [[5, 13]], " https://example.com/docs \n")).toEqual({
      doc: "Read [our docs](https://example.com/docs) today",
      head: 41,
    });
    expect(paste("mail me", [[0, 4]], "mailto:a@b.c")?.doc).toBe("[mail](mailto:a@b.c) me");
  });

  it("links every selection and wraps URLs with parentheses in <>", () => {
    expect(paste("one two", [[0, 3], [4, 7]], "https://x.y/a_(b)")?.doc).toBe("[one](<https://x.y/a_(b)>) [two](<https://x.y/a_(b)>)");
  });

  it("leaves normal pastes alone", () => {
    expect(paste("text", [[0, 0]], "https://example.com")).toBeNull(); // nothing selected
    expect(paste("text", [[0, 4]], "not a url")).toBeNull();
    expect(paste("text", [[0, 4]], "https://a.b and more")).toBeNull();
    expect(paste("a\nb", [[0, 3]], "https://a.b")).toBeNull(); // multi-line
    expect(paste("https://old.example", [[0, 19]], "https://new.example")).toBeNull(); // replacing a URL
    expect(paste("text", [[0, 4]], "javascript:alert(1)")).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { EditorSelection, EditorState } from "@codemirror/state";
import { applyCommand } from "../src/features/formatting";
import { moveSectionDown, moveSectionUp } from "../src/features/sections";

function move(doc: string, cursorAt: string, command: typeof moveSectionUp) {
  const state = EditorState.create({ doc, selection: EditorSelection.cursor(doc.indexOf(cursorAt)) });
  const next = applyCommand(state, command);
  const head = next.selection.main.head;
  return { doc: next.doc.toString(), at: next.doc.sliceString(head, head + cursorAt.length) };
}

const doc = "# Title\n\nIntro\n\n## A\n\nText A\n\n### A.1\n\nDeep\n\n## B\n\nText B\n\n## C\n\nText C";

describe("move section", () => {
  it("moves a section with its subsections below the next sibling", () => {
    const r = move(doc, "Text A", moveSectionDown);
    expect(r.doc).toBe("# Title\n\nIntro\n\n## B\n\nText B\n\n## A\n\nText A\n\n### A.1\n\nDeep\n\n## C\n\nText C");
    expect(r.at).toBe("Text A");
  });

  it("moves the last section up, keeping blank lines between sections", () => {
    const r = move(doc, "Text C", moveSectionUp);
    expect(r.doc).toBe("# Title\n\nIntro\n\n## A\n\nText A\n\n### A.1\n\nDeep\n\n## C\n\nText C\n\n## B\n\nText B");
    expect(r.at).toBe("Text C");
  });

  it("stays within the parent and ignores # lines in code blocks", () => {
    const state = (d: string, at: string) => EditorState.create({ doc: d, selection: EditorSelection.cursor(d.indexOf(at)) });
    // A.1 has no sibling under A.
    expect(moveSectionUp(({ state: state(doc, "Deep"), dispatch: () => {} }))).toBe(false);
    expect(moveSectionDown(({ state: state(doc, "Deep"), dispatch: () => {} }))).toBe(false);
    // Nothing before the first heading.
    expect(moveSectionUp(({ state: state("plain\n# H", "plain"), dispatch: () => {} }))).toBe(false);
    const code = "## One\n\n```sh\n# not a heading\n```\n\n## Two\n\nx\n";
    expect(move(code, "x", moveSectionUp).doc).toBe("## Two\n\nx\n\n## One\n\n```sh\n# not a heading\n```\n");
  });
});

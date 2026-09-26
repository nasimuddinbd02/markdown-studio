import { describe, expect, it } from "vitest";
import { EditorSelection, EditorState } from "@codemirror/state";
import { applyCommand } from "../src/features/formatting";
import { moveSectionDown, moveSectionTo, moveSectionUp } from "../src/features/sections";

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

describe("move section to (outline drag)", () => {
  const doc = "# Title\n\n## A\n\na\n\n### A.1\n\ndeep\n\n## B\n\nb\n\n## C\n\nc\n";
  // Lines: 1 # Title, 3 ## A, 7 ### A.1, 11 ## B, 15 ## C

  it("moves a section, with its subsections, before another heading", () => {
    expect(moveSectionTo(doc, 3, 15)).toBe("# Title\n\n## B\n\nb\n\n## A\n\na\n\n### A.1\n\ndeep\n\n## C\n\nc\n");
    expect(moveSectionTo(doc, 15, 3)).toBe("# Title\n\n## C\n\nc\n\n## A\n\na\n\n### A.1\n\ndeep\n\n## B\n\nb\n");
  });

  it("moves a section to the end of the document", () => {
    expect(moveSectionTo(doc, 3, null)).toBe("# Title\n\n## B\n\nb\n\n## C\n\nc\n\n## A\n\na\n\n### A.1\n\ndeep\n");
  });

  it("can move a subsection out of its parent", () => {
    expect(moveSectionTo(doc, 7, 15)).toBe("# Title\n\n## A\n\na\n\n## B\n\nb\n\n### A.1\n\ndeep\n\n## C\n\nc\n");
  });

  it("does nothing when dropped on itself, inside itself, or right after itself", () => {
    expect(moveSectionTo(doc, 3, 3)).toBeNull();
    expect(moveSectionTo(doc, 3, 7)).toBeNull(); // its own subsection
    expect(moveSectionTo(doc, 3, 11)).toBeNull(); // already right before ## B
    expect(moveSectionTo(doc, 15, null)).toBeNull(); // already last
    expect(moveSectionTo(doc, 5, 15)).toBeNull(); // not a heading
  });
});

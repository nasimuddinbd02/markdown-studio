import { describe, expect, it } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { currentHeadingIndex, extractHeadings, plainHeadingText } from "../src/features/outline";
import { Outline } from "../src/components/Outline";
import { newDocument } from "../src/features/documents";
import { useUi } from "../src/stores/uiStore";
import { setupBackend } from "./helpers";

const DOC = [
  "---",
  "title: Front matter # not a heading",
  "---",
  "# Title",
  "",
  "Intro",
  "",
  "## Install **now**",
  "",
  "```bash",
  "# not a heading",
  "```",
  "",
  "Setext H1",
  "=========",
  "",
  "Setext H2",
  "---------",
  "",
  "### [Linked](https://x.y) `code` ###",
  "#no-space is not a heading",
].join("\n");

describe("extractHeadings", () => {
  it("finds ATX and setext headings, skipping code and front matter", () => {
    expect(extractHeadings(DOC)).toEqual([
      { level: 1, text: "Title", line: 4 },
      { level: 2, text: "Install now", line: 8 },
      { level: 1, text: "Setext H1", line: 14 },
      { level: 2, text: "Setext H2", line: 17 },
      { level: 3, text: "Linked code", line: 20 },
    ]);
  });

  it("strips inline markup", () => {
    expect(plainHeadingText("**Bold** and _em_ ![img](a.png) <b>x</b>")).toBe("Bold and em img x");
  });

  it("finds the section containing a line", () => {
    const h = extractHeadings(DOC);
    expect(currentHeadingIndex(h, 1)).toBe(-1);
    expect(currentHeadingIndex(h, 6)).toBe(0);
    expect(currentHeadingIndex(h, 12)).toBe(1);
    expect(currentHeadingIndex(h, 99)).toBe(4);
  });
});

describe("Outline panel", () => {
  it("lists headings and marks the current section", () => {
    setupBackend();
    render(<Outline />);
    expect(screen.getByText("No document is open.")).toBeInTheDocument();
    act(() => {
      newDocument("# One\n\ntext\n\n## Two\n\nmore");
      useUi.getState().setCursor({ line: 6, col: 1, selected: 0 });
    });
    const items = screen.getAllByRole("button", { name: /One|Two/ });
    expect(items.map((b) => b.textContent)).toEqual(["H1One", "H2Two"]);
    expect(screen.getByRole("button", { name: /Two/ })).toHaveAttribute("aria-current", "location");
  });
});

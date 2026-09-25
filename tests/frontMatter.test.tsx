import { describe, expect, it } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { frontMatterTitle, parseFrontMatterEntries, splitFrontMatter, stripFrontMatter } from "../src/services/frontMatter";
import { documentTitle, renderHtml } from "../src/services/exportHtml";
import { Preview } from "../src/components/Preview";
import { newDocument } from "../src/features/documents";
import { useSettings, DEFAULT_SETTINGS } from "../src/stores/settingsStore";
import { setupBackend } from "./helpers";

const DOC = `---
title: "Quarterly Report"
author: Ann  # owner
tags: [finance, q3]
reviewers:
  - Bob
  - 'Cy'
build:
  draft: true
summary: >
  Short
  summary.
---

# Heading

Body text.
`;

describe("front matter", () => {
  it("parses simple YAML for display", () => {
    expect(splitFrontMatter(DOC)?.entries).toEqual([
      ["title", "Quarterly Report"],
      ["author", "Ann"],
      ["tags", "finance, q3"],
      ["reviewers", "Bob, Cy"],
      ["build", "draft: true"],
      ["summary", "Short summary."],
    ]);
    expect(parseFrontMatterEntries("")).toEqual([]);
  });

  it("keeps line numbers in the body and only matches a block at the very start", () => {
    const fm = splitFrontMatter(DOC)!;
    expect(fm.body.split("\n").length).toBe(DOC.split("\n").length);
    expect(fm.body.split("\n")[14]).toBe("# Heading");
    expect(splitFrontMatter("# Title\n---\na: b\n---\n")).toBeNull();
    expect(splitFrontMatter("---\ntitle: a---\nmore\n")).toBeNull();
    expect(splitFrontMatter("---\r\na: 1\r\n---\r\nx")?.entries).toEqual([["a", "1"]]);
    expect(splitFrontMatter("---\n---\nText")?.entries).toEqual([]);
  });

  it("is left out of exports, and its title names the document", async () => {
    expect(stripFrontMatter(DOC).startsWith("# Heading")).toBe(true);
    expect(frontMatterTitle(DOC)).toBe("Quarterly Report");
    expect(documentTitle(DOC, "x.md")).toBe("Quarterly Report");
    expect(documentTitle("---\na: 1\n---\n# Real\n", "x.md")).toBe("Real");
    const html = await renderHtml(DOC);
    expect(html).not.toContain("finance");
    expect(html).not.toContain("<hr");
    expect(html).toContain("<h1");
  });

  it("is shown as a metadata table in the preview", () => {
    setupBackend();
    useSettings.setState({ settings: { ...DEFAULT_SETTINGS, previewDebounceMs: 0 } });
    render(<Preview />);
    act(() => {
      newDocument(DOC);
    });
    const table = screen.getByRole("table", { name: "Document metadata" });
    expect(table).toHaveTextContent("titleQuarterly Report");
    expect(table).toHaveTextContent("tagsfinance, q3");
    expect(screen.getByRole("heading", { level: 1, name: "Heading" })).toBeInTheDocument();
    expect(document.querySelector(".markdown-body hr, .preview hr")).toBeNull();
  });
});

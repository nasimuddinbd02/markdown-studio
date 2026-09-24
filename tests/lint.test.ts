import { describe, expect, it } from "vitest";
import { findLinks, lintLinks, lintMarkdown, maskCode } from "../src/features/lint";

const rules = (text: string) => lintMarkdown(text).map((p) => p.rule);

describe("markdown lint: document rules", () => {
  it("flags duplicate headings, multiple H1s and skipped levels", () => {
    const text = "# A\n\n### Skipped\n\n## B\n\n## B\n\n# Second\n";
    expect(rules(text)).toEqual(["heading-increment", "duplicate-heading", "multiple-h1"]);
  });

  it("checks in-document anchors using GitHub slugs", () => {
    const text = "# Getting Started!\n\n## Install\n\n## Install\n\n[ok](#getting-started) [dup](#install-1) [bad](#nope) <a id=\"custom\"></a> [c](#custom)";
    const problems = lintMarkdown(text).filter((p) => p.rule === "broken-anchor");
    expect(problems).toHaveLength(1);
    expect(problems[0].message).toContain("#nope");
    expect(text.slice(problems[0].from, problems[0].to)).toBe("[bad](#nope)");
  });

  it("flags empty links and images without alt text", () => {
    expect(rules("[x]() ![](a.png) ![ok](b.png)")).toEqual(["empty-link", "image-alt"]);
  });

  it("ignores links inside code", () => {
    const text = "`[x](#missing)`\n\n```\n[y](#missing)\n# not a heading\n```\n";
    expect(lintMarkdown(text)).toEqual([]);
    expect(maskCode("a `b` c")).toBe("a     c");
  });

  it("parses link titles and angle-bracket destinations", () => {
    const links = findLinks('[a](<my file.md> "title") ![i](img.png \'t\')');
    expect(links.map((l) => [l.target, l.image])).toEqual([["my file.md", false], ["img.png", true]]);
  });
});

describe("markdown lint: files", () => {
  it("reports missing local files and images, skipping unknown locations and URLs", async () => {
    const present = new Set(["/ws/docs/guide.md", "/ws/img/a.png"]);
    const exists = async (p: string) => (p.startsWith("/other") ? null : present.has(p));
    const text = [
      "[guide](guide.md)",
      "[missing](nope.md)",
      "![a](../img/a.png)",
      "![b](../img/b.png)",
      "[web](https://example.com)",
      "[outside](/other/x.md)",
      "[anchor](#x)",
    ].join("\n");
    const problems = await lintLinks(text, "/ws/docs/page.md", exists);
    expect(problems.map((p) => [p.rule, p.message])).toEqual([
      ["broken-link", "Linked file not found: nope.md"],
      ["missing-image", "Image not found: ../img/b.png"],
    ]);
  });

  it("does nothing for unsaved documents", async () => {
    expect(await lintLinks("[a](b.md)", null, async () => false)).toEqual([]);
  });
});

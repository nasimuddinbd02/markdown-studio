import { describe, expect, it } from "vitest";
import { combineDocuments, combineInputs, combineOrder, combineWorkspace, demoteHeadings, titleFromFileName } from "../src/features/combine";
import { documentAnchors } from "../src/features/linkCheck";
import { findLinks } from "../src/features/lint";
import { activeDoc, useDocuments } from "../src/stores/documentsStore";
import { useUi } from "../src/stores/uiStore";
import { useWorkspace } from "../src/stores/workspaceStore";
import { autoAnswer, setupBackend } from "./helpers";

describe("combine documents", () => {
  it("orders files depth-first with README first and natural numbering", () => {
    const files = ["/ws/b.md", "/ws/10-end.md", "/ws/2-mid.md", "/ws/guide/z.md", "/ws/guide/README.md", "/ws/README.md", "/ws/api/x.md"];
    expect(combineOrder(files, "/ws")).toEqual([
      "/ws/README.md", "/ws/2-mid.md", "/ws/10-end.md", "/ws/b.md", "/ws/api/x.md", "/ws/guide/README.md", "/ws/guide/z.md",
    ]);
  });

  it("derives titles from file names and skips the previous combined file", () => {
    expect(titleFromFileName("/ws/02-getting_started.md")).toBe("Getting started");
    expect(combineInputs(["/ws/a.md", "/ws/ws (combined).md", "/ws/img.png", "/ws/b.md"], "/ws")).toEqual(["/ws/a.md", "/ws/b.md"]);
  });

  it("demotes headings so the combined title is the only H1", () => {
    expect(demoteHeadings("# A\n\nTitle\n===\n\n###### Deep\n\n```\n# not a heading\n```")).toBe(
      "## A\n\n## Title\n\n###### Deep\n\n```\n# not a heading\n```",
    );
  });

  it("turns cross-file links into anchors, keeps ids unique and re-bases relative paths", () => {
    const out = combineDocuments(
      [
        { path: "/ws/README.md", content: "---\ntitle: x\n---\n# Intro\n\nSee [setup](guide/setup.md), [its usage](guide/setup.md#usage) and [here](#usage).\n\n## Usage\n\nText." },
        { path: "/ws/guide/setup.md", content: "Install first.\n\n## Usage\n\n![shot](../img/a%20b.png) [spec](spec.pdf) [back](../README.md#intro) [web](https://example.com/x.md)\n\n[ref]: ./spec.pdf" },
      ],
      { outDir: "/ws", title: "Docs", toc: true },
    );
    // Headings: file without a heading gets one from its name; all shifted one level down.
    expect(out).toMatch(/^# Docs\n\n<!-- toc -->/);
    expect(out).toContain("## Intro");
    expect(out).toContain("## Setup\n\nInstall first.");
    expect(out).not.toContain("title: x");

    const anchors = documentAnchors(out);
    const targets = findLinks(out).map((l) => l.target);
    expect(targets).toEqual(expect.arrayContaining(["#setup", "#usage-1", "#usage", "img/a%20b.png", "guide/spec.pdf", "#intro", "https://example.com/x.md"]));
    for (const t of targets.filter((t) => t.startsWith("#"))) expect(anchors.has(t.slice(1))).toBe(true);
    // "[its usage]" points at setup's Usage (the second one in the combined document).
    expect(out).toContain("[its usage](#usage-1)");
    expect(out).toContain("[here](#usage)");
    expect(out).toContain("[ref]: guide/spec.pdf");
  });

  it("combines the open folder into a file and opens it", async () => {
    const backend = setupBackend({
      "/ws/README.md": "# Home\n\nStart with [the guide](guide.md).",
      "/ws/guide.md": "# Guide\n\nSteps.",
    });
    useWorkspace.getState().setRoot("/ws");
    const answered = autoAnswer("combine");
    const dest = await combineWorkspace();
    answered.stop();
    expect(answered.titles).toEqual(["Combine folder into one document"]);
    expect(dest).toBe("/ws/ws (combined).md");
    const text = (await backend.readTextFile(dest!)).content;
    expect(text).toContain("[the guide](#guide)");
    expect(text.indexOf("## Home")).toBeLessThan(text.indexOf("## Guide"));
    expect(activeDoc()?.path).toBe(dest);
    expect(useUi.getState().toasts.at(-1)).toMatchObject({ kind: "success", message: "Combined 2 files into “ws (combined).md”." });

    // Running again replaces the open combined file with fresh content.
    await backend.writeTextFile({ path: "/ws/guide.md", content: "# Guide\n\nNew steps.", lineEnding: "lf", bom: false, expectedMtime: null, force: true });
    const again = autoAnswer("combine");
    await combineWorkspace();
    again.stop();
    expect(activeDoc()?.content).toContain("New steps.");
    expect(useDocuments.getState().docs.filter((d) => d.path === dest)).toHaveLength(1);
  });

  it("needs at least two Markdown files", async () => {
    setupBackend({ "/ws/only.md": "# One" });
    useWorkspace.getState().setRoot("/ws");
    expect(await combineWorkspace()).toBeNull();
    expect(useUi.getState().toasts.at(-1)?.message).toBe("This folder has only one Markdown file.");
  });
});

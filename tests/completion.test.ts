import { describe, expect, it } from "vitest";
import { EditorState } from "@codemirror/state";
import { CompletionContext } from "@codemirror/autocomplete";
import { fileCompletions, headingCompletions, invalidateWorkspaceFiles, linkCompletionSource } from "../src/features/completion";
import { relativePath } from "../src/services/paths";
import { openPath } from "../src/features/documents";
import { setWorkspace } from "../src/features/workspace";
import { setupBackend } from "./helpers";

describe("relativePath", () => {
  it("builds forward-slash relative paths", () => {
    expect(relativePath("/ws/docs", "/ws/docs/a.md")).toBe("a.md");
    expect(relativePath("/ws/docs", "/ws/img/x.png")).toBe("../img/x.png");
    expect(relativePath("C:\\ws\\docs", "c:\\ws\\README.md")).toBe("../README.md");
    expect(relativePath("C:\\ws", "D:\\other\\a.md")).toBeNull();
  });
});

describe("completion options", () => {
  it("offers GitHub-style anchors for headings", () => {
    expect(headingCompletions("# Hello World\n## Hello World\n").map((c) => c.label)).toEqual(["#hello-world", "#hello-world-1"]);
  });

  it("offers documents for links and images for image links", () => {
    const files = ["/ws/docs/page.md", "/ws/docs/other doc.md", "/ws/README.md", "/ws/img/logo.png"];
    expect(fileCompletions(files, "/ws/docs/page.md", false).map((c) => c.label)).toEqual(["other%20doc.md", "../README.md"]);
    expect(fileCompletions(files, "/ws/docs/page.md", true).map((c) => c.label)).toEqual(["../img/logo.png"]);
  });
});

async function complete(doc: string, explicit = false) {
  const state = EditorState.create({ doc });
  const result = await linkCompletionSource(new CompletionContext(state, doc.length, explicit));
  return result && { from: result.from, labels: result.options.map((o) => o.label) };
}

describe("link completion source", () => {
  it("completes files after ]( and headings after ](#", async () => {
    invalidateWorkspaceFiles();
    setupBackend({ "/ws/a.md": "# Top\n", "/ws/b.md": "", "/ws/pics/p.png": "x" });
    await setWorkspace("/ws");
    await openPath("/ws/a.md");

    expect(await complete("see [b](")).toEqual({ from: 8, labels: ["b.md"] });
    expect(await complete("![p](")).toEqual({ from: 5, labels: ["pics/p.png"] });
    expect(await complete("# Top\n[t](#")).toEqual({ from: 10, labels: ["#top"] });
    expect(await complete("plain text")).toBeNull();
  });
});

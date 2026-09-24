import { afterEach, describe, expect, it } from "vitest";
import { act, render, screen } from "@testing-library/react";
import {
  applySaveTransforms, defaultLineEnding, ensureFinalNewline, minimalChange, trimTrailingWhitespace,
} from "../src/features/saveTransforms";
import { newDocument, openPath, saveDocument } from "../src/features/documents";
import { useDocuments } from "../src/stores/documentsStore";
import { DEFAULT_SETTINGS, useSettings } from "../src/stores/settingsStore";
import { Preview, LARGE_DOCUMENT_CHARS } from "../src/components/Preview";
import { docs, setupBackend } from "./helpers";

afterEach(() => useSettings.setState({ settings: DEFAULT_SETTINGS }));

describe("trim trailing whitespace", () => {
  it("removes trailing spaces and tabs but keeps two-space hard breaks", () => {
    expect(trimTrailingWhitespace("a  \nb   \nc\t\nd \n   \n")).toBe("a  \nb  \nc\nd\n\n");
  });

  it("leaves fenced code blocks untouched", () => {
    const md = "text \n```\ncode   \n```  \nafter \n";
    expect(trimTrailingWhitespace(md)).toBe("text\n```\ncode   \n```\nafter\n");
  });
});

describe("final newline and defaults", () => {
  it("adds exactly one final newline", () => {
    expect(ensureFinalNewline("a")).toBe("a\n");
    expect(ensureFinalNewline("a\n")).toBe("a\n");
    expect(ensureFinalNewline("")).toBe("");
  });

  it("applies only enabled transforms", () => {
    expect(applySaveTransforms("a  b \n", { trimTrailingWhitespace: false, insertFinalNewline: false })).toBe("a  b \n");
    expect(applySaveTransforms("x ", { trimTrailingWhitespace: true, insertFinalNewline: true })).toBe("x\n");
  });

  it("resolves the default line ending", () => {
    expect(defaultLineEnding("crlf")).toBe("crlf");
    expect(defaultLineEnding("lf")).toBe("lf");
    expect(["lf", "crlf"]).toContain(defaultLineEnding("auto"));
  });
});

describe("minimalChange", () => {
  it("computes the smallest replacement", () => {
    expect(minimalChange("hello world", "hello brave world")).toEqual({ from: 6, to: 6, insert: "brave " });
    expect(minimalChange("abc", "abc")).toBeNull();
    expect(minimalChange("aXc", "aYc")).toEqual({ from: 1, to: 2, insert: "Y" });
    expect(minimalChange("abc", "")).toEqual({ from: 0, to: 3, insert: "" });
  });
});

describe("saving with transforms", () => {
  it("writes the cleaned text and updates the editor so the tab is clean", async () => {
    const backend = setupBackend({ "/ws/a.md": "a" });
    useSettings.setState((s) => ({ settings: { ...s.settings, trimTrailingWhitespace: true, insertFinalNewline: true } }));
    const id = (await openPath("/ws/a.md"))!;
    useDocuments.getState().setContent(id, "line one \t\nhard break   \nlast");
    expect(await saveDocument(id)).toBe(true);
    const expected = "line one\nhard break  \nlast\n";
    expect((await backend.readTextFile("/ws/a.md")).content).toBe(expected);
    expect(docs()[0]).toMatchObject({ content: expected, savedContent: expected });
  });

  it("uses the configured line ending for new files", () => {
    setupBackend();
    useSettings.setState((s) => ({ settings: { ...s.settings, newFileLineEnding: "crlf" } }));
    const id = newDocument();
    expect(docs().find((d) => d.id === id)?.lineEnding).toBe("crlf");
  });
});

describe("large documents", () => {
  it("pauses the live preview and renders on demand", () => {
    setupBackend();
    render(<Preview />);
    act(() => {
      newDocument("# Big\n\n" + "word ".repeat(LARGE_DOCUMENT_CHARS / 5 + 10));
    });
    expect(screen.getByRole("status")).toHaveTextContent(/Live preview is paused/);
    expect(document.querySelector(".markdown-body h1")).toBeNull();
    act(() => screen.getByRole("button", { name: "Render Now" }).click());
    expect(document.querySelector(".markdown-body h1")?.textContent).toBe("Big");
  });
});

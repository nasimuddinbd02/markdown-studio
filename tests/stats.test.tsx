import { describe, expect, it } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { textStats } from "../src/services/textStats";
import { StatusBar } from "../src/components/StatusBar";
import { newDocument } from "../src/features/documents";
import { setupBackend } from "./helpers";

describe("text statistics", () => {
  it("counts words, characters, lines, paragraphs and reading time", () => {
    const s = textStats("Hello world.\nSecond line 🚀\n\nNew paragraph here");
    expect(s).toEqual({
      words: 7,
      characters: 46,
      charactersNoSpaces: 38,
      lines: 4,
      paragraphs: 2,
      readingMinutes: 1,
    });
    expect(textStats("")).toMatchObject({ words: 0, lines: 0, paragraphs: 0, readingMinutes: 0 });
    expect(textStats("word ".repeat(1150)).readingMinutes).toBe(5);
  });
});

describe("status bar statistics", () => {
  it("opens a document statistics popover from the word count", async () => {
    setupBackend();
    render(<StatusBar />);
    act(() => {
      newDocument("one two three");
    });
    await userEvent.click(screen.getByRole("button", { name: "3 words" }));
    const dialog = screen.getByRole("dialog", { name: "Document statistics" });
    expect(dialog).toHaveTextContent("Characters13");
    expect(dialog).toHaveTextContent("Reading time1 min");
  });
});

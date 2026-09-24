import { describe, expect, it } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { buildSearchRegex, searchText } from "../src/services/search";
import { SearchPanel } from "../src/components/SearchPanel";
import { setWorkspace } from "../src/features/workspace";
import { useDocuments } from "../src/stores/documentsStore";
import { docs, setupBackend } from "./helpers";

const opts = (query: string, o: Partial<{ caseSensitive: boolean; wholeWord: boolean; regex: boolean }> = {}) => ({
  query,
  caseSensitive: false,
  wholeWord: false,
  regex: false,
  ...o,
});

describe("search engine (mirrors the native implementation)", () => {
  const text = "Hello world\nhello World, worldwide\r\n";

  it("supports literal, case-sensitive and whole-word matching", () => {
    expect(searchText(text, buildSearchRegex(opts("world")), 100)).toHaveLength(3);
    expect(searchText(text, buildSearchRegex(opts("World", { caseSensitive: true })), 100)).toHaveLength(1);
    expect(searchText(text, buildSearchRegex(opts("world", { wholeWord: true })), 100)).toHaveLength(2);
    expect(searchText("axb a.b", buildSearchRegex(opts("a.b")), 100)).toHaveLength(1);
  });

  it("supports regular expressions and reports invalid ones", () => {
    expect(searchText("a 123 b 45 c 678", buildSearchRegex(opts("\\d{3}", { regex: true })), 100)).toHaveLength(2);
    expect(() => buildSearchRegex(opts("(", { regex: true }))).toThrow(/Invalid regular expression/);
    expect(() => buildSearchRegex(opts(""))).toThrow();
  });

  it("reports positions and a preview with the match offset", () => {
    const [m] = searchText("🚀é needle here", buildSearchRegex(opts("needle")), 10);
    expect(m).toMatchObject({ line: 1, column: 4, length: 6 });
    expect(m.preview.slice(m.previewStart, m.previewStart + m.length)).toBe("needle");
  });

  it("limits results", () => {
    expect(searchText("a a a a", buildSearchRegex(opts("a")), 2)).toHaveLength(2);
  });
});

describe("workspace search", () => {
  it("searches Markdown files under the root only", async () => {
    const backend = setupBackend({
      "/ws/a.md": "needle\nneedle",
      "/ws/docs/b.md": "a needle",
      "/ws/.hidden/c.md": "needle",
      "/ws/notes.txt": "needle",
      "/other/d.md": "needle",
    });
    const r = await backend.searchWorkspace("/ws", opts("needle"));
    expect(r.files.map((f) => f.path)).toEqual(["/ws/a.md", "/ws/docs/b.md"]);
    expect(r.totalMatches).toBe(3);
    await expect(backend.searchWorkspace("/other", opts("needle"))).rejects.toMatchObject({ kind: "outOfScope" });
  });

  it("shows grouped results and opens a match", async () => {
    setupBackend({ "/ws/guide.md": "# Guide\n\nInstall the tool.\n", "/ws/readme.md": "Nothing here" });
    await setWorkspace("/ws");
    render(<SearchPanel />);
    await userEvent.type(screen.getByRole("textbox", { name: "Search in files" }), "install");
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("1 result in 1 file"));
    expect(screen.getByText("guide.md")).toBeInTheDocument();
    const match = screen.getByRole("button", { name: /Install the tool/ });
    expect(match.querySelector("mark")?.textContent).toBe("Install");
    await act(async () => match.click());
    await waitFor(() => expect(docs().map((d) => d.name)).toEqual(["guide.md"]));
    expect(useDocuments.getState().activeId).toBe(docs()[0].id);
  });

  it("shows regex errors inline", async () => {
    setupBackend({ "/ws/a.md": "x" });
    await setWorkspace("/ws");
    render(<SearchPanel />);
    await userEvent.click(screen.getByRole("button", { name: "Use regular expression" }));
    await userEvent.type(screen.getByRole("textbox", { name: "Search in files" }), "(");
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(/Invalid regular expression/));
  });
});

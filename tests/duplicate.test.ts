import { describe, expect, it } from "vitest";
import { copyName, duplicateFile } from "../src/features/workspace";
import { useWorkspace } from "../src/stores/workspaceStore";
import { activeDoc } from "../src/stores/documentsStore";
import { setupBackend } from "./helpers";

describe("duplicate a file", () => {
  it("names copies like a file manager", () => {
    expect(copyName("notes.md", 1)).toBe("notes copy.md");
    expect(copyName("notes.md", 3)).toBe("notes copy 3.md");
    expect(copyName("README", 1)).toBe("README copy");
    expect(copyName("v1.2.md", 2)).toBe("v1.2 copy 2.md");
  });

  it("copies the saved file under the first free name and opens it, never overwriting", async () => {
    const backend = setupBackend({ "/ws/notes.md": "# Notes\r\n\r\nText\r\n", "/ws/notes copy.md": "an older copy" });
    useWorkspace.getState().setRoot("/ws");
    const copy = await duplicateFile("/ws/notes.md");
    expect(copy).toBe("/ws/notes copy 2.md");
    expect((await backend.readTextFile("/ws/notes copy.md")).content).toBe("an older copy");
    const file = await backend.readTextFile(copy!);
    expect(file.content).toBe((await backend.readTextFile("/ws/notes.md")).content);
    expect(file.lineEnding).toBe((await backend.readTextFile("/ws/notes.md")).lineEnding);
    expect(activeDoc()?.path).toBe(copy);
  });
});

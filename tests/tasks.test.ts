import { describe, expect, it } from "vitest";
import { taskItemLines, toggleTaskChange } from "../src/features/tasks";

function toggle(markdown: string, index: number) {
  const c = toggleTaskChange(markdown, index);
  return c ? markdown.slice(0, c.from) + c.insert + markdown.slice(c.to) : null;
}

describe("task list toggling from the preview", () => {
  it("finds task items in document order, skipping plain items and code", () => {
    const md = "- [ ] one\n- plain\n\n```\n- [ ] not a task\n```\n\n1. [x] two\n   - [ ] nested";
    expect(taskItemLines(md)).toEqual([1, 8, 9]);
  });

  it("checks and unchecks the n-th task", () => {
    const md = "- [ ] one\n* [x] two\n  - [X] three";
    expect(toggle(md, 0)).toBe("- [x] one\n* [x] two\n  - [X] three");
    expect(toggle(md, 1)).toBe("- [ ] one\n* [ ] two\n  - [X] three");
    expect(toggle(md, 2)).toBe("- [ ] one\n* [x] two\n  - [ ] three");
    expect(toggle(md, 3)).toBeNull();
  });

  it("works in quotes, with front matter and CRLF line endings", () => {
    expect(toggle("> - [ ] quoted", 0)).toBe("> - [x] quoted");
    expect(toggle("---\ntitle: T\n---\n\n- [ ] after", 0)).toBe("---\ntitle: T\n---\n\n- [x] after");
    expect(toggle("# T\r\n\r\n- [ ] a\r\n- [ ] b\r\n", 1)).toBe("# T\r\n\r\n- [ ] a\r\n- [x] b\r\n");
  });
});

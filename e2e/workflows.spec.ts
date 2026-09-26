import { expect, test, type Page } from "@playwright/test";

const mod = process.platform === "darwin" ? "Meta" : "Control";
/** Document tabs (the sidebar also has Explorer/Search tabs). */
const docTabs = (page: Page) => page.getByRole("tablist", { name: "Open documents" }).getByRole("tab");

/** Fresh demo workspace: clear stored state and answer demo "dialogs" with their defaults. */
async function start(page: Page) {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem("e2e-started")) {
      localStorage.clear();
      sessionStorage.setItem("e2e-started", "1");
    }
    window.prompt = (_message?: string, defaultValue?: string) => defaultValue ?? null;
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Markdown Studio" })).toBeVisible();
}

async function openDemoFolder(page: Page) {
  await page.getByRole("button", { name: "Open Folder" }).first().click();
  await expect(page.getByRole("treeitem", { name: /README\.md/ })).toBeVisible();
}

async function openFile(page: Page, name: string) {
  await page.locator(".tree-row", { hasText: new RegExp(`^${name.replace(".", "\\.")}$`) }).click();
  await expect(page.getByRole("tab", { name: new RegExp(name.replace(".", "\\.")) })).toHaveAttribute("aria-selected", "true");
}

test("create, edit, preview, save, close and reopen a document (§17.2)", async ({ page }) => {
  await start(page);
  await openDemoFolder(page);
  await page.keyboard.press(`${mod}+N`);
  const editor = page.getByRole("textbox", { name: "Markdown editor" });
  await editor.click();
  // insertText avoids the editor's list auto-continuation on Enter.
  await page.keyboard.insertText("# E2E Title\n\n- [x] task\n\n| a | b |\n| - | - |\n| 1 | 2 |\n");

  const preview = page.locator(".markdown-body");
  await expect(preview.locator("h1")).toHaveText("E2E Title");
  await expect(preview.locator("table td")).toHaveCount(2);
  await expect(preview.locator("input[type=checkbox]")).toBeChecked();
  await expect(page.getByRole("tab", { name: /Untitled-1\.md/ })).toContainText("(unsaved)");

  await page.keyboard.press(`${mod}+S`); // demo "Save As" accepts /demo/Untitled-1.md
  await expect(page.getByRole("status").filter({ hasText: "Saved" })).toBeVisible();
  await expect(page.getByRole("treeitem", { name: /Untitled-1\.md/ })).toBeVisible();

  await page.keyboard.press(`${mod}+W`);
  await expect(docTabs(page)).toHaveCount(0);
  await openFile(page, "Untitled-1.md");
  await expect(page.locator(".markdown-body h1")).toHaveText("E2E Title");
});

test("unsaved changes are protected when closing a tab (Appendix A.3)", async ({ page }) => {
  await start(page);
  await openDemoFolder(page);
  await openFile(page, "README.md");
  await page.getByRole("textbox", { name: "Markdown editor" }).click();
  await page.keyboard.type("draft ");
  await page.keyboard.press(`${mod}+W`);

  const dialog = page.getByRole("dialog", { name: "Unsaved changes" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByRole("tab", { name: /README\.md/ })).toBeVisible();

  await page.keyboard.press(`${mod}+W`);
  await page.getByRole("dialog").getByRole("button", { name: "Don't Save" }).click();
  await expect(docTabs(page)).toHaveCount(0);
});

test("unsafe HTML never executes in the preview (SEC-004)", async ({ page }) => {
  const dialogs: string[] = [];
  page.on("dialog", (d) => {
    if (d.type() === "alert") dialogs.push(d.message());
    void d.dismiss().catch(() => {});
  });
  await start(page);
  await openDemoFolder(page);
  await page.locator(".tree-row", { hasText: /^docs$/ }).click();
  await openFile(page, "security-test.md");
  const preview = page.locator(".markdown-body");
  await expect(preview.locator("h1")).toHaveText("Unsafe content test");
  await expect(preview.locator("script, iframe")).toHaveCount(0);
  await expect(preview.locator("[onerror]")).toHaveCount(0);
  await preview.getByText("javascript link").click();
  await page.waitForTimeout(300);
  expect(dialogs).toEqual([]);
});

test("find in files opens the matching document at the match", async ({ page }) => {
  await start(page);
  await openDemoFolder(page);
  await page.keyboard.press(`${mod}+Shift+F`);
  const box = page.getByRole("textbox", { name: "Search in files" });
  await expect(box).toBeFocused();
  await box.fill("shortcuts");
  await expect(page.locator(".search-summary")).toContainText("result");
  await page.locator(".search-match").first().click();
  await expect(page.getByRole("tab", { name: /guide\.md/ })).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(".status-right")).toContainText("selected");
});

test("command palette runs commands", async ({ page }) => {
  await start(page);
  await openDemoFolder(page);
  await openFile(page, "README.md");
  await page.keyboard.press(`${mod}+Shift+P`);
  await page.keyboard.type("preview only");
  await page.keyboard.press("Enter");
  await expect(page.locator(".cm-editor")).toHaveCount(0);
  await expect(page.locator(".markdown-body h1")).toBeVisible();
});

test("formatting shortcuts and table formatting", async ({ page }) => {
  await start(page);
  await page.keyboard.press(`${mod}+N`);
  await page.getByRole("textbox", { name: "Markdown editor" }).click();
  await page.keyboard.type("word");
  await page.keyboard.press("Shift+Home");
  await page.keyboard.press(`${mod}+B`);
  await expect(page.locator(".markdown-body strong")).toHaveText("word");

  await page.keyboard.press("End");
  await page.keyboard.insertText("\n\n|a|bb|\n|-|-|\n|ccc|d|");
  // Lowercase key, as a physical keyboard reports it (Ctrl+Alt doubles as AltGr on Windows).
  await page.keyboard.press(`${mod}+Alt+t`);
  await expect(page.locator(".cm-line").filter({ hasText: "| ccc | d   |" })).toHaveCount(1);

  await page.keyboard.insertText("\n\n### Section");
  await page.keyboard.press(`${mod}+Alt+=`);
  await expect(page.locator(".markdown-body h2")).toHaveText("Section");
  await page.keyboard.press(`${mod}+Alt+-`);
  await page.keyboard.press(`${mod}+Alt+-`);
  await expect(page.locator(".markdown-body h4")).toHaveText("Section");

  // Task checkboxes in the preview toggle the task in the source.
  await page.keyboard.insertText("\n\n- [ ] first\n- [ ] second");
  await page.getByRole("checkbox", { name: "Open task" }).nth(1).click();
  await expect(page.locator(".cm-line").filter({ hasText: "- [x] second" })).toHaveCount(1);
  await expect(page.getByRole("checkbox", { name: "Completed task" })).toBeChecked();
  await expect(page.locator(".cm-line").filter({ hasText: "- [ ] first" })).toHaveCount(1);

  // Ctrl/Cmd+Enter checks the task on the cursor line.
  await page.locator(".cm-line").filter({ hasText: "- [ ] first" }).click();
  await page.keyboard.press(`${mod}+Enter`);
  await expect(page.getByRole("checkbox", { name: "Completed task" })).toHaveCount(2);

  // Insert Footnote adds the reference and a definition to type into.
  await page.keyboard.press(`${mod}+End`);
  await page.keyboard.press(`${mod}+Alt+r`);
  await page.keyboard.type("The source.");
  await expect(page.locator(".markdown-body sup a")).toHaveText("1");
  await expect(page.locator(".markdown-body section li").filter({ hasText: "The source." })).toHaveCount(1);
});

test("combine the folder into one document", async ({ page }) => {
  await start(page);
  await openDemoFolder(page);
  await page.keyboard.press(`${mod}+Shift+P`);
  await page.keyboard.type("combine folder");
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Combine" }).click();
  await expect(page.getByRole("tab", { name: /demo \(combined\)\.md/ })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("treeitem", { name: /demo \(combined\)\.md/ })).toBeVisible();
  const preview = page.locator(".markdown-body");
  await expect(preview.locator("h1")).toHaveText("demo");
  await expect(preview.locator("h2", { hasText: "Welcome to Markdown Studio" })).toBeVisible();
  await expect(preview.locator("h2", { hasText: "Guide" })).toBeVisible();
});

test("export the folder as one Word document", async ({ page }) => {
  await start(page);
  await openDemoFolder(page);
  await page.keyboard.press(`${mod}+Shift+P`);
  await page.keyboard.type("export folder as one word");
  const download = page.waitForEvent("download");
  await page.keyboard.press("Enter");
  const file = await download;
  expect(file.suggestedFilename()).toBe("demo.docx");
  const bytes = await (await file.createReadStream()).toArray();
  expect(Buffer.concat(bytes).subarray(0, 2).toString()).toBe("PK"); // a .docx is a zip file
  await expect(page.getByRole("treeitem", { name: /combined/ })).toHaveCount(0);
});

test("reopen a closed tab", async ({ page }) => {
  await start(page);
  await openDemoFolder(page);
  await openFile(page, "README.md");
  await page.keyboard.press(`${mod}+W`);
  await expect(docTabs(page)).toHaveCount(0);
  await page.keyboard.press(`${mod}+Shift+P`);
  await page.keyboard.type("reopen closed tab");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("tab", { name: /README\.md/ })).toHaveAttribute("aria-selected", "true");
});

test("move a section up", async ({ page }) => {
  await start(page);
  await page.keyboard.press(`${mod}+N`);
  await page.getByRole("textbox", { name: "Markdown editor" }).click();
  await page.keyboard.insertText("## Alpha\n\none\n\n## Beta\n\ntwo");
  await page.keyboard.press(`${mod}+Shift+P`);
  await page.keyboard.type("move section up");
  await page.keyboard.press("Enter");
  await expect(page.locator(".markdown-body h2").first()).toHaveText("Beta");
  await expect(page.locator(".markdown-body h2").last()).toHaveText("Alpha");
});

test("Mermaid diagrams are exported to Word as pictures", async ({ page }) => {
  await start(page);
  await openDemoFolder(page);
  await page.locator(".tree-row", { hasText: /^docs$/ }).click();
  await openFile(page, "diagrams-and-math.md");
  await expect(page.locator(".markdown-body svg").first()).toBeVisible({ timeout: 20_000 });
  await page.keyboard.press(`${mod}+Shift+P`);
  await page.keyboard.type("export as word");
  const download = page.waitForEvent("download");
  await page.keyboard.press("Enter");
  const file = await download;
  const bytes = Buffer.concat(await (await file.createReadStream()).toArray());
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(bytes);
  const media = Object.keys(zip.files).filter((f) => /^word\/media\/.+\.png$/.test(f));
  expect(media.length).toBe(1);
  const png = await zip.file(media[0])!.async("uint8array");
  expect(png.length).toBeGreaterThan(2000); // a real drawing, not an empty canvas
  expect(await zip.file("word/document.xml")!.async("string")).not.toContain("flowchart LR");
});

test("outline context menu moves a section", async ({ page }) => {
  await start(page);
  await page.keyboard.press(`${mod}+N`);
  await page.getByRole("textbox", { name: "Markdown editor" }).click();
  await page.keyboard.insertText("## Alpha\n\none\n\n## Beta\n\ntwo\n");
  const outline = page.getByRole("region", { name: "Outline" });
  await outline.getByRole("button", { name: "Alpha" }).click({ button: "right" });
  await page.getByRole("menuitem", { name: /Move Section Down/ }).click();
  await expect(page.locator(".markdown-body h2").first()).toHaveText("Beta");
  await expect(outline.getByRole("button", { name: /Alpha|Beta/ }).first()).toHaveText(/Beta/);
});

test("fold and unfold all sections", async ({ page }) => {
  await start(page);
  await page.keyboard.press(`${mod}+N`);
  await page.getByRole("textbox", { name: "Markdown editor" }).click();
  await page.keyboard.insertText("## One\n\nfirst body\n\n## Two\n\nsecond body\n");
  await expect(page.locator(".cm-line", { hasText: "second body" })).toHaveCount(1);
  await page.keyboard.press(`${mod}+Shift+P`);
  await page.keyboard.type("fold all");
  await page.keyboard.press("Enter");
  await expect(page.locator(".cm-line", { hasText: "second body" })).toHaveCount(0);
  await expect(page.locator(".cm-foldPlaceholder")).toHaveCount(2);
  await page.keyboard.press(`${mod}+Shift+P`);
  await page.keyboard.type("unfold all");
  await page.keyboard.press("Enter");
  await expect(page.locator(".cm-line", { hasText: "second body" })).toHaveCount(1);
});

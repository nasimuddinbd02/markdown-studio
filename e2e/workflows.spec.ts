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
});

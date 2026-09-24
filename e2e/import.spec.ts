import { expect, test, type Page } from "@playwright/test";
import { fileURLToPath } from "node:url";

const fixture = (name: string) => fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url));

async function start(page: Page) {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem("import-started")) {
      localStorage.clear();
      sessionStorage.setItem("import-started", "1");
    }
    window.prompt = (_m?: string, d?: string) => d ?? null;
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Open Folder" }).first().click();
  await expect(page.getByRole("treeitem", { name: /README\.md/ })).toBeVisible();
}

test("imports a Word document as Markdown with its images", async ({ page }) => {
  await start(page);
  await page.getByRole("button", { name: "File", exact: true }).click();
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("menuitem", { name: /Import Word Document/ }).click();
  await (await chooser).setFiles(fixture("report.docx"));

  // Saved as /demo/report.md (the demo's Save As prompt accepts the default).
  await expect(page.getByRole("tab", { name: /report\.md/ })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("treeitem", { name: /report\.md/ })).toBeVisible();
  const preview = page.locator(".markdown-body");
  await expect(preview.locator("h1")).toHaveText("Imported Report");
  await expect(preview.locator("strong")).toHaveText("Word");
  await expect(preview.locator("li")).toHaveText(["Alpha", "Beta"]);
  await expect(preview.locator("table th")).toHaveText(["Name", "Score"]);
  await expect(preview.locator("table td")).toHaveText(["Ada", "99"]);
  // The embedded image was saved to assets/ and renders.
  const img = preview.locator("img");
  await expect(img).toHaveAttribute("src", /^data:image\/png;base64,/);
  await expect(page.locator(".toast")).toContainText(/Imported “report\.docx” \(1 image saved to assets\//);
});

test("pastes rich text from the clipboard as Markdown", async ({ page, context }) => {
  await start(page);
  await context.grantPermissions(["clipboard-read", "clipboard-write"]).catch(() => {});
  await page.keyboard.press(process.platform === "darwin" ? "Meta+N" : "Control+N");
  const editor = page.getByRole("textbox", { name: "Markdown editor" });
  await editor.click();
  await page.evaluate(() => {
    const dt = new DataTransfer();
    dt.setData("text/html", "<h2>From the web</h2><p>A <a href='https://example.com'>link</a> and <b>bold</b>.</p><ul><li>x</li></ul>");
    dt.setData("text/plain", "From the web A link and bold. x");
    document.querySelector(".cm-content")!.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
  });
  await expect(page.locator(".cm-content")).toContainText("## From the web");
  await expect(page.locator(".cm-content")).toContainText("[link](https://example.com)");
  await expect(page.locator(".markdown-body h2")).toHaveText("From the web");
});

import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import ReactMarkdown from "react-markdown";
import { markdownPlugins } from "../src/services/markdown";
import { renderHtml } from "../src/services/exportHtml";
import { matchAlertMarker } from "../src/services/alerts";

function renderMd(md: string) {
  const { remarkPlugins, rehypePlugins } = markdownPlugins();
  return render(<ReactMarkdown remarkPlugins={remarkPlugins} rehypePlugins={rehypePlugins}>{md}</ReactMarkdown>).container;
}

describe("GitHub alerts", () => {
  it("recognises the five kinds, case-insensitively", () => {
    expect(matchAlertMarker("[!note]\nBody")).toEqual({ kind: "note", rest: "Body" });
    expect(matchAlertMarker("[!CAUTION]")).toEqual({ kind: "caution", rest: "" });
    expect(matchAlertMarker("[!DANGER]\nx")).toBeNull();
    expect(matchAlertMarker("[!NOTE] inline text")).toBeNull();
  });

  it("renders alerts as labelled callouts and leaves normal quotes alone", () => {
    const el = renderMd("> [!WARNING]\n> Back up your **data** first.\n>\n> Second paragraph.\n\n> Just a quote.\n\n> [!TIP]\n\n> [!NOPE]\n> x");
    const alerts = el.querySelectorAll(".markdown-alert");
    expect(alerts).toHaveLength(2);
    const warning = alerts[0];
    expect(warning.className).toBe("markdown-alert markdown-alert-warning");
    expect(warning.querySelector(".markdown-alert-title")?.textContent).toBe("Warning");
    expect(warning.textContent).not.toContain("[!WARNING]");
    expect(warning.querySelectorAll("p")[1].innerHTML).toBe("Back up your <strong>data</strong> first.");
    expect(warning.querySelectorAll("p")).toHaveLength(3);
    expect(alerts[1].querySelector(".markdown-alert-title")?.textContent).toBe("Tip");
    const quotes = el.querySelectorAll("blockquote");
    expect([...quotes].map((q) => q.textContent?.trim())).toEqual(["Just a quote.", "[!NOPE]\nx"]);
  });

  it("can't be abused to inject markup, and appears in HTML exports", async () => {
    const html = await renderHtml('> [!NOTE]\n> <img src=x onerror="alert(1)"> <script>alert(1)</script> hi');
    expect(html).toContain('<div class="markdown-alert markdown-alert-note">');
    expect(html).toContain('<p class="markdown-alert-title">Note</p>');
    expect(html).not.toMatch(/onerror|<script/);
    // A raw HTML div can't pose as an alert with other classes (sanitizer strips them).
    const spoof = await renderHtml('<div class="markdown-alert evil">x</div>');
    expect(spoof).not.toContain("evil");
  });
});

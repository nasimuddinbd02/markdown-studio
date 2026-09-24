import { afterEach, describe, expect, it, vi } from "vitest";
import { compareVersions, fetchLatestRelease, RELEASES_PAGE } from "../src/services/updates";
import { checkForUpdates } from "../src/features/updates";
import { useUi } from "../src/stores/uiStore";
import { autoAnswer, setupBackend } from "./helpers";

const release = (tag: string, extra: Record<string, unknown> = {}) =>
  vi.fn(async () => new Response(JSON.stringify({ tag_name: tag, html_url: `https://github.com/o/r/releases/tag/${tag}`, body: "## New\n\n- **Faster** things", ...extra })));

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe("version comparison", () => {
  it("compares numerically, with pre-releases before releases", () => {
    expect(compareVersions("0.10.0", "0.9.9")).toBe(1);
    expect(compareVersions("v0.5.0", "0.5.0")).toBe(0);
    expect(compareVersions("0.5", "0.5.1")).toBe(-1);
    expect(compareVersions("1.0.0-beta.1", "1.0.0")).toBe(-1);
    expect(compareVersions("1.0.0-beta.2", "1.0.0-beta.1")).toBe(1);
  });
});

describe("latest release", () => {
  it("parses GitHub's response and only trusts github.com links", async () => {
    expect(await fetchLatestRelease(release("v1.2.3") as unknown as typeof fetch)).toMatchObject({ version: "1.2.3", url: "https://github.com/o/r/releases/tag/v1.2.3" });
    const evil = release("v1.2.3", { html_url: "https://evil.example/x" });
    expect((await fetchLatestRelease(evil as unknown as typeof fetch)).url).toBe(RELEASES_PAGE);
    await expect(fetchLatestRelease(vi.fn(async () => new Response("{}", { status: 403 })) as unknown as typeof fetch)).rejects.toThrow("403");
    await expect(fetchLatestRelease(release("latest") as unknown as typeof fetch)).rejects.toThrow();
  });
});

describe("check for updates", () => {
  it("offers a newer version and opens its page on Download", async () => {
    setupBackend();
    vi.stubGlobal("fetch", release("v99.0.0"));
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    const answered = autoAnswer("download");
    expect(await checkForUpdates({ manual: false })).toBe("available");
    answered.stop();
    expect(answered.titles).toEqual(["Update available"]);
    expect(open).toHaveBeenCalledWith("https://github.com/o/r/releases/tag/v99.0.0", "_blank", "noopener,noreferrer");
    open.mockRestore();
  });

  it("remembers a skipped version for automatic checks only", async () => {
    setupBackend();
    vi.stubGlobal("fetch", release("v99.0.0"));
    let answered = autoAnswer("skip");
    await checkForUpdates({ manual: false });
    answered.stop();
    answered = autoAnswer("later");
    await checkForUpdates({ manual: false });
    answered.stop();
    expect(answered.titles).toEqual([]);
    answered = autoAnswer("later");
    await checkForUpdates({ manual: true });
    answered.stop();
    expect(answered.titles).toEqual(["Update available"]);
  });

  it("reports up to date and errors only when checked manually", async () => {
    setupBackend();
    vi.stubGlobal("fetch", release("v0.0.1"));
    expect(await checkForUpdates({ manual: true })).toBe("current");
    expect(useUi.getState().toasts.at(-1)?.message).toMatch(/up to date/);
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("offline"); }));
    useUi.setState({ toasts: [] });
    expect(await checkForUpdates({ manual: false })).toBe("error");
    expect(useUi.getState().toasts).toEqual([]);
    expect(await checkForUpdates({ manual: true })).toBe("error");
    expect(useUi.getState().toasts.at(-1)?.kind).toBe("error");
  });
});

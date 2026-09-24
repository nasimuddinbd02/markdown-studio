import { backend } from "../services";
import { compareVersions, fetchLatestRelease } from "../services/updates";
import { useSettings } from "../stores/settingsStore";
import { ask, notify } from "../stores/uiStore";

const SKIP_KEY = "markdown-studio.update.skip";
const LAST_KEY = "markdown-studio.update.lastCheck";
const DAY = 24 * 60 * 60 * 1000;

function load(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function store(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage can be unavailable; the check simply runs again next time.
  }
}

/** First paragraph or so of the release notes, as plain text. */
function summarise(notes: string) {
  const text = notes
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/[#*_`>]/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\n{2,}/g, "\n")
    .trim();
  return text.length > 400 ? text.slice(0, 400).replace(/\s+\S*$/, "") + "…" : text;
}

/**
 * UPD-001/002/004: checks GitHub for a newer release and offers to open its
 * download page. The app never downloads or runs installers itself; users get
 * the installer (and its SHA-256) from the release page. `manual` reports
 * "up to date" and errors, and ignores a previously skipped version.
 */
export async function checkForUpdates({ manual }: { manual: boolean }): Promise<"available" | "current" | "error"> {
  const b = backend();
  let latest;
  let current: string;
  try {
    current = (await b.appInfo()).version;
    latest = await fetchLatestRelease();
    store(LAST_KEY, String(Date.now()));
  } catch (e) {
    b.log("warn", "update.check", (e as Error)?.message ?? String(e));
    if (manual) notify("error", "Couldn't check for updates. Check your internet connection and try again.");
    return "error";
  }

  if (compareVersions(latest.version, current) <= 0) {
    if (manual) notify("success", `You're up to date. Markdown Studio ${current} is the latest version.`);
    return "current";
  }
  if (!manual && load(SKIP_KEY) === latest.version) return "available";

  const notes = summarise(latest.notes);
  const choice = await ask({
    title: "Update available",
    message: `Markdown Studio ${latest.version} is available. You have ${current}.`,
    detail: (notes ? notes + "\n\n" : "") + "Download the installer and run it; your settings and files are kept.",
    buttons: [
      { id: "skip", label: "Skip This Version" },
      { id: "later", label: "Later" },
      { id: "download", label: "Download", variant: "primary" },
    ],
    cancelId: "later",
  });
  if (choice === "skip") store(SKIP_KEY, latest.version);
  if (choice === "download") {
    try {
      await b.openExternal(latest.url);
    } catch (e) {
      notify("error", `Couldn't open the download page: ${(e as Error).message}`);
    }
  }
  return "available";
}

/** Runs the automatic check at most once a day, in the desktop app only, when enabled in Settings. */
export function scheduleUpdateCheck() {
  if (!backend().isNative || !useSettings.getState().settings.checkForUpdates) return;
  const last = Number(load(LAST_KEY) ?? 0);
  if (Date.now() - last < DAY) return;
  // Let startup (session restore, recovery prompts) finish first.
  setTimeout(() => void checkForUpdates({ manual: false }), 5000);
}

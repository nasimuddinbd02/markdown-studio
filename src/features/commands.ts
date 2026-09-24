import { useDocuments, activeDoc } from "../stores/documentsStore";
import { useSettings } from "../stores/settingsStore";
import { useUi } from "../stores/uiStore";
import { useWorkspace } from "../stores/workspaceStore";
import { backend } from "../services";
import { notify } from "../stores/uiStore";
import type { ViewMode } from "../types";
import {
  closeDocument, newDocument, openFileDialog, saveAll, saveDocument,
} from "./documents";
import { closeWorkspace, createFileIn, openFolderDialog } from "./workspace";
import { editorCommand } from "./editorBridge";

export const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

export interface Command {
  id: string;
  label: string;
  /** Normalized shortcut, e.g. "Mod+Shift+S" (Mod = Cmd on macOS, Ctrl elsewhere). */
  shortcut?: string;
  run(): void | Promise<void>;
  enabled?(): boolean;
}

const hasActive = () => !!activeDoc();
const VIEW_ORDER: ViewMode[] = ["split", "editor", "preview"];

export const commands: Record<string, Command> = {
  newFile: { id: "newFile", label: "New File", shortcut: "Mod+N", run: () => void newDocument() },
  newFileInWorkspace: {
    id: "newFileInWorkspace",
    label: "New File in Folder…",
    run: () => {
      const root = useWorkspace.getState().root;
      if (root) return createFileIn(root);
    },
    enabled: () => !!useWorkspace.getState().root,
  },
  openFile: { id: "openFile", label: "Open File…", shortcut: "Mod+O", run: openFileDialog },
  openFolder: { id: "openFolder", label: "Open Folder…", shortcut: "Mod+Shift+O", run: openFolderDialog },
  closeFolder: {
    id: "closeFolder",
    label: "Close Folder",
    run: closeWorkspace,
    enabled: () => !!useWorkspace.getState().root,
  },
  save: {
    id: "save",
    label: "Save",
    shortcut: "Mod+S",
    run: async () => {
      const d = activeDoc();
      if (d) await saveDocument(d.id);
    },
    enabled: hasActive,
  },
  saveAs: {
    id: "saveAs",
    label: "Save As…",
    shortcut: "Mod+Shift+S",
    run: async () => {
      const d = activeDoc();
      if (d) await saveDocument(d.id, { saveAs: true });
    },
    enabled: hasActive,
  },
  saveAll: { id: "saveAll", label: "Save All", shortcut: "Mod+Alt+S", run: async () => void (await saveAll()) },
  closeTab: {
    id: "closeTab",
    label: "Close Tab",
    shortcut: "Mod+W",
    run: async () => {
      const d = activeDoc();
      if (d) await closeDocument(d.id);
    },
    enabled: hasActive,
  },
  nextTab: { id: "nextTab", label: "Next Tab", shortcut: "Ctrl+Tab", run: () => useDocuments.getState().cycle(1) },
  prevTab: { id: "prevTab", label: "Previous Tab", shortcut: "Ctrl+Shift+Tab", run: () => useDocuments.getState().cycle(-1) },

  undo: { id: "undo", label: "Undo", shortcut: "Mod+Z", run: () => editorCommand("undo"), enabled: hasActive },
  redo: { id: "redo", label: "Redo", shortcut: isMac ? "Mod+Shift+Z" : "Mod+Y", run: () => editorCommand("redo"), enabled: hasActive },
  find: { id: "find", label: "Find", shortcut: "Mod+F", run: () => editorCommand("find"), enabled: hasActive },
  replace: { id: "replace", label: "Replace", shortcut: isMac ? "Mod+Alt+F" : "Mod+H", run: () => editorCommand("replace"), enabled: hasActive },
  gotoLine: { id: "gotoLine", label: "Go to Line…", shortcut: "Mod+G", run: () => editorCommand("gotoLine"), enabled: hasActive },
  selectAll: { id: "selectAll", label: "Select All", shortcut: "Mod+A", run: () => editorCommand("selectAll"), enabled: hasActive },

  toggleView: {
    id: "toggleView",
    label: "Cycle View Mode",
    shortcut: "Mod+\\",
    run: () => {
      const { settings, update } = useSettings.getState();
      update({ viewMode: VIEW_ORDER[(VIEW_ORDER.indexOf(settings.viewMode) + 1) % VIEW_ORDER.length] });
    },
  },
  viewEditor: { id: "viewEditor", label: "Editor Only", shortcut: "Mod+1", run: () => useSettings.getState().update({ viewMode: "editor" }) },
  viewSplit: { id: "viewSplit", label: "Split View", shortcut: "Mod+2", run: () => useSettings.getState().update({ viewMode: "split" }) },
  viewPreview: { id: "viewPreview", label: "Preview Only", shortcut: "Mod+3", run: () => useSettings.getState().update({ viewMode: "preview" }) },
  toggleExplorer: {
    id: "toggleExplorer",
    label: "Toggle File Explorer",
    shortcut: "Mod+B",
    run: () => {
      const { settings, update } = useSettings.getState();
      update({ showExplorer: !settings.showExplorer });
    },
  },
  toggleTheme: {
    id: "toggleTheme",
    label: "Toggle Dark Theme",
    run: () => {
      const { update } = useSettings.getState();
      const dark = document.documentElement.dataset.theme === "dark";
      update({ theme: dark ? "light" : "dark" });
    },
  },
  zoomIn: { id: "zoomIn", label: "Increase Font Size", shortcut: "Mod+=", run: () => bumpFont(1) },
  zoomOut: { id: "zoomOut", label: "Decrease Font Size", shortcut: "Mod+-", run: () => bumpFont(-1) },
  zoomReset: { id: "zoomReset", label: "Reset Font Size", shortcut: "Mod+0", run: () => useSettings.getState().update({ fontSize: 15 }) },
  settings: { id: "settings", label: "Settings…", shortcut: "Mod+,", run: () => useUi.getState().setSettingsOpen(true) },
  about: { id: "about", label: "About Markdown Studio", run: () => useUi.getState().setAboutOpen(true) },
  exportLogs: {
    id: "exportLogs",
    label: "Export Diagnostic Logs…",
    run: async () => {
      try {
        const path = await backend().exportLogs();
        if (path) notify("success", "Diagnostic logs exported.");
      } catch (e) {
        notify("error", `Couldn't export logs: ${(e as Error).message}`);
      }
    },
  },
};

function bumpFont(delta: number) {
  const { settings, update } = useSettings.getState();
  update({ fontSize: settings.fontSize + delta });
}

/** Human-readable shortcut for menus and tooltips. */
export function formatShortcut(shortcut?: string): string {
  if (!shortcut) return "";
  if (isMac) {
    return shortcut
      .replace("Mod+", "⌘")
      .replace("Ctrl+", "⌃")
      .replace("Shift+", "⇧")
      .replace("Alt+", "⌥");
  }
  return shortcut.replace("Mod+", "Ctrl+");
}

/** Normalizes a keyboard event to the shortcut format used above. */
export function eventToShortcut(e: KeyboardEvent): string {
  const parts: string[] = [];
  const mod = isMac ? e.metaKey : e.ctrlKey;
  if (mod) parts.push("Mod");
  if (isMac && e.ctrlKey) parts.push("Ctrl");
  if (e.shiftKey) parts.push("Shift");
  if (e.altKey) parts.push("Alt");
  let key = e.key;
  if (key === "+") key = "=";
  if (key.length === 1) key = key.toUpperCase();
  // With Shift held, some layouts report the shifted symbol; use the code instead.
  if (e.code?.startsWith("Digit")) key = e.code.slice(5);
  if (e.code === "Backslash") key = "\\";
  if (e.code === "Comma") key = ",";
  if (e.code === "Equal") key = "=";
  if (e.code === "Minus") key = "-";
  if (e.code?.startsWith("Key") && (e.altKey || e.shiftKey)) key = e.code.slice(3);
  parts.push(key);
  return parts.join("+");
}

/** Shortcuts handled by the editor itself when it has focus. */
const EDITOR_OWNED = new Set(["undo", "redo", "selectAll", "find", "replace", "gotoLine"]);

const byShortcut = (() => {
  const map = new Map<string, Command>();
  for (const c of Object.values(commands)) {
    if (!c.shortcut) continue;
    // "Ctrl+Tab" on Windows/Linux is "Mod+Tab" after normalization.
    const normalized = !isMac ? c.shortcut.replace(/^Ctrl\+/, "Mod+") : c.shortcut;
    map.set(normalized, c);
  }
  return map;
})();

export function handleGlobalKeydown(e: KeyboardEvent) {
  if (e.defaultPrevented || e.isComposing) return;
  const cmd = byShortcut.get(eventToShortcut(e));
  if (!cmd) return;
  const inEditor = (e.target as HTMLElement | null)?.closest?.(".cm-editor");
  if (EDITOR_OWNED.has(cmd.id) && inEditor) return;
  // Leave clipboard/undo shortcuts alone inside ordinary text fields.
  const inField = (e.target as HTMLElement | null)?.closest?.("input, textarea, select");
  if (inField && ["undo", "redo", "selectAll"].includes(cmd.id)) return;
  if (useUi.getState().dialogs.length > 0) return;
  if (cmd.enabled && !cmd.enabled()) return;
  e.preventDefault();
  void cmd.run();
}

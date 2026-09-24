import { Group, Panel, Separator, useDefaultLayout, type LayoutStorage } from "react-resizable-panels";
import { MenuBar } from "./components/MenuBar";
import { FileExplorer } from "./components/FileExplorer";
import { Outline } from "./components/Outline";
import { SearchPanel } from "./components/SearchPanel";
import { Icon } from "./components/Icon";
import { useUi } from "./stores/uiStore";
import { commands, formatShortcut } from "./features/commands";
import { TabBar } from "./components/TabBar";
import { Editor } from "./components/Editor";
import { lazy, Suspense } from "react";

// The preview pulls in the Markdown/math/highlighting pipeline; load it in
// parallel with first paint instead of blocking startup on it.
const Preview = lazy(() => import("./components/Preview").then((m) => ({ default: m.Preview })));
const PreviewPane = () => (
  <Suspense fallback={<div className="preview preview-loading">Loading preview…</div>}>
    <Preview />
  </Suspense>
);
import { StatusBar } from "./components/StatusBar";
import { ChangeBanner } from "./components/ChangeBanner";
import { DialogHost, Toasts } from "./components/Dialogs";
import { AboutDialog, SettingsDialog } from "./components/SettingsDialog";
import { Welcome } from "./components/Welcome";
import { CommandPalette } from "./components/CommandPalette";
import { HistoryDialog } from "./components/HistoryDialog";
import { ShortcutsDialog } from "./components/ShortcutsDialog";
import { useSettings } from "./stores/settingsStore";
import { useDocuments } from "./stores/documentsStore";

/** Panel sizes are a per-machine convenience, so browser storage is enough. */
const layoutStorage: LayoutStorage = {
  getItem(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* storage unavailable */
    }
  },
};

function Sidebar() {
  const view = useUi((s) => s.sidebarView);
  const setView = useUi((s) => s.setSidebarView);
  return (
    <div className="sidebar">
      <div className="sidebar-tabs" role="tablist" aria-label="Sidebar">
        <button
          role="tab"
          aria-selected={view === "explorer"}
          className={`sidebar-tab${view === "explorer" ? " active" : ""}`}
          onClick={() => setView("explorer")}
          title={`Explorer (${formatShortcut(commands.toggleExplorer.shortcut)})`}
        >
          <Icon name="files" size={15} /> Explorer
        </button>
        <button
          role="tab"
          aria-selected={view === "search"}
          className={`sidebar-tab${view === "search" ? " active" : ""}`}
          onClick={() => useUi.getState().focusSearch()}
          title={`Search (${formatShortcut(commands.findInFiles.shortcut)})`}
        >
          <Icon name="search" size={15} /> Search
        </button>
      </div>
      {view === "explorer" ? (
        <>
          <FileExplorer />
          <Outline />
        </>
      ) : (
        <SearchPanel />
      )}
    </div>
  );
}

function EditorArea() {
  const focusMode = useUi((s) => s.focusMode);
  const settingsViewMode = useSettings((s) => s.settings.viewMode);
  // Focus mode writes without the preview (unless the preview is all you have open).
  const viewMode = focusMode && settingsViewMode === "split" ? "editor" : settingsViewMode;
  const layout = useDefaultLayout({ id: "editor-preview", storage: layoutStorage, panelIds: ["editor", "preview"] });

  if (viewMode === "editor") return <div className="pane"><Editor /></div>;
  if (viewMode === "preview") return <div className="pane"><PreviewPane /></div>;
  return (
    <Group id="editor-preview" orientation="horizontal" className="split" defaultLayout={layout.defaultLayout} onLayoutChanged={layout.onLayoutChanged}>
      <Panel id="editor" minSize="20" className="pane"><Editor /></Panel>
      <Separator className="resize-handle" aria-label="Resize editor and preview" />
      <Panel id="preview" minSize="20" className="pane"><PreviewPane /></Panel>
    </Group>
  );
}

export default function App() {
  const focusMode = useUi((s) => s.focusMode);
  const showExplorer = useSettings((s) => s.settings.showExplorer) && !focusMode;
  const hasDocs = useDocuments((s) => s.docs.length > 0);
  const panelIds = showExplorer ? ["explorer", "main"] : ["main"];
  const layout = useDefaultLayout({ id: "workbench", storage: layoutStorage, panelIds });

  return (
    <div className={`app${focusMode ? " focus-mode" : ""}`}>
      <MenuBar />
      <Group
        id="workbench"
        key={panelIds.join()}
        orientation="horizontal"
        className="workbench"
        defaultLayout={layout.defaultLayout}
        onLayoutChanged={layout.onLayoutChanged}
      >
        {showExplorer && (
          <>
            <Panel id="explorer" defaultSize="20" minSize={170} maxSize="45">
              <Sidebar />
            </Panel>
            <Separator className="resize-handle" aria-label="Resize file explorer" />
          </>
        )}
        <Panel id="main" minSize="30">
          <main className="main-area">
            {hasDocs ? (
              <>
                {!focusMode && <TabBar />}
                <ChangeBanner />
                <div className="editor-area">
                  <EditorArea />
                </div>
              </>
            ) : (
              <Welcome />
            )}
          </main>
        </Panel>
      </Group>
      {!focusMode && <StatusBar />}
      <SettingsDialog />
      <AboutDialog />
      <CommandPalette />
      <HistoryDialog />
      <ShortcutsDialog />
      <DialogHost />
      <Toasts />
    </div>
  );
}

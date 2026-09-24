import { Group, Panel, Separator, useDefaultLayout, type LayoutStorage } from "react-resizable-panels";
import { MenuBar } from "./components/MenuBar";
import { FileExplorer } from "./components/FileExplorer";
import { TabBar } from "./components/TabBar";
import { Editor } from "./components/Editor";
import { Preview } from "./components/Preview";
import { StatusBar } from "./components/StatusBar";
import { ChangeBanner } from "./components/ChangeBanner";
import { DialogHost, Toasts } from "./components/Dialogs";
import { AboutDialog, SettingsDialog } from "./components/SettingsDialog";
import { Welcome } from "./components/Welcome";
import { CommandPalette } from "./components/CommandPalette";
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

function EditorArea() {
  const viewMode = useSettings((s) => s.settings.viewMode);
  const layout = useDefaultLayout({ id: "editor-preview", storage: layoutStorage, panelIds: ["editor", "preview"] });

  if (viewMode === "editor") return <div className="pane"><Editor /></div>;
  if (viewMode === "preview") return <div className="pane"><Preview /></div>;
  return (
    <Group id="editor-preview" orientation="horizontal" className="split" defaultLayout={layout.defaultLayout} onLayoutChanged={layout.onLayoutChanged}>
      <Panel id="editor" minSize="20" className="pane"><Editor /></Panel>
      <Separator className="resize-handle" aria-label="Resize editor and preview" />
      <Panel id="preview" minSize="20" className="pane"><Preview /></Panel>
    </Group>
  );
}

export default function App() {
  const showExplorer = useSettings((s) => s.settings.showExplorer);
  const hasDocs = useDocuments((s) => s.docs.length > 0);
  const panelIds = showExplorer ? ["explorer", "main"] : ["main"];
  const layout = useDefaultLayout({ id: "workbench", storage: layoutStorage, panelIds });

  return (
    <div className="app">
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
              <FileExplorer />
            </Panel>
            <Separator className="resize-handle" aria-label="Resize file explorer" />
          </>
        )}
        <Panel id="main" minSize="30">
          <main className="main-area">
            {hasDocs ? (
              <>
                <TabBar />
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
      <StatusBar />
      <SettingsDialog />
      <AboutDialog />
      <CommandPalette />
      <DialogHost />
      <Toasts />
    </div>
  );
}

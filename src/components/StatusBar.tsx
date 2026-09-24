import { useMemo } from "react";
import { useDocuments, isDirty } from "../stores/documentsStore";
import { useUi } from "../stores/uiStore";
import { useSettings } from "../stores/settingsStore";
import { countWords } from "../services/markdown";
import { backend } from "../services";

/** Status bar: encoding, language, line/column and save state (SRS §8). */
export function StatusBar() {
  const doc = useDocuments((s) => s.docs.find((d) => d.id === s.activeId));
  const cursor = useUi((s) => s.cursor);
  const viewMode = useSettings((s) => s.settings.viewMode);
  const autoSave = useSettings((s) => s.settings.autoSave);
  const words = useMemo(() => (doc ? countWords(doc.content) : 0), [doc?.content]); // eslint-disable-line react-hooks/exhaustive-deps

  let state = "";
  if (doc) {
    if (doc.saving) state = "Saving…";
    else if (doc.externalChange === "deleted") state = "Deleted on disk";
    else if (doc.externalChange === "modified") state = "Changed on disk";
    else if (isDirty(doc)) state = doc.path ? "Unsaved changes" : "Not saved";
    else state = doc.path ? "Saved" : "New file";
  }

  return (
    <footer className="statusbar" aria-label="Status bar">
      <div className="status-left">
        {!backend().isNative && <span className="status-item status-demo" title="Running in a browser. Files are stored in this browser only.">Browser demo</span>}
        {doc && (
          <span className={`status-item status-state${doc && isDirty(doc) ? " dirty" : ""}`} role="status" aria-live="polite">
            {state}
          </span>
        )}
      </div>
      {doc && (
        <div className="status-right">
          {viewMode !== "preview" && (
            <span className="status-item" title="Line and column">
              Ln {cursor.line}, Col {cursor.col}
              {cursor.selected > 0 && ` (${cursor.selected} selected)`}
            </span>
          )}
          <span className="status-item">{words.toLocaleString()} words</span>
          {autoSave !== "off" && doc.path && <span className="status-item" title="Auto save is on">Auto save</span>}
          <span className="status-item" title="Line endings are preserved when saving">{doc.lineEnding.toUpperCase()}</span>
          <span className="status-item" title="Text encoding">{doc.bom ? "UTF-8 with BOM" : "UTF-8"}</span>
          <span className="status-item">Markdown</span>
        </div>
      )}
    </footer>
  );
}

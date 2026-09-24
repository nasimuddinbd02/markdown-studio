import { useMemo, useState } from "react";
import { useUi } from "../stores/uiStore";
import { commands, formatCommands, formatShortcut, type Command } from "../features/commands";
import { fuzzyFilter } from "../features/fuzzy";
import { Modal } from "./Dialogs";

const GROUPS: Array<{ title: string; ids: string[] }> = [
  { title: "File", ids: ["newFile", "openFile", "openFolder", "save", "saveAs", "saveAll", "fileHistory", "exportHtml", "print", "closeTab"] },
  { title: "Edit & Find", ids: ["undo", "redo", "find", "replace", "gotoLine", "findInFiles", "selectAll"] },
  { title: "Format", ids: Object.keys(formatCommands) },
  {
    title: "View & Navigation",
    ids: ["commandPalette", "viewEditor", "viewSplit", "viewPreview", "toggleView", "toggleExplorer", "toggleOutline", "focusMode", "fullScreen", "zoomIn", "zoomOut", "zoomReset", "nextTab", "prevTab", "settings"],
  },
];

/** Searchable reference of every command and its shortcut (Help → Keyboard Shortcuts). */
export function ShortcutsDialog() {
  const open = useUi((s) => s.shortcutsOpen);
  const setOpen = useUi((s) => s.setShortcutsOpen);
  const [query, setQuery] = useState("");

  const groups = useMemo(() => {
    const byGroup = GROUPS.map((g) => ({
      title: g.title,
      items: g.ids.map((id) => commands[id]).filter((c): c is Command => !!c),
    }));
    if (!query.trim()) return byGroup;
    return byGroup
      .map((g) => ({
        title: g.title,
        items: fuzzyFilter(g.items, query, (c) => `${c.label} ${formatShortcut(c.shortcut)}`).map((r) => r.item),
      }))
      .filter((g) => g.items.length > 0);
  }, [query]);

  if (!open) return null;
  return (
    <Modal title="Keyboard Shortcuts" onClose={() => setOpen(false)} className="shortcuts-modal">
      <input
        className="text-input"
        placeholder="Filter commands"
        aria-label="Filter commands"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        data-autofocus
      />
      <div className="shortcuts-groups" tabIndex={0} role="region" aria-label="Shortcut list">
        {groups.length === 0 && <p className="muted">No matching commands.</p>}
        {groups.map((g) => (
          <section key={g.title}>
            <h3>{g.title}</h3>
            <table className="shortcuts-table">
              <tbody>
                {g.items.map((c) => (
                  <tr key={c.id}>
                    <td>{c.label.replace(/…$/, "")}</td>
                    <td>{c.shortcut ? <kbd>{formatShortcut(c.shortcut)}</kbd> : <span className="muted">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}
      </div>
      <div className="modal-buttons">
        <button className="button primary" onClick={() => setOpen(false)}>Close</button>
      </div>
    </Modal>
  );
}

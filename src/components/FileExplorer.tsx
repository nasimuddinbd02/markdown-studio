import { useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import { useWorkspace } from "../stores/workspaceStore";
import { useDocuments, isDirty } from "../stores/documentsStore";
import { basename } from "../services/paths";
import type { DirEntry } from "../types";
import { openPath } from "../features/documents";
import {
  createFileIn, createFolderIn, deleteEntry, duplicateFile, openFolderDialog, refreshWorkspace, renameEntry, toggleDir,
} from "../features/workspace";
import { Icon } from "./Icon";
import { ContextMenu, type MenuEntry } from "./ContextMenu";
import { copyPath, copyRelativePath, revealInFolder, revealLabel } from "../features/pathActions";
import { backend } from "../services";

interface ContextMenu {
  x: number;
  y: number;
  entry: DirEntry;
}

function TreeNode({ entry, depth, onContext }: { entry: DirEntry; depth: number; onContext(e: MouseEvent, entry: DirEntry): void }) {
  const expanded = useWorkspace((s) => !!s.expanded[entry.path]);
  const children = useWorkspace((s) => s.children[entry.path]);
  const selected = useWorkspace((s) => s.selected === entry.path);
  const openDoc = useDocuments((s) => s.docs.find((d) => d.path === entry.path));
  const active = useDocuments((s) => !!openDoc && s.activeId === openDoc.id);

  const activate = () => {
    useWorkspace.getState().select(entry.path);
    if (entry.isDir) void toggleDir(entry.path);
    else void openPath(entry.path);
  };

  return (
    <li role="treeitem" aria-expanded={entry.isDir ? expanded : undefined} aria-selected={selected} aria-level={depth + 1}>
      <div
        className={`tree-row${selected ? " selected" : ""}${active ? " active" : ""}`}
        style={{ paddingLeft: 8 + depth * 14 }}
        tabIndex={selected ? 0 : -1}
        data-path={entry.path}
        onClick={activate}
        onContextMenu={(e) => onContext(e, entry)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            activate();
          } else if (e.key === "ContextMenu" || (e.shiftKey && e.key === "F10")) {
            e.preventDefault();
            const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
            onContext({ preventDefault() {}, clientX: r.left + 24, clientY: r.bottom } as unknown as MouseEvent, entry);
          } else if (e.key === "F2") {
            e.preventDefault();
            void renameEntry(entry);
          } else if (e.key === "Delete") {
            e.preventDefault();
            void deleteEntry(entry);
          } else if (e.key === "ArrowRight" && entry.isDir && !expanded) {
            e.preventDefault();
            void toggleDir(entry.path);
          } else if (e.key === "ArrowLeft" && entry.isDir && expanded) {
            e.preventDefault();
            void toggleDir(entry.path);
          }
        }}
        title={entry.path}
      >
        {entry.isDir ? (
          <Icon name={expanded ? "chevronDown" : "chevronRight"} size={14} className="tree-chevron" />
        ) : (
          <span className="tree-chevron-spacer" />
        )}
        <Icon name={entry.isDir ? (expanded ? "folderOpen" : "folder") : "file"} size={15} className={entry.isDir ? "tree-folder-icon" : "tree-file-icon"} />
        <span className="tree-label">{entry.name}</span>
        {openDoc && isDirty(openDoc) && <span className="dirty-dot" title="Unsaved changes" aria-label="unsaved changes" />}
      </div>
      {entry.isDir && expanded && (
        <ul role="group">
          {children === undefined ? (
            <li role="none" className="tree-empty" style={{ paddingLeft: 22 + (depth + 1) * 14 }}>Loading…</li>
          ) : children.length === 0 ? (
            <li role="none" className="tree-empty" style={{ paddingLeft: 22 + (depth + 1) * 14 }}>No Markdown files</li>
          ) : (
            children.map((c) => <TreeNode key={c.path} entry={c} depth={depth + 1} onContext={onContext} />)
          )}
        </ul>
      )}
    </li>
  );
}

export function FileExplorer() {
  const root = useWorkspace((s) => s.root);
  const rootChildren = useWorkspace((s) => (s.root ? s.children[s.root] : undefined));
  const hasSelection = useWorkspace((s) => !!s.selected);
  const [menu, setMenu] = useState<ContextMenu | null>(null);
  const tree = useRef<HTMLUListElement>(null);

  const onContext = (e: MouseEvent, entry: DirEntry) => {
    e.preventDefault();
    useWorkspace.getState().select(entry.path);
    setMenu({ x: e.clientX, y: e.clientY, entry });
  };

  /** Up/Down moves between visible rows (NFR-010). */
  const onTreeKey = (e: KeyboardEvent) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const rows = [...(tree.current?.querySelectorAll<HTMLElement>(".tree-row") ?? [])];
    const idx = rows.indexOf(document.activeElement as HTMLElement);
    const next = rows[Math.max(0, Math.min(rows.length - 1, idx + (e.key === "ArrowDown" ? 1 : -1)))];
    if (next) {
      e.preventDefault();
      useWorkspace.getState().select(next.dataset.path ?? null);
      next.focus();
    }
  };

  if (!root) {
    return (
      <aside className="explorer" aria-label="File explorer">
        <div className="explorer-header">
          <span className="explorer-title">Explorer</span>
        </div>
        <div className="explorer-empty">
          <p>No folder is open.</p>
          <button className="button primary" onClick={() => void openFolderDialog()}>
            <Icon name="folderOpen" /> Open Folder
          </button>
        </div>
      </aside>
    );
  }

  const menuDir = menu ? (menu.entry.isDir ? menu.entry.path : null) : null;

  return (
    <aside className="explorer" aria-label="File explorer">
      <div className="explorer-header">
        <span className="explorer-title" title={root}>{basename(root)}</span>
        <div className="explorer-actions">
          <button className="icon-button small" title="New file" aria-label="New file" onClick={() => void createFileIn(root)}>
            <Icon name="filePlus" size={15} />
          </button>
          <button className="icon-button small" title="New folder" aria-label="New folder" onClick={() => void createFolderIn(root)}>
            <Icon name="folderPlus" size={15} />
          </button>
          <button className="icon-button small" title="Refresh" aria-label="Refresh file explorer" onClick={() => void refreshWorkspace()}>
            <Icon name="refresh" size={15} />
          </button>
        </div>
      </div>
      <ul className="tree" role="tree" aria-label={basename(root)} ref={tree} onKeyDown={onTreeKey}
        tabIndex={hasSelection ? -1 : 0}
        onFocus={(e) => {
          if (e.target === tree.current) tree.current?.querySelector<HTMLElement>(".tree-row")?.focus();
        }}
      >
        {rootChildren === undefined ? (
          <li role="none" className="tree-empty">Loading…</li>
        ) : rootChildren.length === 0 ? (
          <li role="none" className="tree-empty">This folder has no Markdown files.</li>
        ) : (
          rootChildren.map((c) => <TreeNode key={c.path} entry={c} depth={0} onContext={onContext} />)
        )}
      </ul>
      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          label={`Actions for ${menu.entry.name}`}
          onClose={() => setMenu(null)}
          items={[
            ...(menuDir
              ? ([
                  { label: "New File…", run: () => createFileIn(menuDir) },
                  { label: "New Folder…", run: () => createFolderIn(menuDir) },
                  "separator",
                ] as MenuEntry[])
              : ([
                  { label: "Open", run: () => openPath(menu.entry.path) },
                  { label: "Duplicate", run: () => duplicateFile(menu.entry.path) },
                  "separator",
                ] as MenuEntry[])),
            { label: revealLabel, run: () => revealInFolder(menu.entry.path), disabled: !backend().isNative },
            { label: "Copy Path", run: () => copyPath(menu.entry.path) },
            { label: "Copy Relative Path", run: () => copyRelativePath(menu.entry.path) },
            "separator",
            { label: "Rename…", run: () => renameEntry(menu.entry), shortcut: "F2" },
            { label: "Delete…", run: () => deleteEntry(menu.entry), shortcut: "Delete", danger: true },
          ]}
        />
      )}
    </aside>
  );
}

import { useDeferredValue, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useDocuments } from "../stores/documentsStore";
import { useUi } from "../stores/uiStore";
import { useSettings } from "../stores/settingsStore";
import { currentHeadingIndex, extractHeadings, headingSlugs, type Heading } from "../features/outline";
import { moveSectionAtLine } from "../features/sections";
import { copyText } from "../features/pathActions";
import { ContextMenu } from "./ContextMenu";
import { revealLine } from "../features/editorBridge";
import { Icon } from "./Icon";

/** Scrolls the preview to the n-th rendered heading. */
function revealInPreview(index: number) {
  const headings = document.querySelectorAll<HTMLElement>(".markdown-body :is(h1,h2,h3,h4,h5,h6)");
  headings[index]?.scrollIntoView({ block: "start" });
}

/** Document outline: navigable list of headings for the active document. */
export function Outline() {
  const docId = useDocuments((s) => s.activeId);
  const content = useDocuments((s) => s.docs.find((d) => d.id === s.activeId)?.content);
  const deferred = useDeferredValue(content);
  const headings = useMemo(() => (deferred ? extractHeadings(deferred) : []), [deferred]);
  const cursorLine = useUi((s) => s.cursor.line);
  const current = currentHeadingIndex(headings, cursorLine);
  const collapsed = useSettings((s) => !s.settings.showOutline);
  const update = useSettings((s) => s.update);
  const list = useRef<HTMLUListElement>(null);
  const minLevel = headings.reduce((m, h) => Math.min(m, h.level), 6);
  const slugs = useMemo(() => headingSlugs(headings), [headings]);
  const [menu, setMenu] = useState<{ x: number; y: number; index: number } | null>(null);
  /** After a keyboard move, focus follows the moved heading. */
  const refocus = useRef<{ text: string; level: number } | null>(null);

  useEffect(() => {
    const target = refocus.current;
    if (!target || !list.current) return;
    const index = headings.findIndex((h) => h.text === target.text && h.level === target.level);
    if (index >= 0) {
      refocus.current = null;
      list.current.querySelectorAll<HTMLButtonElement>(".outline-item")[index]?.focus();
    }
  }, [headings]);

  const move = (index: number, direction: -1 | 1) => {
    const h = headings[index];
    if (!docId || !h) return false;
    refocus.current = { text: h.text, level: h.level };
    const moved = moveSectionAtLine(docId, h.line, direction);
    if (!moved) refocus.current = null;
    return moved;
  };

  const onItemKey = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (e.altKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
      e.preventDefault();
      move(index, e.key === "ArrowUp" ? -1 : 1);
    } else if (e.key === "ContextMenu" || (e.shiftKey && e.key === "F10")) {
      e.preventDefault();
      const r = e.currentTarget.getBoundingClientRect();
      setMenu({ x: r.left + 12, y: r.bottom, index });
    }
  };

  useEffect(() => {
    list.current?.querySelector(".outline-item.current")?.scrollIntoView({ block: "nearest" });
  }, [current]);

  const go = (h: Heading, index: number) => {
    const viewMode = useSettings.getState().settings.viewMode;
    if (viewMode !== "preview") revealLine(h.line);
    if (viewMode !== "editor") revealInPreview(index);
  };

  return (
    <section className={`sidebar-section outline${collapsed ? " collapsed" : ""}`} aria-label="Outline">
      <button
        className="sidebar-section-header"
        aria-expanded={!collapsed}
        onClick={() => update({ showOutline: collapsed })}
      >
        <Icon name={collapsed ? "chevronRight" : "chevronDown"} size={14} />
        <span>Outline</span>
        {!collapsed && headings.length > 0 && <span className="badge">{headings.length}</span>}
      </button>
      {!collapsed && (
        content === undefined ? (
          <p className="sidebar-empty">No document is open.</p>
        ) : headings.length === 0 ? (
          <p className="sidebar-empty">No headings in this document.</p>
        ) : (
          <ul className="outline-list" ref={list} role="list">
            {headings.map((h, i) => (
              <li key={`${h.line}-${i}`}>
                <button
                  className={`outline-item${i === current ? " current" : ""}`}
                  style={{ paddingLeft: 12 + (h.level - minLevel) * 14 }}
                  aria-current={i === current ? "location" : undefined}
                  title={`${h.text} (line ${h.line}). Alt+Up/Down moves the section`}
                  onClick={() => go(h, i)}
                  onKeyDown={(e) => onItemKey(e, i)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setMenu({ x: e.clientX, y: e.clientY, index: i });
                  }}
                >
                  <span className="outline-level" aria-hidden="true">H{h.level}</span>
                  <span className="outline-text">{h.text}</span>
                </button>
              </li>
            ))}
          </ul>
        )
      )}
      {menu && headings[menu.index] && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          label={`Actions for heading ${headings[menu.index].text}`}
          onClose={() => setMenu(null)}
          items={[
            { label: "Copy Link to Heading", run: () => copyText(`#${slugs[menu.index]}`, "Link") },
            {
              label: "Copy Markdown Link",
              run: () => copyText(`[${headings[menu.index].text.replace(/([[\]])/g, "\\$1")}](#${slugs[menu.index]})`, "Markdown link"),
            },
            "separator",
            { label: "Move Section Up", run: () => move(menu.index, -1), shortcut: "Alt+↑" },
            { label: "Move Section Down", run: () => move(menu.index, 1), shortcut: "Alt+↓" },
          ]}
        />
      )}
    </section>
  );
}

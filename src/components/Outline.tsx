import { useDeferredValue, useEffect, useMemo, useRef } from "react";
import { useDocuments } from "../stores/documentsStore";
import { useUi } from "../stores/uiStore";
import { useSettings } from "../stores/settingsStore";
import { currentHeadingIndex, extractHeadings, type Heading } from "../features/outline";
import { revealLine } from "../features/editorBridge";
import { Icon } from "./Icon";

/** Scrolls the preview to the n-th rendered heading. */
function revealInPreview(index: number) {
  const headings = document.querySelectorAll<HTMLElement>(".markdown-body :is(h1,h2,h3,h4,h5,h6)");
  headings[index]?.scrollIntoView({ block: "start" });
}

/** Document outline: navigable list of headings for the active document. */
export function Outline() {
  const content = useDocuments((s) => s.docs.find((d) => d.id === s.activeId)?.content);
  const deferred = useDeferredValue(content);
  const headings = useMemo(() => (deferred ? extractHeadings(deferred) : []), [deferred]);
  const cursorLine = useUi((s) => s.cursor.line);
  const current = currentHeadingIndex(headings, cursorLine);
  const collapsed = useSettings((s) => !s.settings.showOutline);
  const update = useSettings((s) => s.update);
  const list = useRef<HTMLUListElement>(null);
  const minLevel = headings.reduce((m, h) => Math.min(m, h.level), 6);

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
                  title={`${h.text} (line ${h.line})`}
                  onClick={() => go(h, i)}
                >
                  <span className="outline-level" aria-hidden="true">H{h.level}</span>
                  <span className="outline-text">{h.text}</span>
                </button>
              </li>
            ))}
          </ul>
        )
      )}
    </section>
  );
}

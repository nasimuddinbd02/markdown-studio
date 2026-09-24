import { useRef, type KeyboardEvent } from "react";
import { useDocuments, isDirty } from "../stores/documentsStore";
import { closeDocument, newDocument } from "../features/documents";
import { commands, formatShortcut } from "../features/commands";
import { Icon } from "./Icon";

/** Document tabs (FR-040, FR-041). Dirty tabs show a dot *and* a text label (§15). */
export function TabBar() {
  const docs = useDocuments((s) => s.docs);
  const activeId = useDocuments((s) => s.activeId);
  const setActive = useDocuments((s) => s.setActive);
  const move = useDocuments((s) => s.move);
  const drag = useRef<{ id: string; x: number; moved: boolean } | null>(null);

  /** Pointer-based reordering (HTML5 drag-and-drop is reserved for OS file drops). */
  const onPointerMove = (e: PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    if (!d.moved && Math.abs(e.clientX - d.x) < 6) return;
    d.moved = true;
    const over = (document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null)?.closest<HTMLElement>("[data-tab-id]");
    const targetId = over?.dataset.tabId;
    if (!targetId || targetId === d.id) return;
    const docsNow = useDocuments.getState().docs;
    move(d.id, docsNow.findIndex((x) => x.id === targetId));
  };
  const endDrag = () => {
    drag.current = null;
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", endDrag);
  };
  const list = useRef<HTMLDivElement>(null);

  const onKey = (e: KeyboardEvent) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft" && e.key !== "Home" && e.key !== "End") return;
    const tabs = [...(list.current?.querySelectorAll<HTMLElement>("[role=tab]") ?? [])];
    const idx = tabs.indexOf(document.activeElement as HTMLElement);
    let next = idx;
    if (e.key === "ArrowRight") next = (idx + 1) % tabs.length;
    if (e.key === "ArrowLeft") next = (idx - 1 + tabs.length) % tabs.length;
    if (e.key === "Home") next = 0;
    if (e.key === "End") next = tabs.length - 1;
    e.preventDefault();
    tabs[next]?.focus();
    tabs[next]?.click();
  };

  return (
    <div className="tabbar">
      <div className="tabs" role="tablist" aria-label="Open documents" ref={list} onKeyDown={onKey}>
        {docs.map((d) => {
          const dirty = isDirty(d);
          const active = d.id === activeId;
          return (
            <div
              key={d.id}
              role="tab"
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              className={`tab${active ? " active" : ""}${dirty ? " dirty" : ""}${d.externalChange ? " warn" : ""}`}
              title={(d.path ?? "Not saved yet") + (dirty ? " — unsaved changes" : "")}
              onClick={() => setActive(d.id)}
              onAuxClick={(e) => {
                if (e.button === 1) void closeDocument(d.id);
              }}
              data-tab-id={d.id}
              onPointerDown={(e) => {
                if (e.button !== 0 || (e.target as HTMLElement).closest(".tab-close")) return;
                drag.current = { id: d.id, x: e.clientX, moved: false };
                window.addEventListener("pointermove", onPointerMove);
                window.addEventListener("pointerup", endDrag);
              }}
            >
              <Icon name="file" size={14} className="tab-icon" />
              <span className="tab-label">{d.name}</span>
              {dirty && <span className="sr-only"> (unsaved)</span>}
              <button
                className="tab-close"
                tabIndex={-1}
                aria-label={`Close ${d.name}`}
                title={`Close (${formatShortcut(commands.closeTab.shortcut)})`}
                onClick={(e) => {
                  e.stopPropagation();
                  void closeDocument(d.id);
                }}
              >
                <span className="tab-dirty-dot" aria-hidden="true" />
                <Icon name="close" size={13} className="tab-close-icon" />
              </button>
            </div>
          );
        })}
      </div>
      <button className="icon-button small new-tab" onClick={() => newDocument()} title={`New file (${formatShortcut(commands.newFile.shortcut)})`} aria-label="New file">
        <Icon name="plus" size={15} />
      </button>
    </div>
  );
}

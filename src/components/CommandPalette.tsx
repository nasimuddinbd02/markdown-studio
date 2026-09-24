import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useUi } from "../stores/uiStore";
import { useDocuments } from "../stores/documentsStore";
import { commands, formatShortcut } from "../features/commands";
import { fuzzyFilter } from "../features/fuzzy";

interface PaletteItem {
  id: string;
  label: string;
  hint?: string;
  shortcut?: string;
  run(): void | Promise<void>;
}

function highlight(text: string, indices: number[]): ReactNode {
  if (!indices.length) return text;
  const set = new Set(indices);
  return [...text].map((ch, i) => (set.has(i) ? <mark key={i}>{ch}</mark> : ch));
}

/** Searchable list of every command and open tab (Ctrl/Cmd+Shift+P). */
export function CommandPalette() {
  const open = useUi((s) => s.paletteOpen);
  const setOpen = useUi((s) => s.setPaletteOpen);
  if (!open) return null;
  return <PaletteBody onClose={() => setOpen(false)} />;
}

function PaletteBody({ onClose }: { onClose(): void }) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const docs = useDocuments((s) => s.docs);

  const items = useMemo<PaletteItem[]>(() => {
    const cmdItems = Object.values(commands)
      .filter((c) => c.id !== "commandPalette" && (!c.enabled || c.enabled()))
      .map((c) => ({ id: `cmd:${c.id}`, label: c.label.replace(/…$/, ""), shortcut: c.shortcut, run: c.run }));
    const tabItems = docs.map((d) => ({
      id: `tab:${d.id}`,
      label: `Go to Tab: ${d.name}`,
      hint: d.path ?? "Not saved",
      run: () => useDocuments.getState().setActive(d.id),
    }));
    return [...cmdItems, ...tabItems];
  }, [docs]);

  const results = useMemo(() => fuzzyFilter(items, query, (i) => i.label).slice(0, 50), [items, query]);

  useEffect(() => {
    input.current?.focus();
    const previous = document.activeElement as HTMLElement | null;
    return () => previous?.focus?.();
  }, []);
  useEffect(() => setActive(0), [query]);
  useEffect(() => {
    list.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const runItem = (item: PaletteItem | undefined) => {
    if (!item) return;
    onClose();
    // Let the palette unmount (and focus return) before running.
    setTimeout(() => void item.run(), 0);
  };

  return (
    <div className="palette-backdrop" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="palette" role="dialog" aria-modal="true" aria-label="Command palette">
        <input
          ref={input}
          className="palette-input"
          placeholder="Type a command or tab name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          role="combobox"
          aria-expanded="true"
          aria-controls="palette-list"
          aria-activedescendant={results[active] ? `palette-item-${active}` : undefined}
          spellCheck={false}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") setActive((a) => Math.min(a + 1, results.length - 1));
            else if (e.key === "ArrowUp") setActive((a) => Math.max(a - 1, 0));
            else if (e.key === "PageDown") setActive((a) => Math.min(a + 8, results.length - 1));
            else if (e.key === "PageUp") setActive((a) => Math.max(a - 8, 0));
            else if (e.key === "Enter") runItem(results[active]?.item);
            else if (e.key === "Escape") onClose();
            else return;
            e.preventDefault();
            e.stopPropagation();
          }}
        />
        <ul className="palette-list" id="palette-list" role="listbox" ref={list} aria-label="Commands">
          {results.length === 0 && <li className="palette-empty">No matching commands</li>}
          {results.map(({ item, match }, i) => (
            <li
              key={item.id}
              id={`palette-item-${i}`}
              data-index={i}
              role="option"
              aria-selected={i === active}
              className={`palette-item${i === active ? " active" : ""}`}
              onPointerMove={() => setActive(i)}
              onClick={() => runItem(item)}
            >
              <span className="palette-label">{highlight(item.label, match.indices)}</span>
              {item.hint && <span className="palette-hint">{item.hint}</span>}
              {item.shortcut && <kbd>{formatShortcut(item.shortcut)}</kbd>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

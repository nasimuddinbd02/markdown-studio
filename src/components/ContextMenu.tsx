import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { formatShortcut } from "../features/commands";

export type MenuEntry =
  | { label: string; run: () => unknown; shortcut?: string; disabled?: boolean; danger?: boolean }
  | "separator";

/**
 * Accessible context menu: opens at the pointer (kept on screen), focuses the
 * first item, supports arrow keys / Home / End / Escape, and closes on
 * outside click, blur or scroll.
 */
export function ContextMenu({ x, y, items, onClose, label }: {
  x: number;
  y: number;
  items: MenuEntry[];
  onClose(): void;
  label: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: x, top: y });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({
      left: Math.max(4, Math.min(x, window.innerWidth - r.width - 4)),
      top: Math.max(4, Math.min(y, window.innerHeight - r.height - 4)),
    });
    el.querySelector<HTMLButtonElement>("[role=menuitem]:not([disabled])")?.focus();
  }, [x, y]);

  useEffect(() => {
    const close = () => onClose();
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("blur", close);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("blur", close);
      window.removeEventListener("resize", close);
    };
  }, [onClose]);

  const onKey = (e: KeyboardEvent) => {
    const els = [...(ref.current?.querySelectorAll<HTMLButtonElement>("[role=menuitem]:not([disabled])") ?? [])];
    const idx = els.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === "ArrowDown") els[(idx + 1) % els.length]?.focus();
    else if (e.key === "ArrowUp") els[(idx - 1 + els.length) % els.length]?.focus();
    else if (e.key === "Home") els[0]?.focus();
    else if (e.key === "End") els[els.length - 1]?.focus();
    else if (e.key === "Escape" || e.key === "Tab") onClose();
    else return;
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div ref={ref} className="context-menu" role="menu" aria-label={label} style={pos} onKeyDown={onKey}>
      {items.map((item, i) =>
        item === "separator" ? (
          <div key={i} className="menu-separator" role="separator" />
        ) : (
          <button
            key={i}
            role="menuitem"
            className={`menu-item${item.danger ? " danger" : ""}`}
            disabled={item.disabled}
            onClick={() => {
              onClose();
              void item.run();
            }}
          >
            <span className="menu-item-label">{item.label}</span>
            {item.shortcut && <kbd className="menu-item-shortcut">{formatShortcut(item.shortcut)}</kbd>}
          </button>
        ),
      )}
    </div>
  );
}

import { create } from "zustand";
import type { DirEntry } from "../types";

interface WorkspaceState {
  root: string | null;
  /** Directory path → its listed children (loaded lazily). */
  children: Record<string, DirEntry[]>;
  expanded: Record<string, boolean>;
  selected: string | null;
  setRoot(root: string | null): void;
  setChildren(dir: string, entries: DirEntry[]): void;
  setExpanded(dir: string, expanded: boolean): void;
  select(path: string | null): void;
}

export const useWorkspace = create<WorkspaceState>((set) => ({
  root: null,
  children: {},
  expanded: {},
  selected: null,
  setRoot: (root) => set({ root, children: {}, expanded: root ? { [root]: true } : {}, selected: null }),
  setChildren: (dir, entries) => set((s) => ({ children: { ...s.children, [dir]: entries } })),
  setExpanded: (dir, expanded) => set((s) => ({ expanded: { ...s.expanded, [dir]: expanded } })),
  select: (selected) => set({ selected }),
}));

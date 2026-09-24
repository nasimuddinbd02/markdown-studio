export type LineEnding = "lf" | "crlf";

export interface DirEntry {
  name: string;
  path: string;
  isDir: boolean;
}

export interface FileContent {
  path: string;
  content: string;
  /** Modification time in ms since epoch, used for external-change detection. */
  mtime: number;
  lineEnding: LineEnding;
  bom: boolean;
}

export interface RecentEntry {
  path: string;
  kind: "file" | "folder";
}

export interface AppInfo {
  version: string;
  os: string;
  arch: string;
  logPath: string;
}

export type ErrorKind =
  | "notFound"
  | "permissionDenied"
  | "outOfScope"
  | "invalidPath"
  | "encoding"
  | "conflict"
  | "alreadyExists"
  | "diskFull"
  | "tooLarge"
  | "io";

export type ViewMode = "editor" | "split" | "preview";
export type ThemePreference = "system" | "light" | "dark";

export interface Settings {
  theme: ThemePreference;
  fontSize: number;
  fontFamily: string;
  lineNumbers: boolean;
  lineWrapping: boolean;
  tabSize: number;
  previewDebounceMs: number;
  viewMode: ViewMode;
  showExplorer: boolean;
  showOutline: boolean;
  syncScroll: boolean;
  restoreSession: boolean;
  /** Last session's workspace and open files, restored on launch (FR-003). */
  session: { workspace: string | null; files: string[] };
}

export type ExternalChange = "modified" | "deleted" | null;

export interface Doc {
  id: string;
  /** `null` for a new, never-saved document. */
  path: string | null;
  name: string;
  content: string;
  /** Content as last loaded/saved; the document is dirty when it differs. */
  savedContent: string;
  lineEnding: LineEnding;
  bom: boolean;
  mtime: number | null;
  externalChange: ExternalChange;
  saving: boolean;
}

export interface RecoverySnapshot {
  savedAt: number;
  docs: Array<Pick<Doc, "path" | "name" | "content" | "lineEnding" | "bom" | "mtime">>;
}

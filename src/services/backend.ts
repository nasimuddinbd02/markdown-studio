import type {
  AppInfo, OpenPaths, SearchOptions, SearchResult, DirEntry, FileContent, LineEnding, RecentEntry, RecoverySnapshot,
} from "../types";

export type ExportKind = "html";

export interface WriteRequest {
  path: string;
  content: string;
  lineEnding: LineEnding;
  bom: boolean;
  /** mtime from when the file was last read/saved; enables conflict detection. */
  expectedMtime: number | null;
  /** Overwrite even if the file changed on disk. */
  force: boolean;
}

/**
 * Everything the UI needs from the host platform. The Tauri implementation
 * calls validated Rust commands; the in-memory implementation lets the UI run
 * in a plain browser (development, demos, and tests).
 */
export interface Backend {
  readonly isNative: boolean;
  appInfo(): Promise<AppInfo>;

  pickOpenFile(): Promise<string | null>;
  pickOpenFolder(): Promise<string | null>;
  pickSavePath(suggestedName: string, directory: string | null): Promise<string | null>;

  listRecent(): Promise<RecentEntry[]>;
  openRecent(path: string): Promise<RecentEntry>;
  removeRecent(path: string): Promise<void>;

  listDir(path: string): Promise<DirEntry[]>;
  readTextFile(path: string): Promise<FileContent>;
  /** Returns the new modification time. */
  writeTextFile(req: WriteRequest): Promise<number>;
  /** Returns `null` if the file no longer exists. */
  fileMtime(path: string): Promise<number | null>;
  createFile(directory: string, name: string): Promise<string>;
  createFolder(directory: string, name: string): Promise<string>;
  renamePath(path: string, newName: string): Promise<string>;
  deletePath(path: string): Promise<void>;
  /** Markdown and image files under an approved folder (for link completion). */
  listWorkspaceFiles(root: string): Promise<string[]>;
  /** Searches Markdown files under an approved folder. */
  searchWorkspace(root: string, options: SearchOptions): Promise<SearchResult>;
  /**
   * Saves an image into `assets/` next to a saved document; returns the new
   * file's absolute path. Never overwrites existing files.
   */
  saveImageAsset(docPath: string, fileName: string, dataBase64: string): Promise<string>;
  /** Returns a data: URL for a local image referenced by a document. */
  readImage(path: string): Promise<string>;
  openExternal(url: string): Promise<void>;
  /**
   * Asks the user where to save an exported file (native Save dialog) and
   * writes it there. Returns the chosen path, or `null` if cancelled.
   */
  exportFile(suggestedName: string, content: string, kind: ExportKind): Promise<string | null>;

  loadSettings(): Promise<unknown>;
  saveSettings(settings: unknown): Promise<void>;
  loadRecovery(): Promise<RecoverySnapshot | null>;
  saveRecovery(snapshot: RecoverySnapshot): Promise<void>;
  clearRecovery(): Promise<void>;

  /** Paths the app was launched with (consumed once). */
  takePendingOpens(): Promise<OpenPaths>;
  /** Subscribes to paths opened later (drop, second launch). Returns an unsubscribe function. */
  onOpenPaths(handler: (paths: OpenPaths) => void): Promise<() => void>;

  log(level: "error" | "warn" | "info" | "debug", category: string, message: string): void;
  exportLogs(): Promise<string | null>;
}

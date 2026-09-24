import type {
  AppInfo, DirEntry, FileContent, LineEnding, RecentEntry, RecoverySnapshot,
} from "../types";

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
  /** Returns a data: URL for a local image referenced by a document. */
  readImage(path: string): Promise<string>;
  openExternal(url: string): Promise<void>;

  loadSettings(): Promise<unknown>;
  saveSettings(settings: unknown): Promise<void>;
  loadRecovery(): Promise<RecoverySnapshot | null>;
  saveRecovery(snapshot: RecoverySnapshot): Promise<void>;
  clearRecovery(): Promise<void>;

  log(level: "error" | "warn" | "info" | "debug", category: string, message: string): void;
  exportLogs(): Promise<string | null>;
}

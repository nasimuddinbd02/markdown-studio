import type { Backend } from "./backend";
import { tauriBackend } from "./tauriBackend";
import { createDemoBackend } from "./memoryBackend";

export const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

let current: Backend | null = null;

/** Returns the active backend: native Tauri commands, or the browser demo. */
export function backend(): Backend {
  if (!current) current = isTauri ? tauriBackend : createDemoBackend();
  return current;
}

/** Test hook to inject a backend. */
export function setBackend(b: Backend) {
  current = b;
}

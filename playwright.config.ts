import { defineConfig } from "@playwright/test";

/**
 * End-to-end tests (SRS §17.1) run against the browser demo build of the UI,
 * which uses the in-memory backend. Locally they use the installed Microsoft
 * Edge (no browser download); in CI set PW_CHANNEL= (empty) to use Playwright's
 * bundled Chromium.
 */
const channel = process.env.PW_CHANNEL ?? (process.platform === "win32" ? "msedge" : undefined);

export default defineConfig({
  testDir: "e2e",
  timeout: 30_000,
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:1420",
    channel: channel || undefined,
    viewport: { width: 1280, height: 800 },
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:1420",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});

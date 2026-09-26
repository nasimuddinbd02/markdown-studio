import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

/** Website screenshots (npm run docs:screenshots); not part of the e2e suite. */
export default defineConfig({
  ...base,
  testDir: "website/scripts",
  testMatch: "screenshots.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
});

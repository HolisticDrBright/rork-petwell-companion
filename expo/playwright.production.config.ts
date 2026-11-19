import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e/production", testMatch: /.*\.production\.ts/,
  workers: 1, retries: 0, timeout: 60_000, expect: { timeout: 15_000 }, reporter: [["list"]],
  use: { baseURL: "http://localhost:8100", screenshot: "only-on-failure", trace: "retain-on-failure", launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {} },
  webServer: { command: "node e2e/serve.mjs dist-production 8100", url: "http://localhost:8100", timeout: 60_000, reuseExistingServer: true },
});

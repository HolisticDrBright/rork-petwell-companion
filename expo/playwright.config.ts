import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end smoke test against the real web export (`expo export --platform web`).
 *
 * Run it with:
 *   bun run e2e            # builds the export, serves it, runs the smoke test
 *
 * The app runs in development data mode so it uses local (AsyncStorage/
 * localStorage) persistence and needs no Supabase project — the point of this
 * suite is that the core journey renders and advances, not that the backend
 * works. Backend behaviour is covered by the RLS checklist and the unit suites.
 *
 * PLAYWRIGHT_CHROMIUM_PATH lets an environment with a pre-installed browser
 * (and no download permission) point at it; CI installs its own and leaves the
 * variable unset.
 */
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined;
const PORT = Number(process.env.E2E_PORT ?? 8099);

export default defineConfig({
  testDir: "./e2e",
  testMatch: /.*\.spec\.ts/,
  // A smoke test that needs a retry is telling you something; let it say so.
  retries: 0,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: executablePath ? { executablePath } : {},
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `node e2e/serve.mjs dist-web ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
    timeout: 60_000,
  },
});

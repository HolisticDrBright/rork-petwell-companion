import { expect, test, type Page } from "@playwright/test";

/**
 * End-to-end smoke test: does the app actually boot and carry someone through
 * the core journey in a real browser?
 *
 *   onboarding → add a pet → log a symptom → read a food label → vet report
 *
 * Every unit suite in this repo can pass on a build that white-screens on
 * launch. This is the test that catches that.
 *
 * It runs against the web export built with EXPO_PUBLIC_APP_ENV=development, so
 * the app is in local (device-storage) mode with demo pets and no Supabase
 * project. Backend behaviour is covered elsewhere (RLS checklist, unit suites);
 * what's being proven here is that the screens render, the router advances, and
 * user input survives a save.
 */

/** Requests that would otherwise hang the run; none is needed by these flows. */
async function blockOffsiteRequests(page: Page): Promise<void> {
  await page.route("**/placeholder.supabase.co/**", (r) => r.abort());
  await page.route("**/images.unsplash.com/**", (r) => r.abort());
  await page.route("**/world.openpetfoodfacts.org/**", (r) => r.abort());
}

/** Fail loudly on an uncaught exception — a silent white screen is the bug. */
function failOnPageError(page: Page, errors: string[]): void {
  page.on("pageerror", (e) => errors.push(String(e)));
}

test.describe("core journey", () => {
  test("a new user can onboard, add a pet, log a symptom, read a label and open a vet report", async ({
    page,
  }) => {
    const errors: string[] = [];
    failOnPageError(page, errors);
    await blockOffsiteRequests(page);

    // ── 1. First launch lands on onboarding ──────────────────────────────────
    await page.goto("/");
    await expect(page).toHaveURL(/\/onboarding$/, { timeout: 30_000 });
    await expect(page.getByText("Your pet's health, finally in one place.")).toBeVisible();

    // One button, three steps: "Get started" → "Continue" → "Add my first pet".
    const cta = page.getByTestId("onboarding-cta");
    await expect(cta).toHaveAttribute("aria-label", "Get started");
    await cta.click();
    await expect(cta).toHaveAttribute("aria-label", "Continue");
    await cta.click();
    await expect(cta).toHaveAttribute("aria-label", "Add my first pet");
    await cta.click();

    // ── 2. The app opens on Today ────────────────────────────────────────────
    await expect(page).toHaveURL(/localhost:\d+\/$/, { timeout: 30_000 });
    await expect(page.getByTestId("pet-switcher")).toBeVisible({ timeout: 30_000 });
    // Onboarding is remembered, not re-shown on the next launch.
    expect(await page.evaluate(() => window.localStorage.getItem("petwell.onboarded.v1"))).toBe("true");

    // ── 3. Add a pet, and see it selected ────────────────────────────────────
    await page.getByTestId("pet-switcher").click();
    await page.getByTestId("pet-switcher-add").click();
    await expect(page).toHaveURL(/\/add-pet$/);

    await page.getByLabel("Name", { exact: true }).fill("Scout");
    await page.getByLabel("Breed / mix", { exact: true }).fill("Border Collie");
    await page.getByLabel("Age (years)", { exact: true }).fill("4");
    await page.getByLabel("Weight (lb)", { exact: true }).fill("38");
    await page.getByTestId("add-pet-save").click();

    // The new pet becomes the selected one, so its name shows in the switcher.
    await expect(page.getByTestId("pet-switcher")).toContainText("Scout", { timeout: 20_000 });

    // ── 4. Log a symptom; it lands on the timeline ───────────────────────────
    await page.goto("/log");
    await page.getByTestId("log-kind-symptom").click();
    const symptom = page.getByTestId("log-symptom-input");
    await expect(symptom).toBeVisible();
    await symptom.fill("Scratching at right ear since this morning");
    await page.getByTestId("log-save").click();

    await expect(page).toHaveURL(/\/timeline$/, { timeout: 20_000 });
    await expect(page.getByText("Scratching at right ear since this morning").first()).toBeVisible({
      timeout: 20_000,
    });

    // ── 5. Read a pasted food label ──────────────────────────────────────────
    // Paste is the path that works without a backend; it must still answer with
    // a clear status rather than failing silently.
    await page.goto("/food-scan");
    await page.getByTestId("food-mode-paste").click();
    await page
      .getByTestId("food-label-input")
      .fill("Ingredients: Deboned Chicken, Peas, Chicken Fat, Salmon Oil\nCrude Protein (min) 26%");
    await page.getByTestId("food-analyze").click();
    await expect(page.getByTestId("food-status")).toBeVisible({ timeout: 30_000 });
    // Never a purity claim from a label read — the copy says what it can't know.
    await expect(page.getByTestId("food-status")).not.toContainText(/cleanest|safest|verified clean/i);

    // ── 6. The vet report compiles ───────────────────────────────────────────
    await page.goto("/vet-report");
    await expect(page.getByText("Concern summary").first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Questions to ask the vet").first()).toBeVisible();
    // Export is free — the promise the store listing makes.
    await expect(page.getByText(/Export is always free/i).first()).toBeVisible();

    expect(errors, `uncaught page errors:\n${errors.join("\n")}`).toEqual([]);
  });

  test("the toxin lookup works and always shows a poison-control hotline", async ({ page }) => {
    // The one screen that matters most when someone is panicking. It must render
    // from bundled data, with the hotline in reach, with no backend at all.
    const errors: string[] = [];
    failOnPageError(page, errors);
    await blockOffsiteRequests(page);
    await page.addInitScript(() => {
      try {
        window.localStorage.setItem("petwell.onboarded.v1", "true");
      } catch {
        /* ignore */
      }
    });

    await page.goto("/toxins");
    await expect(page.getByText(/Animal Poison Control/i).first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("(888) 426-4435").first()).toBeVisible();

    const search = page.getByPlaceholder(/search/i).first();
    await search.fill("chocolate");
    await expect(page.getByText(/chocolate/i).first()).toBeVisible({ timeout: 15_000 });

    // A miss must never read as "safe".
    await search.fill("zzzzznotathing");
    await expect(page.getByText(/does NOT mean it's safe/i).first()).toBeVisible({ timeout: 15_000 });

    expect(errors, `uncaught page errors:\n${errors.join("\n")}`).toEqual([]);
  });
});

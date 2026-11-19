import { expect, test } from "@playwright/test";

test("failed device saves retain inputs and allow retry; a fresh pet has no invented score", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.addInitScript(() => {
    localStorage.setItem("petwell.onboarded.v1", "true");
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
      if (key === "petwell.state.v1" && localStorage.getItem("test.fail-save") === "true") throw new Error("Storage full");
      return original.call(this, key, value);
    };
    localStorage.setItem("test.fail-save", "true");
  });
  await page.goto("/add-pet");
  await page.getByLabel("Name", { exact: true }).fill("Evidence Test");
  await page.getByTestId("add-pet-save").click();
  await expect(page.getByText(/Couldn't save|Couldn’t save/)).toBeVisible();
  await expect(page.getByLabel("Name", { exact: true })).toHaveValue("Evidence Test");
  await expect(page).toHaveURL(/add-pet$/);
  await page.evaluate(() => localStorage.setItem("test.fail-save", "false"));
  await page.getByTestId("add-pet-save").click();
  await expect(page.getByTestId("pet-switcher")).toContainText("Evidence Test");
  await page.goto("/health-score");
  await expect(page.getByText("Not enough data", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("0 of 8 systems have recent log data.")).toBeVisible();
  await page.goto("/log");
  await page.getByTestId("log-kind-symptom").click();
  await page.getByTestId("log-symptom-input").fill("Retry this symptom");
  await page.getByTestId("log-save").click();
  await expect(page.getByText(/Couldn’t save. Your entry is still here/)).toBeVisible();
  await expect(page.getByTestId("log-symptom-input")).toHaveValue("Retry this symptom");
  await page.evaluate(() => localStorage.setItem("test.fail-save", "false"));
  await page.getByTestId("log-save").click();
  await expect(page).toHaveURL(/timeline$/);
  expect(errors).toEqual([]);
});

test("Pro makes no unsupported sales promise and invalid reset links cannot change a password", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("petwell.onboarded.v1", "true"));
  await page.goto("/premium");
  await expect(page.getByText("Pro plans are not available yet")).toBeVisible();
  await expect(page.getByText(/Unlimited scans|wearable integrations|Choose a plan/)).toHaveCount(0);
  await page.goto("/reset-password");
  await expect(page.getByText(/Open the reset link from your email/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Update password" })).toHaveCount(0);
});

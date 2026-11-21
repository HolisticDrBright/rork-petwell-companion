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
  await expect(page.getByText("0 of 7 trackable systems contributed.")).toBeVisible();
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

test("the chat composer and reminder dialog work with a short viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 740 });
  await page.addInitScript(() => localStorage.setItem("petwell.onboarded.v1", "true"));
  await page.goto("/ai-assistant");
  const message = page.getByPlaceholder("Ask about your pet…");
  await message.fill("Draft question for the veterinarian");
  await page.setViewportSize({ width: 390, height: 360 });
  await expect(message).toBeInViewport({ ratio: 1 });
  await expect(message).toHaveValue("Draft question for the veterinarian");
  await expect(page.getByRole("button", { name: "Send message" })).toBeInViewport({ ratio: 1 });

  await page.setViewportSize({ width: 390, height: 740 });
  await page.goto("/add-pet");
  await page.getByLabel("Name", { exact: true }).fill("Scout");
  await page.getByTestId("add-pet-save").click();
  await expect(page.getByTestId("pet-switcher")).toContainText("Scout");
  await page.goto("/reminders");
  await page.getByText("Add a reminder", { exact: true }).click();
  await page.getByPlaceholder(/What to remember/).fill("Evening walk");
  await page.setViewportSize({ width: 390, height: 300 });
  const time = page.getByPlaceholder(/Time \(e.g./);
  await time.fill("8:00p");
  await expect(time).toBeInViewport({ ratio: 1 });
  await page.getByRole("button", { name: "Add reminder" }).click();
  await expect(page.getByText("Evening walk", { exact: true })).toBeVisible();
});

test("a completed vet visit can be logged with its actual date and notes", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 740 });
  await page.addInitScript(() => localStorage.setItem("petwell.onboarded.v1", "true"));
  await page.goto("/add-pet");
  await page.getByLabel("Name", { exact: true }).fill("Scout");
  await page.getByTestId("add-pet-save").click();
  await expect(page.getByTestId("pet-switcher")).toContainText("Scout");
  await page.goto("/timeline");
  await page.getByTestId("timeline-add-log").click();
  const vet = page.getByRole("radio", { name: "Vet visit", exact: true });
  await expect(vet).toBeInViewport({ ratio: 1 });
  await vet.click();
  await page.getByRole("textbox", { name: "Reason for visit" }).fill("Annual checkup");
  await page.getByRole("textbox", { name: "Vet or clinic" }).fill("Greenfield Animal Hospital");
  await page.getByRole("textbox", { name: "Notes" }).fill("Recheck in six months");
  const date = page.getByRole("textbox", { name: "Visit date" });
  await date.fill("2025-02-30");
  await page.getByRole("button", { name: "Save vet visit" }).click();
  await expect(page.getByText("Enter a real date using YYYY-MM-DD.")).toBeVisible();
  await date.fill("2025-02-28");
  await page.getByRole("button", { name: "Save vet visit" }).click();
  await expect(page).toHaveURL(/timeline$/);
  await page.reload();
  await page.getByText("Vet visits", { exact: true }).click();
  await expect(page.getByText("Vet visit: Annual checkup")).toBeVisible();
  await expect(page.getByText("February 28", { exact: true })).toBeVisible();
  await expect(page.getByText("Greenfield Animal Hospital · Recheck in six months")).toBeVisible();
});

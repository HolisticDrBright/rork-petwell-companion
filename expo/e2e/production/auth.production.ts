import { expect, test } from "@playwright/test";

test("production can sign in without anonymous auth and retains a failed cloud save", async ({ page }) => {
  let anonymousCalls = 0;
  let failSave = true;
  const pets: Record<string, unknown>[] = [];
  const user = { id: "f0000000-0000-4000-8000-000000000001", email: "test@example.invalid", aud: "authenticated", role: "authenticated", email_confirmed_at: new Date().toISOString(), app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() };
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.addInitScript(() => localStorage.setItem("petwell.onboarded.v1", "true"));
  await page.route("https://petwell-test.supabase.co/**", async route => {
    const url = new URL(route.request().url());
    let body: unknown = [];
    let status = 200;
    if (url.pathname === "/auth/v1/signup") { anonymousCalls++; status = 422; body = { msg: "Anonymous sign-ins disabled" }; }
    else if (url.pathname === "/auth/v1/token") body = { access_token: "test-session-token", token_type: "bearer", expires_in: 3600, refresh_token: "test-refresh", user };
    else if (url.pathname === "/auth/v1/user") body = user;
    else if (url.pathname === "/rest/v1/pet_profiles") body = pets;
    else if (url.pathname === "/rest/v1/rpc/create_pet_with_conditions") {
      if (failSave) { status = 503; body = { message: "Database unavailable" }; }
      else {
        const input = route.request().postDataJSON().input;
        body = { id: "f0000000-0000-4000-8000-000000000002", owner_id: user.id, name: input.name, species: input.species, age_years: 2, weight_lb: 20, status: "stable", status_note: "New", pet_conditions: [], pet_allergies: [] };
        pets.push(body as Record<string, unknown>);
      }
    } else if (url.pathname === "/rest/v1/profiles") body = {};
    await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Sign in or create account" }).click();
  await page.getByPlaceholder("you@example.com").fill(user.email);
  await page.getByPlaceholder("Password", { exact: true }).fill("test-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).last().click();
  await expect(page.getByRole("button", { name: /Add.*pet/i }).first()).toBeVisible();
  expect(anonymousCalls).toBe(0);
  await page.getByRole("button", { name: /Add.*pet/i }).first().click();
  await page.getByLabel("Name", { exact: true }).fill("Cloud Pet");
  await page.getByTestId("add-pet-save").click();
  await expect(page.getByText(/Couldn’t save your pet/)).toBeVisible();
  await expect(page.getByLabel("Name", { exact: true })).toHaveValue("Cloud Pet");
  failSave = false;
  await page.getByTestId("add-pet-save").click();
  await expect(page.getByTestId("pet-switcher").filter({ visible: true }).first()).toContainText("Cloud Pet");
  await page.reload();
  await expect(page.getByTestId("pet-switcher").filter({ visible: true }).first()).toContainText("Cloud Pet");
  await page.goto("/account");
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page.getByRole("button", { name: "Sign in or create account" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("production exposes recovery and preserves the reset form on delivery failure", async ({ page }) => {
  await page.route("https://petwell-test.supabase.co/**", route => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ msg: "Email service unavailable" }) }));
  await page.goto("/account");
  await page.getByRole("button", { name: "Forgot password?" }).click();
  await page.getByPlaceholder("you@example.com").fill("test@example.invalid");
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByText("Could not send a reset email. Please try again in a moment.", { exact: true })).toBeVisible();
  await expect(page.getByPlaceholder("you@example.com")).toHaveValue("test@example.invalid");
  await expect(page.getByRole("button", { name: "Send reset link" })).toBeEnabled();
});

import { expect, test } from "@playwright/test";

test("production can sign in without anonymous auth and retains a failed cloud save", async ({ page }) => {
  let anonymousCalls = 0;
  let failSave = true;
  let uploads = 0;
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
    else if (url.pathname.startsWith("/storage/v1/object/sign/pet-photos/")) {
      body = { signedURL: "/object/pet-photos/profile.jpg" };
    } else if (url.pathname.startsWith("/storage/v1/object/pet-photos/") && route.request().method() === "POST") {
      uploads++;
      body = { Key: url.pathname.slice("/storage/v1/object/".length) };
    } else if (url.pathname === "/storage/v1/object/pet-photos/profile.jpg") {
      return route.fulfill({ path: "assets/images/icon.png" });
    }
    else if (url.pathname === "/rest/v1/rpc/create_pet_with_conditions") {
      if (failSave) { status = 503; body = { message: "Database unavailable" }; }
      else {
        const input = route.request().postDataJSON().input;
        expect(input.photo).toMatch(new RegExp(`^${user.id}/profile-.*\\.jpg$`));
        body = { id: "f0000000-0000-4000-8000-000000000002", owner_id: user.id, name: input.name, species: input.species, photo_url: input.photo, age_years: 2, weight_lb: 20, status: "stable", status_note: "New", pet_conditions: [], pet_allergies: [] };
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
  const [picker] = await Promise.all([
    page.waitForEvent("filechooser"),
    page.getByRole("button", { name: "Add a pet photo" }).click(),
  ]);
  await picker.setFiles("assets/images/icon.png");
  await expect(page.getByRole("button", { name: "Change pet photo" })).toBeVisible();
  await page.getByTestId("add-pet-save").click();
  await expect(page.getByText(/Couldn’t save your pet/)).toBeVisible();
  await expect(page.getByLabel("Name", { exact: true })).toHaveValue("Cloud Pet");
  failSave = false;
  await page.getByTestId("add-pet-save").click();
  await expect(page.getByTestId("pet-switcher").filter({ visible: true }).first()).toContainText("Cloud Pet");
  expect(uploads).toBe(1);
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

test("signup and unconfirmed sign-in both offer to resend confirmation", async ({ page }) => {
  const email = "test@example.invalid";
  let resendCount = 0;
  await page.route("https://petwell-test.supabase.co/auth/v1/**", async route => {
    const path = new URL(route.request().url()).pathname;
    const contentType = "application/json";
    if (path === "/auth/v1/token") {
      return route.fulfill({
        status: 400,
        contentType,
        headers: { "x-supabase-api-version": "2024-01-01", "access-control-expose-headers": "x-supabase-api-version" },
        json: { code: "email_not_confirmed", msg: "Email not confirmed" },
      });
    }
    if (path === "/auth/v1/signup") {
      return route.fulfill({ status: 200, contentType, json: { id: "signup-test", email } });
    }
    if (path === "/auth/v1/resend") {
      expect(route.request().postDataJSON()).toMatchObject({ type: "signup", email });
      resendCount++;
    }
    await route.fulfill({ status: 200, contentType, json: {} });
  });

  await page.goto("/account");
  const resend = page.getByRole("button", { name: "Resend confirmation email" });
  await expect(resend).toHaveCount(0);
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await page.getByPlaceholder("you@example.com").fill(email);
  await page.getByPlaceholder("At least 8 characters").fill("test-password");
  await page.getByRole("button", { name: "Create account", exact: true }).last().click();
  await expect(resend).toBeVisible();
  await expect(page.getByPlaceholder("At least 8 characters")).toHaveValue("");
  await resend.click();
  await expect(page.getByText(/Petwell will send another email/)).toBeVisible();

  await page.reload();
  await page.getByPlaceholder("you@example.com").fill(email);
  await page.getByPlaceholder("Password", { exact: true }).fill("test-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).last().click();
  await expect(page.getByRole("alert")).toHaveText("Confirm your email before signing in.");
  await resend.click();
  await expect(page.getByText(/Petwell will send another email/)).toBeVisible();
  expect(resendCount).toBe(2);

  await page.getByPlaceholder("you@example.com").fill("other@example.invalid");
  await expect(resend).toHaveCount(0);
});

test("a veterinarian can see an active visit link while signed out", async ({ page }) => {
  const token = "a".repeat(64);
  let active = true;
  let lookups = 0;
  await page.route("https://petwell-test.supabase.co/**", async route => {
    const path = new URL(route.request().url()).pathname;
    let data: unknown = [];
    if (path === "/rest/v1/rpc/get_vet_visit_package") {
      lookups++;
      expect(route.request().postDataJSON()).toEqual({ p_token: token });
      data = active ? {
        version: 1,
        report: {
          generatedAt: "2026-11-19", pet: { name: "Ginger", species: "cat", breed: "", ageYears: 3, sex: "", weightLb: 9, photo: "", status: "", statusNote: "" },
          allergies: [], conditions: [], concernSummary: null, triage: null, redFlagsPresent: [], redFlagsAbsent: [],
          scans: [], foodChanges: [], medications: [], timeline: [{ date: "2026-11-19", title: "Recent symptom", category: "symptom" }],
          loggingSummary: null, questions: [],
        },
        photos: [], citations: [], score_history: [], schedules: [], weight_history: [],
      } : null;
    }
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(data) });
  });
  await page.goto(`/vet-visit-share#${token}`);
  await expect(page.getByText("Ginger’s vet visit summary")).toBeVisible();
  await expect(page.getByText(/Recent symptom/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Open PDF export" })).toBeVisible();
  active = false;
  await page.reload();
  await expect(page.getByText("This link is invalid, expired, or revoked.")).toBeVisible();
  await expect(page.getByText("Ginger’s vet visit summary")).toHaveCount(0);
  expect(lookups).toBe(2);
});

import { expect, test } from "@playwright/test";

test("photo settings preserve the scan and Guided Check saves multiple answers", async ({ page, baseURL }) => {
  const user = {
    id: "f0000000-0000-4000-8000-000000000001",
    email: "test@example.invalid",
    aud: "authenticated",
    role: "authenticated",
    email_confirmed_at: new Date().toISOString(),
    app_metadata: {},
    user_metadata: {},
    created_at: new Date().toISOString(),
  };
  const pet = {
    id: "f0000000-0000-4000-8000-000000000002",
    owner_id: user.id,
    name: "Scout",
    species: "dog",
    age_years: 3,
    weight_lb: 20,
    status: "stable",
    pet_conditions: [],
    pet_allergies: [],
  };
  let storePhotos = false;
  let uploads = 0;
  let photoReads = 0;
  let savedAnswers: { question_id: string; answer_id: string }[] = [];
  await page.addInitScript(() => localStorage.setItem("petwell.onboarded.v1", "true"));
  await page.route("**/fixture-photo.png", (route) => route.fulfill({ path: "assets/images/icon.png" }));
  await page.route("https://petwell-test.supabase.co/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    let body: unknown = [];
    if (path === "/auth/v1/token") {
      body = { access_token: "test-session-token", token_type: "bearer", expires_in: 3600, refresh_token: "test-refresh", user };
    } else if (path === "/auth/v1/user") {
      body = user;
    } else if (path === "/rest/v1/pet_profiles") {
      body = [pet];
    } else if (path === "/rest/v1/profiles") {
      if (request.method() === "PATCH") storePhotos = request.postDataJSON().store_photos;
      body = { id: user.id, store_photos: storePhotos };
    } else if (path.startsWith("/storage/v1/object/documents/") && request.method() === "POST") {
      uploads++;
      body = { Key: path.slice("/storage/v1/object/".length) };
    } else if (path === "/functions/v1/ai-vision-symptom") {
      photoReads++;
      body = { ok: true, data: {
        area: "ear", quality: "clear", summary: "The visible ear looks red.",
        observations: [], observedRedFlags: [],
      } };
    } else if (path === "/rest/v1/symptom_answers") {
      savedAnswers = request.postDataJSON();
    } else if (path === "/rest/v1/symptom_sessions" || path === "/rest/v1/triage_results") {
      body = { id: "f0000000-0000-4000-8000-000000000003" };
    }
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(body) });
  });

  await page.goto("/account");
  await page.getByPlaceholder("you@example.com").fill(user.email);
  await page.getByPlaceholder("Password", { exact: true }).fill("test-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).last().click();
  await expect(page.getByTestId("pet-switcher").filter({ visible: true }).first()).toContainText("Scout");
  const photo = `${baseURL}/fixture-photo.png`;
  await page.goto(`/scan-result?type=ear&photo=${encodeURIComponent(photo)}`);
  const read = page.getByRole("button", { name: "Read this photo with AI, observations only" });
  await read.click();
  await expect(page.getByText("Turn on Enable AI features in Settings & privacy.")).toBeVisible();
  await page.getByRole("link", { name: "Open photo settings" }).click();
  await expect(page.getByText("Set up AI photo reading")).toBeVisible();
  const ai = page.getByRole("switch", { name: "Enable AI features" });
  const docs = page.getByRole("switch", { name: "Allow AI to process my documents" });
  const cloud = page.getByRole("switch", { name: "Store scan photos in the cloud" });
  await expect(docs).toBeDisabled();
  await ai.click();
  await expect(ai).toBeChecked();
  await docs.click();
  await expect(docs).toBeChecked();
  await page.getByRole("button", { name: "Back to photo" }).click();
  await expect(read).toBeVisible();
  await read.click();
  await expect(page.getByText("Turn on Store scan photos in the cloud to read this photo.")).toBeVisible();
  await page.getByRole("link", { name: "Open photo settings" }).click();
  await expect(cloud).not.toBeChecked();
  await cloud.click();
  await expect(cloud).toBeChecked();
  await page.getByRole("button", { name: "Back to photo" }).click();
  expect(uploads).toBe(0);
  expect(photoReads).toBe(0);
  await read.click();
  await expect(page.getByText("The visible ear looks red.")).toBeVisible();
  expect(uploads).toBe(1);
  expect(photoReads).toBe(1);

  await page.getByRole("button", { name: "Continue to guided check" }).click();
  await page.getByTestId("ask-opt-none").click();
  await page.getByTestId("ask-opt-no").click();
  await expect(page.getByText("Select all that apply, then tap Continue.")).toBeVisible();
  const shaking = page.getByRole("checkbox", { name: "Head shaking / scratching" });
  const odor = page.getByRole("checkbox", { name: "Odor or discharge" });
  await shaking.click();
  await odor.click();
  await expect(shaking).toBeChecked();
  await expect(odor).toBeChecked();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByTestId("ask-back").click();
  await expect(shaking).toBeChecked();
  await expect(odor).toBeChecked();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByTestId("ask-opt-one").click();
  const neither = page.getByRole("checkbox", { name: "Neither" });
  await neither.click();
  await page.getByTestId("ask-opt-water").click();
  await expect(neither).not.toBeChecked();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page).toHaveURL(/triage-result$/);
  await expect.poll(() => savedAnswers.filter((a) => a.question_id === "signs").map((a) => a.answer_id))
    .toEqual(["shake", "odor"]);
});

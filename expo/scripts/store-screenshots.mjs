/**
 * Store screenshots, generated from the real app rather than a mockup tool.
 *
 *   bun run screenshots           # expects the web export + server (see below)
 *
 * Full run from a clean tree:
 *   bun run e2e:build             # expo export --platform web → dist-web
 *   node e2e/serve.mjs dist-web 8099 &
 *   node scripts/store-screenshots.mjs
 *
 * Output: docs/store-screenshots/<device>/<screen>.png, at the exact pixel
 * dimensions App Store Connect and Play Console accept.
 *
 * It also reads the text of every captured screen and FAILS on marketing
 * language we've committed not to use — "cleanest", "safest", any claim of
 * diagnosis — and on demo scaffolding ("(sample)") that must never appear in a
 * store listing. A screenshot is a public claim about the product; this is the
 * same standard the evidence copy is held to in the unit tests.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { chromium } from "@playwright/test";

const BASE = process.env.SCREENSHOT_BASE_URL ?? "http://localhost:8099";
const OUT = join(process.cwd(), "..", "docs", "store-screenshots");
const EXECUTABLE = process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined;

/**
 * Apple requires 6.9"/6.5"/5.5" iPhone and 12.9" iPad sets; the others are
 * accepted sizes that scale cleanly. Android takes any 16:9-ish phone shot plus
 * a tablet. viewport × scale = the delivered pixel size.
 */
const DEVICES = [
  { id: "ios-6.9-1320x2868", viewport: { width: 440, height: 956 }, scale: 3 },
  { id: "ios-6.7-1290x2796", viewport: { width: 430, height: 932 }, scale: 3 },
  { id: "ios-6.5-1242x2688", viewport: { width: 414, height: 896 }, scale: 3 },
  { id: "ios-6.1-1179x2556", viewport: { width: 393, height: 852 }, scale: 3 },
  { id: "ios-5.5-1242x2208", viewport: { width: 414, height: 736 }, scale: 3 },
  { id: "ipad-12.9-2048x2732", viewport: { width: 1024, height: 1366 }, scale: 2 },
  { id: "android-phone-1080x1920", viewport: { width: 360, height: 640 }, scale: 3 },
  { id: "android-tablet-1600x2560", viewport: { width: 800, height: 1280 }, scale: 2 },
];

/** The journey a reviewer should see, in the order it tells the story. */
const SCREENS = [
  { id: "1-today", path: "/" },
  { id: "2-timeline", path: "/timeline" },
  { id: "3-health-score", path: "/health-score" },
  { id: "4-food-scan", path: "/food-scan" },
  { id: "5-toxins", path: "/toxins" },
  { id: "6-patterns", path: "/patterns" },
];

// Claims we don't make. Kept in sync with the copy rules the unit tests enforce.
const BANNED = [
  { re: /\bcleanest\b/gi, why: "purity superlative" },
  { re: /\bsafest\b/gi, why: "safety superlative" },
  { re: /\bpurest\b/gi, why: "purity superlative" },
  { re: /\bverified clean\b/gi, why: "unsupported verification claim" },
  { re: /\(sample\)/gi, why: "demo scaffolding in a store asset" },
  { re: /\blorem ipsum\b/gi, why: "placeholder text" },
  // "Diagnosis" needs context, not a keyword ban: the app says "not a
  // diagnosis" and "AI never diagnoses" constantly, and that copy is the point.
  // Only an unqualified use is a problem, so a match is cleared when the text
  // just before it negates it or defers to a vet.
  {
    re: /\bdiagnos(is|e|es|ed|ing)\b/gi,
    why: "Petwell does not diagnose — this use isn't negated or deferred to a vet",
    allowBefore: /\b(not|never|isn't|doesn't|don't|can't|cannot|without|no|nor|instead of|rather than|if|when|under|already|been|vet|veterinarian|veterinary)\b[^.!?]{0,70}$/i,
  },
];

/** Every banned-copy hit in `text`, with its surrounding sentence for triage. */
function copyProblems(text) {
  const found = [];
  for (const { re, why, allowBefore } of BANNED) {
    for (const m of text.matchAll(re)) {
      const idx = m.index ?? 0;
      const before = text.slice(Math.max(0, idx - 90), idx);
      if (allowBefore && allowBefore.test(before)) continue;
      const context = text.slice(Math.max(0, idx - 50), idx + m[0].length + 40).replace(/\s+/g, " ");
      found.push({ match: m[0], why, context });
    }
  }
  return found;
}

async function main() {
  const browser = await chromium.launch(EXECUTABLE ? { executablePath: EXECUTABLE } : {});
  const problems = [];
  const written = [];

  for (const device of DEVICES) {
    const context = await browser.newContext({
      viewport: device.viewport,
      deviceScaleFactor: device.scale,
      isMobile: device.id.startsWith("ios") || device.id.startsWith("android"),
      hasTouch: true,
    });
    // Skip onboarding so the shots show the app itself. Demo pets come from the
    // development data mode, which is also what keeps these assets free of any
    // real pet's health information.
    await context.addInitScript(() => {
      try {
        window.localStorage.setItem("petwell.onboarded.v1", "true");
      } catch {
        /* private mode — the shot just starts at onboarding */
      }
    });

    const dir = join(OUT, device.id);
    await mkdir(dir, { recursive: true });
    const page = await context.newPage();

    for (const screen of SCREENS) {
      await page.goto(`${BASE}${screen.path}`, { waitUntil: "networkidle" });
      // Let fonts, charts and the router settle before capturing.
      await page.waitForTimeout(1500);

      const file = join(dir, `${screen.id}.png`);
      await page.screenshot({ path: file });
      written.push(`${device.id}/${screen.id}.png`);

      const text = await page.locator("body").innerText();
      for (const p of copyProblems(text)) {
        problems.push(`${device.id}/${screen.id}: "${p.match}" — ${p.why}\n      …${p.context}…`);
      }
    }
    await context.close();
  }
  await browser.close();

  const summary = [
    `Generated ${written.length} screenshots across ${DEVICES.length} device sizes.`,
    "",
    ...DEVICES.map((d) => `  ${d.id}: ${d.viewport.width * d.scale}×${d.viewport.height * d.scale}`),
  ].join("\n");
  console.log(summary);
  await writeFile(join(OUT, "MANIFEST.txt"), `${summary}\n\nFiles:\n${written.map((w) => `  ${w}`).join("\n")}\n`);

  if (problems.length) {
    console.error("\nFAIL — copy that must not appear in a store asset:");
    for (const p of problems) console.error(`  ${p}`);
    process.exit(1);
  }
  console.log("\nCopy check: no superlatives, diagnosis language, or demo scaffolding in any captured screen.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

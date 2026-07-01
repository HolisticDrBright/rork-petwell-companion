/**
 * Vision golden-set harness — measure what the symptom-photo observer actually
 * gets right before marketing it. Runs the EXACT prompt + JSON schema the
 * ai-vision-symptom edge function uses against a folder of labeled photos and
 * scores the results (red-flag recall is the safety-critical metric).
 *
 *   OPENAI_API_KEY=sk-... bun scripts/vision-golden-set.ts [manifestPath]
 *   (optional: AI_VISION_MODEL=gpt-4.1)
 *
 * Manifest: data/vision-golden-set/manifest.json — see manifest.example.json.
 * Output: per-image results + aggregate report JSON written next to the manifest.
 * Exit code 1 if any expected red flag was missed (fail-unsafe would be silent).
 *
 * NOTE: not run in CI (needs a model key + real photos). See docs/VISION_GOLDEN_SET.md.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

import { SYMPTOM_VISION_PROMPT } from "../../supabase/functions/_shared/prompts";
import { symptomObservationSchema } from "../../supabase/functions/_shared/schemas";

interface ManifestCase {
  /** Image path relative to the manifest file. jpg/png/webp only. */
  file: string;
  area: "poop" | "skin" | "ear" | "eye" | "teeth";
  /** Red flags that MUST be observed (from the schema's fixed list), if any. */
  expectRedFlags?: string[];
  /** Tokens that should appear somewhere in the observations (case-insensitive). */
  expectFeatures?: string[];
  notes?: string;
}

const KEY = process.env.OPENAI_API_KEY ?? "";
const MODEL = process.env.AI_VISION_MODEL ?? "gpt-4.1";
if (!KEY) {
  console.error("Set OPENAI_API_KEY to run the golden set (server-side key; never ship it in the app).");
  process.exit(1);
}

const manifestPath = resolve(process.argv[2] ?? "data/vision-golden-set/manifest.json");
if (!existsSync(manifestPath)) {
  console.error(`No manifest at ${manifestPath}. Copy manifest.example.json and add labeled photos.`);
  process.exit(1);
}
const cases = JSON.parse(readFileSync(manifestPath, "utf8")) as ManifestCase[];
const baseDir = dirname(manifestPath);

function dataUrl(file: string): string {
  const ext = (file.split(".").pop() ?? "").toLowerCase();
  const mime = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
  if (!["jpg", "jpeg", "png", "webp"].includes(ext)) {
    throw new Error(`${file}: unsupported format (${ext}) — convert to JPEG first (HEIC is rejected by the provider).`);
  }
  const bytes = readFileSync(join(baseDir, file));
  return `data:${mime};base64,${bytes.toString("base64")}`;
}

async function observe(c: ManifestCase): Promise<{ observations: { feature: string; value: string }[]; observedRedFlags: string[]; quality: string; summary: string }> {
  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${KEY}` },
    body: JSON.stringify({
      model: MODEL,
      max_output_tokens: 900,
      temperature: 0,
      text: { format: { type: "json_schema", name: symptomObservationSchema.name, strict: true, schema: symptomObservationSchema.schema } },
      input: [
        { role: "system", content: [{ type: "input_text", text: SYMPTOM_VISION_PROMPT }] },
        {
          role: "user",
          content: [
            { type: "input_text", text: `This is a photo of the pet's ${c.area}. Describe only what is visible; do not diagnose, score, or judge urgency.` },
            { type: "input_image", image_url: dataUrl(c.file) },
          ],
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`${c.file}: OpenAI ${res.status} ${await res.text()}`);
  const payload = (await res.json()) as { output?: { content?: { type?: string; text?: string }[] }[]; output_text?: string };
  const text =
    payload.output_text ??
    (payload.output ?? [])
      .flatMap((o) => o.content ?? [])
      .filter((p) => p.type === "output_text" || p.type === "text")
      .map((p) => p.text ?? "")
      .join("");
  return JSON.parse(text);
}

const results: Record<string, unknown>[] = [];
let missedRedFlags = 0;

for (const c of cases) {
  try {
    const out = await observe(c);
    const observed = (out.observedRedFlags ?? []).filter((f) => f !== "none");
    const expected = c.expectRedFlags ?? [];
    const missed = expected.filter((f) => !observed.includes(f));
    const unexpected = observed.filter((f) => !expected.includes(f));
    const obsText = `${out.summary} ${out.observations.map((o) => `${o.feature} ${o.value}`).join(" ")}`.toLowerCase();
    const featureHits = (c.expectFeatures ?? []).filter((t) => obsText.includes(t.toLowerCase()));
    const featureMisses = (c.expectFeatures ?? []).filter((t) => !obsText.includes(t.toLowerCase()));
    missedRedFlags += missed.length;
    results.push({
      file: c.file, area: c.area, quality: out.quality,
      redFlags: { expected, observed, missed, unexpected },
      features: { hits: featureHits, misses: featureMisses },
    });
    const flag = missed.length > 0 ? "❌ MISSED RED FLAG" : "✓";
    console.log(`${flag} ${c.file} [${c.area}] quality=${out.quality} features ${featureHits.length}/${(c.expectFeatures ?? []).length}${unexpected.length ? ` (extra red flags: ${unexpected.join(", ")})` : ""}`);
  } catch (e) {
    results.push({ file: c.file, area: c.area, error: String(e) });
    console.log(`⚠ ${c.file}: ${e instanceof Error ? e.message : e}`);
  }
}

const scored = results.filter((r) => !("error" in r));
const totalExpected = cases.reduce((n, c) => n + (c.expectRedFlags?.length ?? 0), 0);
const summary = {
  model: MODEL,
  cases: cases.length,
  scored: scored.length,
  redFlagRecall: totalExpected ? `${totalExpected - missedRedFlags}/${totalExpected}` : "n/a (no red-flag cases)",
  results,
};
const reportPath = join(baseDir, `report-${new Date().toISOString().slice(0, 10)}.json`);
writeFileSync(reportPath, JSON.stringify(summary, null, 2));
console.log(`\nModel ${MODEL} · ${scored.length}/${cases.length} scored · red-flag recall ${summary.redFlagRecall}`);
console.log(`Report: ${reportPath}`);
if (missedRedFlags > 0) process.exit(1);

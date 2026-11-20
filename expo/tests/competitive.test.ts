import assert from "node:assert/strict";
import sourceCatalog from "../../supabase/seed/vet-sources.json";
import { computeHealthScore } from "../lib/health/score";
import { SCHEDULE_TEMPLATES, scheduleTemplates } from "../lib/careScheduleRules";
import { triageReferences } from "../lib/triage/sources";
import { bytesToBase64, isEmbeddedPhoto, isVetVisitPackage, visitPackageHtml, type VetVisitPackage } from "../lib/report/visitPackage";
import { groundedReply, retrieveSources } from "../../supabase/functions/_shared/grounding";
import { normalizeExtraction } from "../../supabase/functions/_shared/record-fields";
import { assessInput, reviewOutput } from "../../supabase/functions/_shared/safety";

for (const species of ["cat", "dog"] as const) {
  assert.ok(scheduleTemplates(species, species === "cat" ? "Persian" : "Poodle", 0.5).some(template => template.kind === "grooming"));
  assert.ok(scheduleTemplates(species, "", 0.5).some(template => template.kind === "meal"));
  assert.ok(SCHEDULE_TEMPLATES[species]?.title, `${species} schedule template missing`);
  assert.ok(triageReferences("red", "difficulty breathing", species).length);
  const found = retrieveSources(sourceCatalog, "breathing vomiting emergency", species);
  assert.ok(found.length);
  assert.ok(found.every(source => source.species === species || source.species === "both"));
  const score = computeHealthScore({ name: species, species, weightLb: 9, ageYears: 3, conditions: [] }, [
    { date: "2026-11-19", title: "Stool", category: "stool", value: 3 },
    { date: "2026-11-19", title: "Activity", category: "activity", value: 7 },
  ], undefined, "2026-11-19");
  assert.equal(score.inputs.reduce((sum, factor) => sum + factor.contribution, 0), score.overall);
}
console.log("PASS dog and cat starter schedules, triage citations, retrieval, and score inputs");

const found = retrieveSources(sourceCatalog, "vomiting", "dog");
const validCitation = { source_id: found[0].id, quote_or_section: found[0].section };
const accept = (reply: string) => reviewOutput(reply).ok;
const attempts: boolean[] = [];
assert.equal(await groundedReply(found, async retry => {
  attempts.push(retry);
  return { reply: "Share your observations with your veterinarian.", citations: [] };
}, accept), null);
assert.deepEqual(attempts, [false, true]);
assert.equal(await groundedReply(found, async () => ({
  reply: "Share your observations with your veterinarian.",
  citations: [{ ...validCitation, source_id: "not-retrieved" }],
}), accept), null);
assert.equal(await groundedReply(found, async retry => ({
  reply: "Share your observations with your veterinarian.",
  citations: retry ? [validCitation] : [],
}), accept).then(result => result?.citations[0].url), found[0].url);
assert.equal(assessInput("difficulty breathing").routing, "emergency_vet");
console.log("PASS uncited and invalid chat responses are retried and rejected, citations use the retrieved URL");

assert.deepEqual(normalizeExtraction({ ocr_text: "example", fields: [
  { key: "vaccine_name", group: 1, value: " Rabies ", confidence: 1.2 },
  { key: "lab_value", group: 100, value: "10", confidence: 0.3 },
  { key: "diagnosis", group: 1, value: " ", confidence: 1 },
] }), { text: "example", fields: [{ key: "vaccine_name", group: 1, value: "Rabies", confidence: 1 }] });
console.log("PASS OCR proposals strip invalid fields and normalize confidence");

const img = "data:image/jpeg;base64," + bytesToBase64(Uint8Array.from([255, 216, 255]).buffer);
const visit: VetVisitPackage = {
  version: 1,
  report: {
    generatedAt: "2026-11-19", pet: { name: "Ginger", species: "cat", breed: "", ageYears: 3, sex: "", weightLb: 9, photo: "", status: "", statusNote: "" },
    allergies: [], conditions: [], concernSummary: null, triage: null, redFlagsPresent: [], redFlagsAbsent: [],
    scans: [], foodChanges: [], medications: [], timeline: [], loggingSummary: null, questions: [],
  },
  photos: [{ label: "<unsafe>", dataUrl: img }, { label: "Unsafe image", dataUrl: "data:image/svg+xml,<svg onload=alert(1)>" }],
  citations: triageReferences("red", "difficulty breathing", "cat"),
  score_history: [], schedules: [], weight_history: [],
};
const html = visitPackageHtml(visit);
assert.ok(isEmbeddedPhoto(img));
assert.equal(isVetVisitPackage(visit), false);
assert.equal(isVetVisitPackage({ ...visit, photos: visit.photos.slice(0, 1) }), true);
assert.equal(isVetVisitPackage({ ...visit, photos: [], version: 2 }), false);
assert.ok(html.includes(img) && html.includes("Cornell Feline Health Center"));
assert.ok(html.includes("&lt;unsafe&gt;") && !html.includes("onload=alert"));
console.log("PASS vet-visit print view embeds approved image formats and citations and escapes labels");

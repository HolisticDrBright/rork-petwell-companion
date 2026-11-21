import { buildReportHtml } from "@/lib/report/html";
import type { ReportData } from "@/lib/report/types";
import type { VetCitation } from "@/components/VetSources";

export interface VetVisitPackage {
  version: 1;
  report: ReportData;
  photos: { label: string; dataUrl: string }[];
  citations: VetCitation[];
  schedules: { title: string; kind: string; amount: string | null; dateTime: string; confirmed: boolean }[];
  score_history: { generated_at: string; overall: number }[];
  weight_history: { date: string; pounds: number }[];
}

export function isEmbeddedPhoto(value: unknown): value is string {
  return typeof value === "string" && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/i.test(value);
}

function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function rows(value: unknown, valid: (row: Record<string, unknown>) => boolean): boolean {
  return Array.isArray(value) && value.every(item => object(item) && valid(item));
}

export function isVetVisitPackage(value: unknown): value is VetVisitPackage {
  if (!object(value) || value.version !== 1 || !object(value.report) || !object(value.report.pet)) return false;
  const { report, photos, citations, schedules, score_history, weight_history } = value;
  return typeof report.generatedAt === "string" && typeof value.report.pet.name === "string" &&
    ["cat", "dog"].includes(String(value.report.pet.species)) &&
    ["allergies", "conditions", "redFlagsPresent", "redFlagsAbsent", "questions"].every(key =>
      Array.isArray(report[key]) && (report[key] as unknown[]).every(item => typeof item === "string")) &&
    ["scans", "foodChanges", "medications", "timeline"].every(key => rows(report[key], () => true)) &&
    (report.triage === null || (object(report.triage) && Array.isArray(report.triage.answers) && Array.isArray(report.triage.causes))) &&
    rows(photos, row => typeof row.label === "string" && isEmbeddedPhoto(row.dataUrl)) &&
    rows(citations, row => ["source_id", "quote_or_section", "title", "publisher"].every(key => typeof row[key] === "string") &&
      typeof row.url === "string" && row.url.startsWith("https://")) &&
    rows(schedules, row => typeof row.title === "string" && typeof row.kind === "string" && typeof row.dateTime === "string" &&
      (row.amount === null || typeof row.amount === "string") && typeof row.confirmed === "boolean") &&
    rows(score_history, row => typeof row.generated_at === "string" && typeof row.overall === "number" && row.overall >= 0 && row.overall <= 100) &&
    rows(weight_history, row => typeof row.date === "string" && Number.isFinite(row.pounds));
}

export function bytesToBase64(buffer: ArrayBuffer): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const bytes = new Uint8Array(buffer);
  const blocks: string[] = [];
  let chunk = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = bytes[i + 1] ?? 0;
    const c = bytes[i + 2] ?? 0;
    chunk += alphabet[a >> 2] + alphabet[((a & 3) << 4) | (b >> 4)] +
      (i + 1 < bytes.length ? alphabet[((b & 15) << 2) | (c >> 6)] : "=") +
      (i + 2 < bytes.length ? alphabet[c & 63] : "=");
    if (chunk.length >= 16384) {
      blocks.push(chunk);
      chunk = "";
    }
  }
  return blocks.join("") + chunk;
}

function h(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function visitPackageHtml(data: VetVisitPackage): string {
  const citations = data.citations.filter(c => c.url.startsWith("https://"))
    .map(c => `<li><a href="${h(c.url)}">${h(c.title)} · ${h(c.publisher)}</a></li>`).join("");
  const photos = data.photos.filter(p => isEmbeddedPhoto(p.dataUrl))
    .map(p => `<figure><img style="max-width:100%;max-height:340px;object-fit:contain" src="${p.dataUrl}" alt=""><figcaption>${h(p.label)}</figcaption></figure>`).join("");
  const schedule = data.schedules.map(s => `<li>${h(s.title)} · ${h(s.dateTime)}${s.amount ? " · " + h(s.amount) : ""}${s.confirmed ? " · completed" : ""}</li>`).join("");
  const weight = data.weight_history.map(w => `<li>${h(w.date)} · ${h(w.pounds)} lb</li>`).join("");
  const scores = data.score_history.map(s => `<li>${h(s.generated_at)} · ${h(s.overall)}/100</li>`).join("");
  return buildReportHtml(data.report).replace("</body>", `
    ${schedule ? `<section><h2>Upcoming care</h2><ul>${schedule}</ul></section>` : ""}
    ${weight ? `<section><h2>Recorded weights</h2><ul>${weight}</ul></section>` : ""}
    ${scores ? `<section><h2>Wellness score history</h2><ul>${scores}</ul></section>` : ""}
    ${photos ? `<section><h2>Attached photos</h2>${photos}</section>` : ""}
    ${citations ? `<section><h2>Veterinary references</h2><ul>${citations}</ul></section>` : ""}
    </body>`);
}

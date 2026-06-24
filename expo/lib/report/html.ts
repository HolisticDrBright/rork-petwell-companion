import { Urgency } from "@/constants/colors";

import type { ReportData } from "./types";

function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function urgencyColor(key: string): string {
  return (Urgency as Record<string, { color: string }>)[key]?.color ?? "#0E5C57";
}

function fmtDate(iso: string): string {
  const d = new Date(iso.length <= 10 ? iso + "T00:00:00" : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function section(title: string, body: string): string {
  if (!body.trim()) return "";
  return `<section><h2>${esc(title)}</h2>${body}</section>`;
}

function list(items: string[]): string {
  if (!items.length) return "";
  return `<ul>${items.map((i) => `<li>${i}</li>`).join("")}</ul>`;
}

/**
 * Build a self-contained, print-ready HTML document. On web this is opened and
 * sent to the browser's "Save as PDF"; the same markup is the shareable artifact.
 */
export function buildReportHtml(data: ReportData): string {
  const p = data.pet;
  const profile = [
    `${p.ageYears} yr`,
    p.breed,
    p.sex,
    `${p.weightLb} lb`,
    p.species,
  ]
    .filter(Boolean)
    .map(esc)
    .join(" · ");

  const triageBlock = data.triage
    ? `<div class="triage">
         <div class="badge" style="background:${urgencyColor(data.triage.urgencyKey)}">${esc(data.triage.urgencyLabel)}</div>
         <p><strong>${esc(data.triage.concernLabel)}</strong> — ${esc(data.triage.confidence)} confidence</p>
         ${data.triage.summary ? `<p class="muted">${esc(data.triage.summary).replace(/\n/g, "<br/>")}</p>` : ""}
         ${
           data.triage.causes.length
             ? `<p class="label">Possible causes (not a diagnosis)</p>` +
               list(data.triage.causes.map((c) => `${esc(c.name)}${c.note ? ` <span class="muted">— ${esc(c.note)}</span>` : ""}`))
             : ""
         }
         ${
           data.triage.answers.length
             ? `<p class="label">Triage answers</p><table>${data.triage.answers
                 .map((a) => `<tr><td>${esc(a.question)}</td><td><strong>${esc(a.answer)}</strong></td></tr>`)
                 .join("")}</table>`
             : ""
         }
       </div>`
    : `<p class="muted">No triage on file. Run the Ask flow to attach symptom triage.</p>`;

  const redFlags = `
    <table class="flags">
      ${data.redFlagsPresent.map((f) => `<tr><td class="present">● Present</td><td>${esc(f)}</td></tr>`).join("")}
      ${data.redFlagsAbsent.map((f) => `<tr><td class="absent">○ Absent</td><td>${esc(f)}</td></tr>`).join("")}
    </table>`;

  const scans = data.scans.length
    ? `<table>${data.scans
        .map(
          (s) =>
            `<tr><td>${esc(fmtDate(s.date))}</td><td><strong>${esc(s.type)}</strong>${
              s.score ? ` — ${esc(s.score)}` : ""
            }${s.note ? `<br/><span class="muted">${esc(s.note)}</span>` : ""}</td></tr>`
        )
        .join("")}</table>`
    : `<p class="muted">No scans recorded.</p>`;

  const meds = data.medications.length
    ? list(data.medications.map((m) => `<strong>${esc(m.name)}</strong>${m.purpose ? ` — ${esc(m.purpose)}` : ""}`))
    : `<p class="muted">None on file.</p>`;

  const food = data.foodChanges.length
    ? list(data.foodChanges.map((f) => `${esc(f.title)}${f.detail ? ` <span class="muted">— ${esc(f.detail)}</span>` : ""}`))
    : `<p class="muted">No recent diet changes logged.</p>`;

  const timeline = data.timeline.length
    ? `<table>${data.timeline
        .map(
          (t) =>
            `<tr><td>${esc(fmtDate(t.date))}</td><td><strong>${esc(t.title)}</strong>${
              t.detail ? ` <span class="muted">— ${esc(t.detail)}</span>` : ""
            }</td></tr>`
        )
        .join("")}</table>`
    : `<p class="muted">No recent activity.</p>`;

  const allergiesConditions =
    `<p class="label">Allergies</p>${data.allergies.length ? list(data.allergies.map(esc)) : '<p class="muted">None reported.</p>'}` +
    `<p class="label">Conditions</p>${data.conditions.length ? list(data.conditions.map(esc)) : '<p class="muted">None reported.</p>'}`;

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Petwell — ${esc(p.name)} vet report</title>
<style>
  :root { --teal:#0E5C57; --ink:#21302E; --muted:#6B7A77; --line:#E6E1D6; --cream:#FBF7EF; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: var(--ink); margin: 0; padding: 32px; background:#fff; }
  header { display:flex; align-items:center; justify-content:space-between; border-bottom:3px solid var(--teal); padding-bottom:14px; margin-bottom:8px; }
  header .brand { font-weight:800; color:var(--teal); font-size:20px; letter-spacing:-0.3px; }
  header .date { color:var(--muted); font-size:13px; }
  h1 { font-size:24px; margin:18px 0 2px; }
  .sub { color:var(--muted); font-size:14px; margin:0 0 6px; }
  section { margin-top:22px; page-break-inside: avoid; }
  h2 { font-size:13px; text-transform:uppercase; letter-spacing:0.6px; color:var(--teal); border-bottom:1px solid var(--line); padding-bottom:6px; margin:0 0 10px; }
  ul { margin:6px 0; padding-left:18px; } li { margin:4px 0; line-height:1.45; }
  table { width:100%; border-collapse:collapse; font-size:14px; }
  td { padding:7px 8px; border-bottom:1px solid var(--line); vertical-align:top; }
  td:first-child { white-space:nowrap; color:var(--muted); width:1%; }
  .muted { color:var(--muted); }
  .label { font-weight:700; font-size:13px; margin:12px 0 2px; }
  .badge { display:inline-block; color:#fff; font-weight:800; padding:4px 12px; border-radius:999px; font-size:13px; margin-bottom:8px; }
  .triage p { margin:6px 0; }
  .flags td:first-child { width:84px; font-weight:700; }
  .flags .present { color:#D99117; } .flags .absent { color:#2E9E6B; }
  footer { margin-top:28px; border-top:1px solid var(--line); padding-top:12px; color:var(--muted); font-size:12px; line-height:1.5; }
  @media print { body { padding:0; } @page { margin:18mm; } }
</style></head>
<body>
  <header>
    <span class="brand">🐾 Petwell</span>
    <span class="date">Generated ${esc(fmtDate(data.generatedAt))}</span>
  </header>

  <h1>${esc(p.name)}</h1>
  <p class="sub">${profile}${p.statusNote ? ` · ${esc(p.statusNote)}` : ""}</p>

  ${section("Concern summary", data.concernSummary ? `<p>${esc(data.concernSummary)}</p>` : "")}
  ${section("Triage", triageBlock)}
  ${section("Red-flag screen", redFlags)}
  ${section("Allergies & conditions", allergiesConditions)}
  ${section("Medications & supplements", meds)}
  ${section("Food & diet changes", food)}
  ${section("Photos & scans", scans)}
  ${section("Recent timeline", timeline)}
  ${section("Questions to ask the vet", list(data.questions.map(esc)))}

  <footer>
    Prepared by the owner via Petwell for veterinary review. This report is a summary of owner-logged
    information and triage guidance — <strong>it is not a diagnosis</strong>. Export and sharing are always free.
  </footer>
</body></html>`;
}

/** Plain-text rendition for native share / email fallback. */
export function buildReportText(data: ReportData): string {
  const lines: string[] = [];
  lines.push(`PETWELL — ${data.pet.name} vet report`);
  lines.push(`Generated ${fmtDate(data.generatedAt)}`);
  lines.push(`${data.pet.ageYears} yr · ${data.pet.breed} · ${data.pet.sex} · ${data.pet.weightLb} lb`);
  if (data.concernSummary) lines.push(`\nConcern: ${data.concernSummary}`);
  if (data.triage) {
    lines.push(`\nTriage: ${data.triage.concernLabel} — ${data.triage.urgencyLabel} (${data.triage.confidence} confidence)`);
    data.triage.causes.slice(0, 3).forEach((c) => lines.push(`  • ${c.name}`));
  }
  if (data.redFlagsPresent.length) lines.push(`\nRed flags present: ${data.redFlagsPresent.join("; ")}`);
  if (data.allergies.length) lines.push(`\nAllergies: ${data.allergies.join(", ")}`);
  if (data.conditions.length) lines.push(`Conditions: ${data.conditions.join(", ")}`);
  if (data.medications.length) lines.push(`Medications: ${data.medications.map((m) => m.name).join(", ")}`);
  if (data.questions.length) {
    lines.push(`\nQuestions for the vet:`);
    data.questions.forEach((q) => lines.push(`  • ${q}`));
  }
  lines.push(`\nNot a diagnosis. Prepared via Petwell.`);
  return lines.join("\n");
}

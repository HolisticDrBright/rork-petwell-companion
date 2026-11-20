export const RECORD_FIELDS = [
  "document_type", "document_date", "clinic", "veterinarian", "diagnosis", "weight",
  "vaccine_name", "vaccine_date", "vaccine_due", "medication_name", "medication_dose",
  "medication_schedule", "lab_analyte", "lab_value", "lab_unit", "lab_reference",
] as const;

export type RecordFieldKey = (typeof RECORD_FIELDS)[number];
export type RecordField = { key: RecordFieldKey; group: number; value: string; confidence: number };

export function normalizeExtraction(raw: unknown): { text: string; fields: RecordField[] } {
  const response = (raw ?? {}) as { ocr_text?: unknown; fields?: unknown };
  const text = typeof response.ocr_text === "string" ? response.ocr_text.slice(0, 30000) : "";
  const fields: RecordField[] = [];
  if (!Array.isArray(response.fields)) return { text, fields };
  for (const rawField of response.fields.slice(0, 160)) {
    if (!rawField || typeof rawField !== "object") continue;
    const { key, group, value, confidence } = rawField as Partial<RecordField>;
    if (!key || !RECORD_FIELDS.includes(key) || typeof value !== "string" || !value.trim()) continue;
    if (!Number.isInteger(group) || group! < 0 || group! > 99) continue;
    fields.push({
      key,
      group: group!,
      value: value.trim().slice(0, 500),
      confidence: typeof confidence === "number" && Number.isFinite(confidence) ? Math.min(1, Math.max(0, confidence)) : 0,
    });
  }
  return { text, fields };
}

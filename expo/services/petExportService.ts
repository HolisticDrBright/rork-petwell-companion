import { supabase } from "@/lib/supabase";
import { privateDocumentDataUrl } from "@/services/vetVisitPackageService";

type ExportRow = Record<string, unknown>;
type ExportData = ExportRow & { pet: ExportRow; document_uploads?: ExportRow[] };

export const petExportService = {
  async get(petId: string) {
    const { data, error } = await supabase.rpc("export_pet_data", { p_pet_id: petId });
    if (error) throw error;
    const records = data as ExportData;
    if (!records?.pet || records.pet.id !== petId) throw new Error("Couldn’t open the pet export.");
    const photos: { document: string; image: string }[] = [];
    for (const row of records.document_uploads ?? []) {
      if (typeof row.storage_path === "string" && /^image\/(jpeg|png|webp)$/.test(String(row.mime_type))) {
        photos.push({
          document: typeof row.title === "string" ? row.title : "Veterinary document",
          image: await privateDocumentDataUrl(row.storage_path, 6_000_000),
        });
      }
    }
    return { records, photos };
  },
};

function escape(value: string): string {
  return value.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function petExportHtml(payload: Awaited<ReturnType<typeof petExportService.get>>): string {
  const label = (key: string) => escape(key.replace(/_/g, " ").replace(/^./, c => c.toUpperCase()));
  function details(row: Record<string, unknown>): string {
    return Object.entries(row).filter(([key, value]) =>
      value != null && value !== "" && key !== "id" && !key.endsWith("_id") && !key.endsWith("_path"))
      .map(([key, value]) => {
        const text = typeof value === "object" ? JSON.stringify(value, null, 2) : String(value);
        return `<dt>${label(key)}</dt><dd>${escape(text)}</dd>`;
      }).join("");
  }
  const sections = Object.entries(payload.records).flatMap(([key, value]) => {
    const items = Array.isArray(value) ? value : [value];
    if (!items.length) return [];
    return [`<section><h2>${label(key)}</h2>${items.map(item =>
      typeof item === "object" && item !== null ? `<dl>${details(item)}</dl>` : `<p>${escape(String(item ?? ""))}</p>`
    ).join("")}</section>`];
  }).join("");
  const images = payload.photos.map(p =>
    /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(p.image)
      ? `<figure><img src="${p.image}" alt="Attached veterinary document"><figcaption>${escape(p.document)}</figcaption></figure>`
      : "").join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>Petwell record export</title><style>
      body{font:15px system-ui;margin:24px;color:#203432}section{margin:18px 0}dl{margin:12px 0;border-top:1px solid #ccd8d6;padding-top:8px}dt{font-weight:600}dd{margin:0 0 6px;white-space:pre-wrap;overflow-wrap:anywhere}
      img{display:block;max-width:100%;max-height:650px;margin:10px auto}figure{break-inside:avoid}
      </style></head><body><h1>Petwell record export</h1>${sections}${images}</body></html>`;
}

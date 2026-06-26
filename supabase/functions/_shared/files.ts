// Helpers for feeding stored documents/images to the model as inline data URLs
// (most reliable across image + PDF inputs). Signed URLs are created server-side;
// we inline the bytes so the provider never needs network access to our storage.
import { encodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";
import type { ContentPart } from "./provider.ts";

export type DocKind = "image" | "pdf" | "other";

export function guessMime(path: string): { mime: string; kind: DocKind } {
  const ext = (path.split(".").pop() ?? "").toLowerCase();
  if (["jpg", "jpeg"].includes(ext)) return { mime: "image/jpeg", kind: "image" };
  if (ext === "png") return { mime: "image/png", kind: "image" };
  if (ext === "webp") return { mime: "image/webp", kind: "image" };
  if (ext === "heic" || ext === "heif") return { mime: "image/heic", kind: "image" };
  if (ext === "pdf") return { mime: "application/pdf", kind: "pdf" };
  return { mime: "application/octet-stream", kind: "other" };
}

/** Fetch a (signed) URL and return a base64 data URL, capped to maxBytes. */
export async function fetchAsDataUrl(url: string, mime: string, maxBytes = 12_000_000): Promise<string | null> {
  const res = await fetch(url);
  if (!res.ok) return null;
  const buf = new Uint8Array(await res.arrayBuffer());
  if (buf.byteLength > maxBytes) return null;
  return `data:${mime};base64,${encodeBase64(buf)}`;
}

/** Build the model content part for a document, or null if it isn't supported. */
export function docContentPart(dataUrl: string, kind: DocKind, filename: string): ContentPart | null {
  if (kind === "image") return { type: "input_image", image_url: dataUrl };
  if (kind === "pdf") return { type: "input_file", filename, file_data: dataUrl };
  return null;
}

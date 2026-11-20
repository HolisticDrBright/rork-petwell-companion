import { supabase } from "@/lib/supabase";
import { bytesToBase64, isVetVisitPackage, type VetVisitPackage } from "@/lib/report/visitPackage";
import type { Json } from "@/types/db";

export function configuredVisitViewer(): URL | null {
  try {
    const url = new URL(process.env.EXPO_PUBLIC_PETWELL_SHARE_WEB_URL ?? "");
    return url.protocol === "https:" && !url.username && !url.password && !url.search && !url.hash ? url : null;
  } catch { return null; }
}

export async function privateDocumentDataUrl(path: string, maximumBytes = 3_000_000): Promise<string> {
  const { data, error } = await supabase.storage.from("documents").createSignedUrl(path, 120);
  if (error) throw error;
  const response = await fetch(data.signedUrl);
  const kind = response.headers.get("content-type")?.split(";")[0] ?? "";
  if (!response.ok || !["image/jpeg","image/png","image/webp"].includes(kind)) throw new Error("Photo unavailable.");
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength > maximumBytes) throw new Error("Photo is too large for this package.");
  return `data:${kind};base64,${bytesToBase64(bytes)}`;
}

export const vetVisitPackageService = {
  async create(petId: string, payload: VetVisitPackage, days = 30) {
    const origin = configuredVisitViewer();
    if (!origin) throw new Error("Web sharing isn’t available on this build. Export the PDF instead.");
    if (!isVetVisitPackage(payload)) throw new Error("The visit package is incomplete.");
    const { data, error } = await supabase.rpc("create_vet_visit_package", { p_pet_id: petId, p_summary: payload as unknown as Json, p_days: days });
    if (error) throw error;
    const record = data as { id: string; token: string; expires_at: string };
    if (!/^[a-f0-9]{64}$/.test(record?.token)) throw new Error("The sharing link was not created.");
    const route = new URL("vet-visit-share", origin.href.endsWith("/") ? origin : new URL(origin.href + "/"));
    route.hash = record.token;
    return { id: record.id, url: route.href, expiresAt: record.expires_at };
  },
  async list(petId: string) {
    const { data, error } = await supabase.from("vet_visit_packages").select("id,created_at,expires_at,revoked_at")
      .eq("pet_id", petId).order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
  async open(token: string): Promise<VetVisitPackage | null> {
    if (!/^[a-f0-9]{64}$/.test(token)) return null;
    const { data, error } = await supabase.rpc("get_vet_visit_package", { p_token: token });
    if (error) throw error;
    return isVetVisitPackage(data) ? data : null;
  },
  async revoke(id: string): Promise<void> {
    const { error } = await supabase.rpc("revoke_vet_visit_package", { p_id: id });
    if (error) throw error;
  },
};

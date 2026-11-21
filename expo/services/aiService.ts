/**
 * Client gateway to the server-side AI layer. The app NEVER calls an AI provider
 * directly and holds no model API key — every method invokes a Supabase Edge
 * Function, which calls the provider with a server-only key and logs the result.
 *
 * Gating: AI is off unless (1) the Supabase backend is configured, (2) we're in
 * remote mode, and (3) the user opted in (Settings). Document features need the
 * stricter allowDocumentProcessing opt-in. When anything is off we return a
 * friendly disabled envelope instead of calling out.
 */
import { getMode, requireUserId } from "@/lib/backend";
import { getAiPreferences } from "@/lib/ai/config";
import { assessInput } from "@/lib/ai/safety";
import type {
  AiEnvelope,
  CarePlanDraft,
  ChatReply,
  CoaExtraction,
  ExplainReply,
  LabelExtraction,
  RecordSummary,
  SymptomObservation,
  VetReportRewrite,
} from "@/lib/ai/types";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { photoJpeg } from "@/lib/photoUpload";
import { privacyService } from "./privacyService";

type AiGate = { ok: false; disabled: true; disabledReason: string; settingsRequired?: true };

function disabled(reason: string, settingsRequired?: true): AiGate {
  return { ok: false, disabled: true, disabledReason: reason, settingsRequired };
}

async function gate(opts: { needsDocs?: boolean } = {}): Promise<AiGate | null> {
  if (!isSupabaseConfigured) return disabled("AI is unavailable in this build.");
  if (getMode() !== "remote") {
    return disabled("Sign in to your Petwell account to use AI.");
  }
  const prefs = await getAiPreferences();
  if (!prefs.enabled) return disabled("Turn on Enable AI features in Settings & privacy.", true);
  if (opts.needsDocs && !prefs.allowDocumentProcessing) {
    return disabled("Turn on Allow AI to process my documents in Settings & privacy.", true);
  }
  return null;
}

/** Invoke an AI edge function and normalize to an AiEnvelope. */
async function invokeAi<T>(fn: string, body: Record<string, unknown>): Promise<AiEnvelope<T>> {
  try {
    const { data, error } = await supabase.functions.invoke(fn, { body });
    if (error) return { ok: false, error: error.message || "AI request failed." };
    const env = data as AiEnvelope<T>;
    if (!env || typeof env !== "object") return { ok: false, error: "Unexpected AI response." };
    return env;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "AI request failed." };
  }
}

export const aiService = {
  /** Local, instant emergency/toxin pre-check (server re-checks authoritatively). */
  assessInput,

  /** Whether an AI feature is usable now (backend + opt-ins). Avoids wasted work. */
  async availability(opts: { needsDocs?: boolean; needsScanStorage?: boolean } = {}): Promise<
    { ok: true } | { ok: false; reason: string; settingsRequired?: true }
  > {
    const blocked = await gate(opts);
    if (blocked) return { ok: false, reason: blocked.disabledReason, settingsRequired: blocked.settingsRequired };
    if (opts.needsScanStorage && !(await privacyService.getPrefs()).store_photos) {
      return { ok: false, reason: "Turn on Store scan photos in the cloud to read this photo.", settingsRequired: true };
    }
    return { ok: true };
  },

  /** Upload a transient scan image to the private documents bucket; returns its path.
   *  Always re-encodes to JPEG first: iPhones may hand us HEIC (which vision
   *  providers reject), and re-encoding also strips EXIF/GPS metadata before the
   *  photo leaves the device. */
  async uploadScanImage(localUri: string): Promise<string | null> {
    if (!isSupabaseConfigured || getMode() !== "remote") return null;
    try {
      const ownerId = requireUserId();
      if (!(await privacyService.getPrefs()).store_photos) return null;
      const bytes = await photoJpeg(localUri);
      if (requireUserId() !== ownerId) return null;
      const path = `${ownerId}/ai-scan-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
      const { error } = await supabase.storage.from("documents").upload(path, bytes, { contentType: "image/jpeg" });
      return error ? null : path;
    } catch {
      return null;
    }
  },

  async rewriteVetReport(report: unknown): Promise<AiEnvelope<VetReportRewrite>> {
    return (await gate()) ?? invokeAi<VetReportRewrite>("ai-vet-report-rewrite", { report });
  },

  async summarizeRecord(input: {
    documentPath: string;
    petId?: string | null;
    recordType?: string | null;
  }): Promise<AiEnvelope<RecordSummary>> {
    return (await gate({ needsDocs: true })) ?? invokeAi<RecordSummary>("ai-record-summary", input);
  },

  async extractCoa(input: {
    sourceUrl?: string | null;
    documentPath?: string | null;
    brandHint?: string | null;
    productHint?: string | null;
  }): Promise<AiEnvelope<CoaExtraction>> {
    return (await gate({ needsDocs: true })) ?? invokeAi<CoaExtraction>("ai-coa-extract", input);
  },

  async visionLabel(input: {
    imagePath: string;
    petId?: string | null;
    productHint?: string | null;
  }): Promise<AiEnvelope<LabelExtraction>> {
    return (await gate({ needsDocs: true })) ?? invokeAi<LabelExtraction>("ai-vision-label", input);
  },

  /** Describe observable features in a symptom photo (never a diagnosis/score).
   *  Deterministic red-flag routing comes back in `safety`; hand off to guided triage. */
  async observeSymptomPhoto(input: {
    imagePath: string;
    area: "poop" | "skin" | "ear" | "eye" | "teeth";
    petId?: string | null;
    notes?: string | null;
  }): Promise<AiEnvelope<SymptomObservation>> {
    return (await gate({ needsDocs: true })) ?? invokeAi<SymptomObservation>("ai-vision-symptom", input);
  },

  async explain(input: { feature: string; result: unknown }): Promise<AiEnvelope<ExplainReply>> {
    return (await gate()) ?? invokeAi<ExplainReply>("ai-explain", input);
  },

  async carePlan(input: {
    petId: string;
    issue: string;
    plan: unknown;
  }): Promise<AiEnvelope<CarePlanDraft>> {
    return (await gate()) ?? invokeAi<CarePlanDraft>("ai-care-plan", input);
  },

  async chat(input: {
    petId?: string | null;
    threadId?: string | null;
    message: string;
    includeContext?: boolean;
  }): Promise<AiEnvelope<ChatReply>> {
    return (await gate()) ?? invokeAi<ChatReply>("ai-chat", input);
  },

  // ── Privacy: history controls ──────────────────────────────
  async listRecentGenerations(limit = 50) {
    if (!isSupabaseConfigured || getMode() !== "remote") return [];
    const { data } = await supabase
      .from("ai_generations")
      .select("id, feature, user_visible_text, review_status, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    return data ?? [];
  },

  /** Delete all of the user's AI history (generations + chat threads cascade). */
  async deleteAllAiHistory(): Promise<{ ok: boolean }> {
    if (!isSupabaseConfigured || getMode() !== "remote") return { ok: false };
    try {
      await supabase.from("ai_chat_threads").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("ai_extracted_records").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("ai_generations").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      return { ok: true };
    } catch {
      return { ok: false };
    }
  },
};

/**
 * Client-side AI preferences (privacy controls). These are device-local opt-ins —
 * AI features stay OFF until the user enables them, and document processing is a
 * separate, stricter opt-in. The server independently enforces AI_ENABLED + an API
 * key; this only governs what the app is allowed to send.
 *
 * No model API key is ever read here or anywhere in the client. The app calls
 * Supabase Edge Functions, which hold the provider key server-side.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface AiPreferences {
  /** Master switch for all AI features. Off by default. */
  enabled: boolean;
  /** Separate, stricter opt-in: allow uploaded records/images to be sent to the AI. */
  allowDocumentProcessing: boolean;
}

export const DEFAULT_AI_PREFS: AiPreferences = {
  enabled: false,
  allowDocumentProcessing: false,
};

const KEY = "petwell.ai.prefs.v1";

export async function getAiPreferences(): Promise<AiPreferences> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return DEFAULT_AI_PREFS;
    const parsed = JSON.parse(raw) as Partial<AiPreferences>;
    return {
      enabled: !!parsed.enabled,
      allowDocumentProcessing: !!parsed.allowDocumentProcessing,
    };
  } catch {
    return DEFAULT_AI_PREFS;
  }
}

export async function setAiPreferences(prefs: AiPreferences): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    // best-effort; preference is non-critical
  }
}

/** What gets shown to the user about where their data goes when AI is on. */
export const AI_DATA_NOTICE =
  "When AI features are on, the text or files you submit are sent to our AI provider (OpenAI) through Petwell's secure backend to generate a response. Results can be wrong and are informational only — not veterinary advice. You can turn AI off or delete your AI history anytime.";

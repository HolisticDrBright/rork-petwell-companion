import { manualOcr, type OcrAdapter } from "@/lib/food/ocr";

/**
 * OCR service — reads the printed text off a label photo.
 *
 * On-device OCR (Apple Vision / Google ML Kit via `expo-text-extractor`) is a
 * NATIVE module that doesn't run in Expo Go or on web, so it is intentionally
 * NOT imported here — that keeps the JS bundle building everywhere. Instead a
 * dev/prod build registers a real adapter at startup:
 *
 *   // app entry (a custom dev/prod build, not Expo Go):
 *   import { getTextFromFrame } from "expo-text-extractor";
 *   import { registerOcrAdapter } from "@/services/ocrService";
 *   registerOcrAdapter({ extract: async (uri) => (await getTextFromFrame(uri)).join("\n") });
 *
 * Until then, `extractTextFromImage` returns no text and the UI falls back to
 * letting the user review/type the label from their photo. Either way, OCR only
 * READS the label — it never establishes purity or detects contaminants.
 */

let adapter: OcrAdapter = manualOcr;

/** Install a real on-device OCR backend (see file header). */
export function registerOcrAdapter(a: OcrAdapter): void {
  adapter = a;
}

export const ocrService = {
  /** True once a real OCR backend has been registered for this build. */
  isAvailable(): boolean {
    return adapter !== manualOcr;
  },

  /**
   * Extract raw label text from a captured image. Resolves to empty text with
   * `available: false` when no OCR backend is installed (so the caller can show
   * the manual review/typing path instead).
   */
  async extractTextFromImage(uri: string): Promise<{ text: string; available: boolean }> {
    if (adapter === manualOcr) return { text: "", available: false };
    try {
      const text = await adapter.extract(uri);
      return { text: text ?? "", available: true };
    } catch {
      return { text: "", available: false };
    }
  },
};

import { Platform, Share } from "react-native";

/**
 * Cross-platform export/share with NO extra native deps.
 *  - web: open the HTML and trigger the browser's print → "Save as PDF"; data
 *    exports download as a file via Blob.
 *  - native: share the text rendition via the OS share sheet.
 * Export is always free — there is no premium gate anywhere in here.
 */

interface WebAnchor {
  href: string;
  download: string;
  click(): void;
}
interface WebDocument {
  open(): void;
  write(html: string): void;
  close(): void;
  createElement(tag: "a"): WebAnchor;
  body: { appendChild(n: WebAnchor): void; removeChild(n: WebAnchor): void };
}
interface WebWindow {
  open(url?: string, target?: string): WebWindow | null;
  print(): void;
  focus(): void;
  document: WebDocument;
  location: { href: string };
}
interface WebGlobals {
  window?: WebWindow;
  document?: WebDocument;
  navigator?: { share?: (d: { title?: string; text?: string }) => Promise<void> };
  Blob?: new (parts: string[], opts?: { type?: string }) => object;
  URL?: { createObjectURL(b: object): string; revokeObjectURL(u: string): void };
}

const G = globalThis as unknown as WebGlobals;
const isWeb = Platform.OS === "web";

export type ExportMethod = "print" | "download" | "share" | "web-share" | "mailto" | "cancel" | "none";

function textFromHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 4000);
}

function downloadBlob(content: string, filename: string, type: string): boolean {
  if (!G.Blob || !G.URL || !G.document) return false;
  try {
    const blob = new G.Blob([content], { type });
    const url = G.URL.createObjectURL(blob);
    const a = G.document.createElement("a");
    a.href = url;
    a.download = filename;
    G.document.body.appendChild(a);
    a.click();
    G.document.body.removeChild(a);
    G.URL.revokeObjectURL(url);
    return true;
  } catch {
    return false;
  }
}

/** Open the report for printing (Save as PDF on web) or share it on native. */
export async function exportReportPdf(html: string, filename: string): Promise<ExportMethod> {
  if (isWeb && G.window) {
    const w = G.window.open("", "_blank");
    if (w && w.document) {
      w.document.open();
      w.document.write(html);
      w.document.close();
      w.focus();
      setTimeout(() => {
        try {
          w.print();
        } catch {
          /* user can print manually */
        }
      }, 350);
      return "print";
    }
    return downloadBlob(html, `${filename}.html`, "text/html") ? "download" : "none";
  }
  try {
    await Share.share({ title: filename, message: textFromHtml(html) });
    return "share";
  } catch {
    return "none";
  }
}

/** Share the report (Web Share API / mailto on web, OS share sheet on native). */
export async function shareReport(text: string, subject: string): Promise<ExportMethod> {
  if (isWeb) {
    if (G.navigator?.share) {
      try {
        await G.navigator.share({ title: subject, text });
        return "web-share";
      } catch {
        return "cancel";
      }
    }
    if (G.window) {
      G.window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
      return "mailto";
    }
    return "none";
  }
  try {
    await Share.share({ title: subject, message: text });
    return "share";
  } catch {
    return "none";
  }
}

/** Download/share a structured data export (the "export all data" action). */
export async function exportJson(obj: unknown, filename: string): Promise<ExportMethod> {
  const json = JSON.stringify(obj, null, 2);
  if (isWeb) return downloadBlob(json, filename, "application/json") ? "download" : "none";
  try {
    await Share.share({ title: filename, message: json.slice(0, 4000) });
    return "share";
  } catch {
    return "none";
  }
}

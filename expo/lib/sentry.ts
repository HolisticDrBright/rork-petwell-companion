import * as Sentry from "@sentry/react-native";

/**
 * Crash + error reporting. The DSN comes from EXPO_PUBLIC_SENTRY_DSN so no key
 * is hardcoded; when it's absent (local/dev without the env set) everything here
 * is a no-op, so the app behaves exactly as before. A Sentry DSN is a public
 * client key — it's safe to ship in the bundle.
 *
 * Privacy: we do NOT send PII by default (sendDefaultPii stays false). This is a
 * pet-health app — keep owner/pet data out of crash reports.
 */

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;
let started = false;

export const sentryEnabled = !!DSN;

export function initSentry(): void {
  if (started || !DSN) return;
  started = true;
  try {
    Sentry.init({
      dsn: DSN,
      // Light performance sampling; errors are always captured.
      tracesSampleRate: 0.1,
      // Keep crash reports free of pet/owner data.
      sendDefaultPii: false,
      // Scrub anything that could carry AI prompts, user records, pet medical
      // details, or PII before an event leaves the device. We never attach AI
      // content to Sentry, but this is a hard backstop.
      beforeSend(event) {
        try {
          delete event.request; // bodies/headers/cookies
          delete event.user; // ids/emails
          if (event.extra) {
            for (const k of Object.keys(event.extra)) {
              if (/prompt|message|content|record|ocr|label|pet|email|input|reply|summary/i.test(k)) {
                delete event.extra[k];
              }
            }
          }
          // Don't ship local breadcrumb data that may contain entered text.
          event.breadcrumbs = undefined;
        } catch {
          // never let scrubbing throw
        }
        return event;
      },
    });
  } catch {
    // Never let telemetry setup break app startup.
  }
}

/** Report a caught error (used by the global ErrorBoundary). No-op without a DSN. */
export function captureError(error: unknown, context?: Record<string, unknown>): void {
  if (!DSN) return;
  try {
    Sentry.captureException(error, context ? { extra: context } : undefined);
  } catch {
    // ignore
  }
}

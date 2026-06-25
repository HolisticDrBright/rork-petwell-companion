import { Platform } from "react-native";

/**
 * RevenueCat configuration — env-driven, mirroring lib/supabaseConfig.
 *
 * RevenueCat *public SDK keys* are safe to ship in a client app: they're embedded
 * in every binary and only allow the operations the store + dashboard permit.
 * Each platform/store has its OWN key (RevenueCat dashboard → Project settings →
 * API keys): an Apple App Store key (appl_…) and a Google Play key (goog_…).
 *
 *   EXPO_PUBLIC_REVENUECAT_IOS_KEY        Apple App Store key
 *   EXPO_PUBLIC_REVENUECAT_ANDROID_KEY    Google Play key
 *   EXPO_PUBLIC_REVENUECAT_ENTITLEMENT    entitlement identifier (default "Petwell Pro")
 *
 * If no key is set for the current platform (or on web, where the native SDK
 * doesn't run), purchases are DISABLED: every API no-ops and Pro stays locked.
 * The app keeps working — nothing throws.
 */

const IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? "";
const ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? "";

/** Public SDK key for the current platform ("" on web or when unset). */
export const REVENUECAT_API_KEY: string =
  Platform.select({ ios: IOS_KEY, android: ANDROID_KEY, default: "" }) ?? "";

/** The entitlement that unlocks Petwell Pro. MUST match the RevenueCat dashboard exactly. */
export const ENTITLEMENT_ID: string = process.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT ?? "Petwell Pro";

/** True only when the native SDK can be configured (key present, not web). */
export const isPurchasesConfigured: boolean = REVENUECAT_API_KEY.length > 0 && Platform.OS !== "web";

if (!isPurchasesConfigured && Platform.OS !== "web") {
  console.warn(
    "[petwell] RevenueCat not configured — set EXPO_PUBLIC_REVENUECAT_IOS_KEY / " +
      "EXPO_PUBLIC_REVENUECAT_ANDROID_KEY in .env to enable subscriptions. Pro stays locked.",
  );
}

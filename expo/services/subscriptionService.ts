import type { SubscriptionService, SubscriptionSnapshot } from "@/lib/purchases/types";

/**
 * Default / web implementation. RevenueCat's native SDK doesn't run on web, so
 * every method is a safe no-op and Pro stays locked. On iOS/Android, Metro
 * resolves `subscriptionService.native.ts` instead (platform-extension wins over
 * this base file), so this code only ever runs on web / unsupported platforms.
 */
const EMPTY: SubscriptionSnapshot = { isPro: false, customerInfo: null };
const UNAVAILABLE = "Subscriptions aren't available on this platform.";

export const subscriptionService: SubscriptionService = {
  isSupported: false,
  configure() {},
  async identify() {},
  async signOut() {},
  async getSnapshot() {
    return EMPTY;
  },
  async getOfferings() {
    return null;
  },
  async purchasePackage() {
    return { ok: false, isPro: false, error: UNAVAILABLE };
  },
  async restore() {
    return { ok: false, isPro: false, error: UNAVAILABLE };
  },
  async presentPaywall() {
    return "not_presented";
  },
  async presentPaywallIfNeeded() {
    return "not_presented";
  },
  async presentCustomerCenter() {},
  addListener() {
    return () => {};
  },
};

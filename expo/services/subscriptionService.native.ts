import Purchases, { LOG_LEVEL } from "react-native-purchases";
import RevenueCatUI, { PAYWALL_RESULT } from "react-native-purchases-ui";

import { ENTITLEMENT_ID, REVENUECAT_API_KEY, isPurchasesConfigured } from "@/lib/purchases/config";
import type {
  CustomerInfo,
  PaywallOutcome,
  PurchaseOutcome,
  PurchasesOffering,
  SubscriptionService,
  SubscriptionSnapshot,
} from "@/lib/purchases/types";

/**
 * Native (iOS/Android) RevenueCat implementation.
 *
 * - The entitlement `ENTITLEMENT_ID` ("Petwell Pro") is the single source of
 *   truth for Pro access — never the product/price.
 * - `addCustomerInfoUpdateListener` keeps the app reactive to renewals, refunds,
 *   restores, and purchases made elsewhere (Family Sharing, other devices).
 * - Every method tolerates an unconfigured SDK (missing key) by no-opping.
 */

const EMPTY: SubscriptionSnapshot = { isPro: false, customerInfo: null };
const UNAVAILABLE = "Subscriptions aren't set up on this build.";

let configured = false;
const listeners = new Set<(snap: SubscriptionSnapshot) => void>();

function hasEntitlement(info: CustomerInfo): boolean {
  return info.entitlements.active[ENTITLEMENT_ID] !== undefined;
}

function snapshotFrom(info: CustomerInfo): SubscriptionSnapshot {
  return { isPro: hasEntitlement(info), customerInfo: info };
}

function emit(snap: SubscriptionSnapshot): void {
  for (const cb of listeners) cb(snap);
}

async function emitLatest(): Promise<void> {
  try {
    emit(snapshotFrom(await Purchases.getCustomerInfo()));
  } catch {
    // best-effort
  }
}

function mapPaywallResult(result: PAYWALL_RESULT): PaywallOutcome {
  switch (result) {
    case PAYWALL_RESULT.PURCHASED:
      return "purchased";
    case PAYWALL_RESULT.RESTORED:
      return "restored";
    case PAYWALL_RESULT.CANCELLED:
      return "cancelled";
    case PAYWALL_RESULT.NOT_PRESENTED:
      return "not_presented";
    default:
      return "error";
  }
}

/** Narrow an unknown thrown value to RevenueCat's error shape. */
function purchaseError(e: unknown): { userCancelled: boolean; message: string } {
  const err = e as { userCancelled?: boolean; message?: string };
  return { userCancelled: !!err.userCancelled, message: err.message ?? "Something went wrong." };
}

export const subscriptionService: SubscriptionService = {
  isSupported: isPurchasesConfigured,

  configure(appUserId) {
    if (configured || !isPurchasesConfigured) return;
    try {
      Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.ERROR);
      Purchases.configure({ apiKey: REVENUECAT_API_KEY, appUserID: appUserId ?? undefined });
      configured = true;
      Purchases.addCustomerInfoUpdateListener((info) => emit(snapshotFrom(info)));
    } catch (e) {
      console.warn("[petwell] RevenueCat configure failed:", e);
    }
  },

  async identify(userId, isAnonymous) {
    if (!configured) return;
    // Only tie purchases to a STABLE account id. Anonymous Supabase users keep
    // RevenueCat's own anonymous id, which transfers automatically on log-in.
    if (!userId || isAnonymous) return;
    try {
      const { customerInfo } = await Purchases.logIn(userId);
      emit(snapshotFrom(customerInfo));
    } catch (e) {
      console.warn("[petwell] RevenueCat logIn failed:", e);
    }
  },

  async signOut() {
    if (!configured) return;
    try {
      emit(snapshotFrom(await Purchases.logOut()));
    } catch {
      // logOut throws if the current user is already anonymous — safe to ignore.
    }
  },

  async getSnapshot() {
    if (!configured) return EMPTY;
    try {
      return snapshotFrom(await Purchases.getCustomerInfo());
    } catch {
      return EMPTY;
    }
  },

  async getOfferings() {
    if (!configured) return null;
    try {
      return await Purchases.getOfferings();
    } catch (e) {
      console.warn("[petwell] getOfferings failed:", e);
      return null;
    }
  },

  async purchasePackage(pkg): Promise<PurchaseOutcome> {
    if (!configured) return { ok: false, isPro: false, error: UNAVAILABLE };
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      emit(snapshotFrom(customerInfo));
      return { ok: true, isPro: hasEntitlement(customerInfo) };
    } catch (e) {
      const { userCancelled, message } = purchaseError(e);
      if (userCancelled) return { ok: false, isPro: false, cancelled: true };
      return { ok: false, isPro: false, error: message };
    }
  },

  async restore(): Promise<PurchaseOutcome> {
    if (!configured) return { ok: false, isPro: false, error: UNAVAILABLE };
    try {
      const info = await Purchases.restorePurchases();
      emit(snapshotFrom(info));
      return { ok: true, isPro: hasEntitlement(info) };
    } catch (e) {
      return { ok: false, isPro: false, error: purchaseError(e).message };
    }
  },

  async presentPaywall(offering?: PurchasesOffering | null): Promise<PaywallOutcome> {
    if (!configured) return "not_presented";
    try {
      const result = await RevenueCatUI.presentPaywall(
        offering ? { offering, displayCloseButton: true } : { displayCloseButton: true },
      );
      const outcome = mapPaywallResult(result);
      if (outcome === "purchased" || outcome === "restored") await emitLatest();
      return outcome;
    } catch (e) {
      console.warn("[petwell] presentPaywall failed:", e);
      return "error";
    }
  },

  async presentPaywallIfNeeded(): Promise<PaywallOutcome> {
    if (!configured) return "not_presented";
    try {
      const result = await RevenueCatUI.presentPaywallIfNeeded({
        requiredEntitlementIdentifier: ENTITLEMENT_ID,
      });
      const outcome = mapPaywallResult(result);
      if (outcome === "purchased" || outcome === "restored") await emitLatest();
      return outcome;
    } catch (e) {
      console.warn("[petwell] presentPaywallIfNeeded failed:", e);
      return "error";
    }
  },

  async presentCustomerCenter() {
    if (!configured) return;
    try {
      await RevenueCatUI.presentCustomerCenter();
      await emitLatest();
    } catch (e) {
      console.warn("[petwell] presentCustomerCenter failed:", e);
    }
  },

  addListener(cb) {
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  },
};

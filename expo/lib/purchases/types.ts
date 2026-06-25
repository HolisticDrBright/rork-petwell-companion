import type {
  CustomerInfo,
  PurchasesOffering,
  PurchasesOfferings,
  PurchasesPackage,
} from "react-native-purchases";

/**
 * Shared subscription types + the platform-agnostic service contract.
 *
 * Everything here is `import type` only, so this module (and anything that imports
 * just these types) is erased at compile time and is safe to bundle on web — the
 * native RevenueCat module is never pulled in.
 */
export type { CustomerInfo, PurchasesOffering, PurchasesOfferings, PurchasesPackage };

/** Outcome of presenting a paywall (platform-agnostic mirror of PAYWALL_RESULT). */
export type PaywallOutcome = "purchased" | "restored" | "cancelled" | "not_presented" | "error";

/** Outcome of a programmatic purchase or restore. */
export interface PurchaseOutcome {
  ok: boolean;
  isPro: boolean;
  /** The user backed out — not an error to surface loudly. */
  cancelled?: boolean;
  error?: string;
}

/** A renderable snapshot of entitlement state. */
export interface SubscriptionSnapshot {
  isPro: boolean;
  customerInfo: CustomerInfo | null;
}

/**
 * The contract both implementations satisfy: subscriptionService.native.ts (real
 * SDK on device) and subscriptionService.ts (web/unsupported no-op default).
 */
export interface SubscriptionService {
  /** False on web / when no key is configured — UIs can hide purchase affordances. */
  readonly isSupported: boolean;
  /** Configure the SDK once. `appUserId` ties purchases to a stable account (or null = anonymous). */
  configure(appUserId?: string | null): void;
  /** Re-identify after auth changes. Anonymous users stay on RevenueCat's own anonymous id. */
  identify(userId: string | null, isAnonymous: boolean): Promise<void>;
  /** Detach the current account (real sign-out). */
  signOut(): Promise<void>;
  getSnapshot(): Promise<SubscriptionSnapshot>;
  getOfferings(): Promise<PurchasesOfferings | null>;
  purchasePackage(pkg: PurchasesPackage): Promise<PurchaseOutcome>;
  restore(): Promise<PurchaseOutcome>;
  /** Present the RevenueCat Paywall UI (optionally for a specific offering). */
  presentPaywall(offering?: PurchasesOffering | null): Promise<PaywallOutcome>;
  /** Present the paywall only if the Pro entitlement is missing. */
  presentPaywallIfNeeded(): Promise<PaywallOutcome>;
  /** Present the RevenueCat Customer Center (manage/cancel/refund/restore). */
  presentCustomerCenter(): Promise<void>;
  /** Subscribe to live entitlement updates. Returns an unsubscribe fn. */
  addListener(cb: (snap: SubscriptionSnapshot) => void): () => void;
}

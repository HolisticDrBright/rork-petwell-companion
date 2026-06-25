import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { getAuthInfo } from "@/lib/backend";
import { ENTITLEMENT_ID } from "@/lib/purchases/config";
import type {
  CustomerInfo,
  PaywallOutcome,
  PurchaseOutcome,
  PurchasesOffering,
  PurchasesOfferings,
  PurchasesPackage,
} from "@/lib/purchases/types";
import { supabase } from "@/lib/supabase";
import { usePets } from "@/providers/PetProvider";
import { subscriptionService } from "@/services/subscriptionService";

interface SubscriptionContextValue {
  /** Initial entitlement + offerings have loaded. */
  ready: boolean;
  /** False on web / when no RevenueCat key is configured. */
  isSupported: boolean;
  /** The user has the Petwell Pro entitlement. */
  isPro: boolean;
  customerInfo: CustomerInfo | null;
  offerings: PurchasesOfferings | null;
  entitlementId: string;
  refresh: () => Promise<void>;
  purchase: (pkg: PurchasesPackage) => Promise<PurchaseOutcome>;
  restore: () => Promise<PurchaseOutcome>;
  presentPaywall: (offering?: PurchasesOffering | null) => Promise<PaywallOutcome>;
  manageSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

/**
 * Owns RevenueCat lifecycle: configure once, keep entitlement state reactive,
 * keep the RevenueCat identity in sync with Supabase auth, and mirror the Pro
 * entitlement onto the app's existing `premium` gate (RevenueCat is the source
 * of truth). Must live INSIDE PetProvider (it reads usePets()).
 */
export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { premium, setPremium } = usePets();

  const [ready, setReady] = useState<boolean>(false);
  const [isPro, setIsPro] = useState<boolean>(false);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [offerings, setOfferings] = useState<PurchasesOfferings | null>(null);

  // Configure + load initial state + subscribe to live entitlement updates.
  useEffect(() => {
    const { userId, isAnonymous } = getAuthInfo();
    subscriptionService.configure(userId && !isAnonymous ? userId : null);

    const unsubscribe = subscriptionService.addListener((snap) => {
      setIsPro(snap.isPro);
      setCustomerInfo(snap.customerInfo);
    });

    let active = true;
    (async () => {
      const auth = getAuthInfo();
      await subscriptionService.identify(auth.userId, auth.isAnonymous);
      const snap = await subscriptionService.getSnapshot();
      const offs = await subscriptionService.getOfferings();
      if (!active) return;
      setIsPro(snap.isPro);
      setCustomerInfo(snap.customerInfo);
      setOfferings(offs);
      setReady(true);
    })();

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  // Keep RevenueCat's identity aligned with Supabase auth (log in on real
  // sign-in so purchases follow the account across devices; log out on sign-out).
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      const user = session?.user;
      if (event === "SIGNED_OUT" || !user) {
        subscriptionService.signOut().catch(() => {});
        return;
      }
      const anon = (user as { is_anonymous?: boolean }).is_anonymous ?? !user.email;
      subscriptionService
        .identify(user.id, anon)
        .then(() => subscriptionService.getSnapshot())
        .then((snap) => {
          setIsPro(snap.isPro);
          setCustomerInfo(snap.customerInfo);
        })
        .catch(() => {});
    });
    return () => data.subscription.unsubscribe();
  }, []);

  // Bridge the entitlement onto the existing `premium` gate, but only once
  // entitlement state has actually loaded on a supported platform — otherwise the
  // initial isPro=false would briefly clear a real subscriber's premium flag.
  useEffect(() => {
    if (ready && subscriptionService.isSupported && isPro !== premium) setPremium(isPro);
  }, [ready, isPro, premium, setPremium]);

  const refresh = useCallback(async () => {
    const snap = await subscriptionService.getSnapshot();
    setIsPro(snap.isPro);
    setCustomerInfo(snap.customerInfo);
    setOfferings(await subscriptionService.getOfferings());
  }, []);

  const purchase = useCallback(
    async (pkg: PurchasesPackage) => {
      const outcome = await subscriptionService.purchasePackage(pkg);
      if (outcome.ok) await refresh();
      return outcome;
    },
    [refresh],
  );

  const restore = useCallback(async () => {
    const outcome = await subscriptionService.restore();
    if (outcome.ok) await refresh();
    return outcome;
  }, [refresh]);

  const presentPaywall = useCallback(
    async (offering?: PurchasesOffering | null) => {
      const outcome = await subscriptionService.presentPaywall(offering);
      if (outcome === "purchased" || outcome === "restored") await refresh();
      return outcome;
    },
    [refresh],
  );

  const manageSubscription = useCallback(async () => {
    await subscriptionService.presentCustomerCenter();
    await refresh();
  }, [refresh]);

  const value = useMemo<SubscriptionContextValue>(
    () => ({
      ready,
      isSupported: subscriptionService.isSupported,
      isPro,
      customerInfo,
      offerings,
      entitlementId: ENTITLEMENT_ID,
      refresh,
      purchase,
      restore,
      presentPaywall,
      manageSubscription,
    }),
    [ready, isPro, customerInfo, offerings, refresh, purchase, restore, presentPaywall, manageSubscription],
  );

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

export function useSubscription(): SubscriptionContextValue {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error("useSubscription must be used within a SubscriptionProvider");
  return ctx;
}

import type { PurchasesOfferings, PurchasesPackage } from "./types";

/**
 * Maps a RevenueCat offering's packages to Petwell's three plans
 * (monthly / yearly / lifetime) for a custom plan picker.
 *
 * Pure + web-safe (type-only imports). Matches by RevenueCat package type first
 * (the robust signal), then falls back to the product/package identifier so it
 * still works for the configured product ids "monthly" / "yearly" / "lifetime".
 * The `packageType` enum is string-valued, so we compare via a string cast to
 * avoid importing the runtime enum into web-bundled code.
 */
export interface Plans {
  monthly?: PurchasesPackage;
  yearly?: PurchasesPackage;
  lifetime?: PurchasesPackage;
}

export function mapPlans(offerings: PurchasesOfferings | null): Plans {
  const pkgs = offerings?.current?.availablePackages ?? [];
  const byType = (t: string) => pkgs.find((p) => (p.packageType as string) === t);
  const byId = (re: RegExp) => pkgs.find((p) => re.test(p.product.identifier) || re.test(p.identifier));
  return {
    monthly: byType("MONTHLY") ?? byId(/month/i),
    yearly: byType("ANNUAL") ?? byId(/year|annual/i),
    lifetime: byType("LIFETIME") ?? byId(/life/i),
  };
}

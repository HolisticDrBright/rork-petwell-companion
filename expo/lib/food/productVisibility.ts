/**
 * Central rule for which food products are visible to end users.
 *
 * Early seed migrations (0006, 0010) inserted fictional "(sample)" brands and
 * products purely to demonstrate the food-intelligence UI. Migration 0019 marks
 * every one of those rows `evidence_status = 'demo_seed'`. Real catalog data —
 * Open Pet Food Facts imports (`open_database`), crowdsourced submissions
 * (`crowdsourced_unverified`), admin-reviewed/verified rows, and brand-new rows
 * that haven't been graded yet (`null`) — is NOT demo and must keep showing.
 *
 * Production therefore hides ONLY `demo_seed` products. Dev / demo / admin builds
 * see everything so the team can inspect and clean up seed data.
 *
 * Use {@link excludeDemoProducts} on every `food_products` query that feeds a
 * user-facing surface (search, catalog/matching, bundles, barcode, alternatives).
 */
import { shouldShowDemoData } from "@/lib/dataMode";

/**
 * PostgREST OR-filter that keeps every real product and drops demo seeds.
 *
 * Null-safe by design: a plain `evidence_status <> 'demo_seed'` predicate would
 * also discard NULL rows (SQL three-valued logic), silently hiding real,
 * not-yet-graded products. The explicit `is.null` arm keeps them.
 */
export const NON_DEMO_PRODUCT_FILTER = "evidence_status.is.null,evidence_status.neq.demo_seed";

/** Whether the current build hides demo/seed products from users (production does). */
export function shouldHideDemoProducts(showDemo: boolean = shouldShowDemoData): boolean {
  return !showDemo;
}

/** Minimal shape of a Supabase query builder that supports `.or()`. */
export interface OrFilterableQuery<Q> {
  or(filters: string): Q;
}

/**
 * Hide demo/seed food products on user-facing queries in production builds.
 * Dev/demo/admin builds (or an explicit `showDemo = true`) pass through unchanged.
 *
 * @param query    a `food_products` Supabase query builder
 * @param showDemo override the data-mode default (e.g. admin tooling that always
 *                 wants to see demo rows). Defaults to the current data mode.
 */
export function excludeDemoProducts<Q extends OrFilterableQuery<Q>>(
  query: Q,
  showDemo: boolean = shouldShowDemoData,
): Q {
  return showDemo ? query : query.or(NON_DEMO_PRODUCT_FILTER);
}

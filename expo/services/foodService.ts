import { lookupOpenPetFoodFacts } from "@/lib/food/barcode";
import { buildReview, pickAlternatives, type AlternativeItem } from "@/lib/food/engine";
import { matchByText, type CatalogItem } from "@/lib/food/match";
import { buildAliasMap } from "@/lib/food/normalize";
import { parseLabelText } from "@/lib/food/ocr";
import { shouldShowDemoData } from "@/lib/dataMode";
import { isStale } from "@/lib/food/provenance";
import type {
  EvidenceSource,
  FoodReview,
  IngredientInfo,
  LabTest,
  PetContext,
  ProductBundle,
  RecallInfo,
  Severity,
} from "@/lib/food/types";
import { getUserId } from "@/lib/backend";
import { supabase } from "@/lib/supabase";
import type { Json } from "@/types/db";

const asJson = (v: unknown): Json => v as unknown as Json;

/** Supabase embeds one-to-one relations as object | array | null; normalize. */
function one<T>(v: T | T[] | null | undefined): T | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

export interface FoodProductSummary {
  id: string;
  name: string;
  productType: string;
  species: string;
  brand: string | null;
  calorieDensity: string | null;
  lifeStage: string | null;
}

export interface BarcodeLookupResult {
  productId: string | null;
  matchedName: string | null;
  brand: string | null;
  source: "catalog" | "openpetfoodfacts" | "none";
  rawLabelText: string | null;
  suggestions: { id: string; name: string; brand: string | null }[];
}

interface BundleFilter {
  ids?: string[];
  species?: "dog" | "cat";
  productType?: string;
  limit?: number;
}

export const foodService = {
  /** Manual fallback product search by name (used when no barcode/label match). */
  async searchProducts(query?: string): Promise<FoodProductSummary[]> {
    let q = supabase
      .from("food_products")
      .select("id, name, product_type, species, calorie_density, life_stage, food_brands(name)")
      .order("name", { ascending: true })
      .limit(50);
    if (query && query.trim()) q = q.ilike("name", `%${query.trim()}%`);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      productType: r.product_type,
      species: r.species,
      brand: one(r.food_brands as { name: string } | { name: string }[] | null)?.name ?? null,
      calorieDensity: r.calorie_density,
      lifeStage: r.life_stage,
    }));
  },

  /** Canonical ingredient names + alias map that power normalization/matching. */
  async getIngredientIndex(): Promise<{ canonicalNames: string[]; aliasMap: Record<string, string> }> {
    const [{ data: ings }, { data: aliases }] = await Promise.all([
      supabase.from("food_ingredients").select("name"),
      supabase.from("ingredient_aliases").select("alias, food_ingredients(name)"),
    ]);
    const canonicalNames = (ings ?? []).map((i) => i.name);
    const aliasMap = buildAliasMap(
      (aliases ?? [])
        .map((a) => ({
          alias: a.alias,
          canonical: one(a.food_ingredients as { name: string } | { name: string }[] | null)?.name ?? "",
        }))
        .filter((a) => a.canonical)
    );
    return { canonicalNames, aliasMap };
  },

  /** Lightweight catalog (id, name, barcode, ingredient names) for matching.
   * Capped defensively — if the catalog ever approaches this, move barcode/name
   * matching server-side (RPC) instead of fetching the catalog to match in JS. */
  async getCatalogItems(): Promise<CatalogItem[]> {
    const [{ data: products }, { data: links }] = await Promise.all([
      supabase.from("food_products").select("id, name, species, product_type, barcode, food_brands(name)").limit(2000),
      supabase.from("food_product_ingredients").select("product_id, food_ingredients(name)").limit(20000),
    ]);
    const byProduct = new Map<string, string[]>();
    for (const l of links ?? []) {
      const name = one(l.food_ingredients as { name: string } | { name: string }[] | null)?.name;
      if (!name) continue;
      const arr = byProduct.get(l.product_id) ?? [];
      arr.push(name);
      byProduct.set(l.product_id, arr);
    }
    return (products ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      brand: one(p.food_brands as { name: string } | { name: string }[] | null)?.name ?? null,
      barcode: p.barcode,
      species: p.species as CatalogItem["species"],
      productType: p.product_type,
      ingredientNames: byProduct.get(p.id) ?? [],
    }));
  },

  /** Assemble full ProductBundle(s) in a constant number of batched queries. */
  async getBundles(filter: BundleFilter): Promise<ProductBundle[]> {
    let pq = supabase
      .from("food_products")
      .select(
        `id, name, product_type, species, form, calorie_density, barcode, life_stage, aafco_statement, brand_id,
         food_brands ( id, name, manufacturer_quality_profiles ( owns_facilities, recall_count, transparency_score, notes ) ),
         nutrition_profiles ( protein_pct, fat_pct, fiber_pct, moisture_pct, kcal_per_100g )`
      );
    if (filter.ids) pq = pq.in("id", filter.ids);
    if (filter.species) pq = pq.in("species", [filter.species, "both"]);
    if (filter.productType) pq = pq.eq("product_type", filter.productType);
    if (filter.limit) pq = pq.limit(filter.limit);
    const { data: products, error } = await pq;
    if (error) throw error;
    if (!products || products.length === 0) return [];

    const productIds = products.map((p) => p.id);
    const brandIds = [...new Set(products.map((p) => p.brand_id).filter(Boolean))] as string[];
    const nowIso = new Date().toISOString();
    const emptyRows = () => Promise.resolve({ data: [] as Record<string, unknown>[] });

    const [ingRes, labRes, labTestProdRes, labTestBrandRes, recallProdRes, recallBrandRes, linkProdRes, linkBrandRes] =
      await Promise.all([
        supabase
          .from("food_product_ingredients")
          .select(`product_id, position, food_ingredients ( name, category, is_common_allergen, ingredient_flags ( flag_type, severity, message ) )`)
          .in("product_id", productIds)
          .order("position", { ascending: true }),
        // Product-level contaminant tests (original catalog table) — carry provenance.
        supabase
          .from("contaminant_tests")
          .select(`product_id, substance, substance_category, result, status, tested_at, lab, is_demo, level, evidence_status, expires_at, evidence_sources ( title )`)
          .in("product_id", productIds),
        // Generalized lab evidence (migration 0016): product-level rows for these products…
        supabase
          .from("lab_tests")
          .select("product_id, level, contaminant_category, substance, result_value, status, test_date, lab_name, source_url, evidence_status, expires_at")
          .in("product_id", productIds),
        // …and brand-level rows (no product_id) attached to every product of the brand.
        brandIds.length
          ? supabase
              .from("lab_tests")
              .select("brand_id, level, contaminant_category, substance, result_value, status, test_date, lab_name, source_url, evidence_status, expires_at")
              .in("brand_id", brandIds)
              .is("product_id", null)
          : emptyRows(),
        supabase.from("recall_events").select("product_id, recall_date, reason, severity, source_url, evidence_status").in("product_id", productIds),
        brandIds.length
          ? supabase.from("recall_events").select("brand_id, recall_date, reason, severity, source_url, evidence_status").in("brand_id", brandIds)
          : emptyRows(),
        supabase
          .from("evidence_links")
          .select(`product_id, relation, evidence_sources ( title, publisher, url, source_type )`)
          .in("product_id", productIds),
        brandIds.length
          ? supabase
              .from("evidence_links")
              .select(`brand_id, relation, evidence_sources ( title, publisher, url, source_type )`)
              .in("brand_id", brandIds)
          : emptyRows(),
      ]);

    const ingByProduct = new Map<string, IngredientInfo[]>();
    for (const row of (ingRes.data ?? []) as Record<string, unknown>[]) {
      const ing = one(row.food_ingredients as { name: string; category: string | null; is_common_allergen: boolean; ingredient_flags: { flag_type: string; severity: string; message: string }[] } | null);
      if (!ing) continue;
      const arr = ingByProduct.get(row.product_id as string) ?? [];
      arr.push({
        name: ing.name,
        category: ing.category,
        position: (row.position as number) ?? 0,
        isCommonAllergen: !!ing.is_common_allergen,
        flags: (ing.ingredient_flags ?? []).map((f) => ({
          flagType: f.flag_type,
          severity: (f.severity as Severity) ?? "watch",
          message: f.message,
        })),
      });
      ingByProduct.set(row.product_id as string, arr);
    }

    // An expired lab row is downgraded to `stale` so it can never raise purity.
    const provStatus = (status: unknown, expiresAt: unknown): LabTest["evidenceStatus"] =>
      isStale(expiresAt as string | null, nowIso) ? "stale" : ((status as LabTest["evidenceStatus"]) ?? null);

    const labByProduct = new Map<string, LabTest[]>();
    const pushLab = (productId: string, t: LabTest) => {
      const arr = labByProduct.get(productId) ?? [];
      arr.push(t);
      labByProduct.set(productId, arr);
    };

    // contaminant_tests: product-level seeds and any real product-level COAs.
    for (const row of (labRes.data ?? []) as Record<string, unknown>[]) {
      pushLab(row.product_id as string, {
        substance: row.substance as string,
        substanceCategory: (row.substance_category as string) ?? null,
        result: row.result as string,
        status: (row.status as LabTest["status"]) ?? null,
        testedAt: (row.tested_at as string) ?? null,
        lab: (row.lab as string) ?? null,
        isDemo: !!row.is_demo,
        sourceTitle: one(row.evidence_sources as { title: string } | null)?.title ?? null,
        level: (row.level as LabTest["level"]) ?? "product",
        evidenceStatus: provStatus(row.evidence_status, row.expires_at),
      });
    }

    // lab_tests (migration 0016): generalized brand/study/batch evidence. These are
    // never demo; provenance gating keeps brand/study rows from raising purity.
    const toLabTest = (row: Record<string, unknown>): LabTest => ({
      substance: (row.substance as string) ?? (row.contaminant_category as string) ?? "Contaminant panel",
      substanceCategory: (row.contaminant_category as string) ?? null,
      result: (row.result_value as string) ?? "see report",
      status: (row.status as LabTest["status"]) ?? null,
      testedAt: (row.test_date as string) ?? null,
      lab: (row.lab_name as string) ?? null,
      isDemo: false,
      sourceTitle: (row.lab_name as string) ?? null,
      level: (row.level as LabTest["level"]) ?? "brand",
      evidenceStatus: provStatus(row.evidence_status, row.expires_at),
    });
    for (const row of (labTestProdRes.data ?? []) as Record<string, unknown>[]) {
      pushLab(row.product_id as string, toLabTest(row));
    }
    const labTestByBrand = new Map<string, LabTest[]>();
    for (const row of (labTestBrandRes.data ?? []) as Record<string, unknown>[]) {
      const arr = labTestByBrand.get(row.brand_id as string) ?? [];
      arr.push(toLabTest(row));
      labTestByBrand.set(row.brand_id as string, arr);
    }

    const recallByProduct = new Map<string, RecallInfo[]>();
    const recallByBrand = new Map<string, RecallInfo[]>();
    const toRecall = (r: Record<string, unknown>): RecallInfo => ({
      recallDate: (r.recall_date as string) ?? null,
      reason: r.reason as string,
      severity: (r.severity as Severity) ?? "watch",
      sourceUrl: (r.source_url as string) ?? null,
      isDemo: r.evidence_status === "demo_seed",
    });
    for (const r of (recallProdRes.data ?? []) as Record<string, unknown>[]) {
      const arr = recallByProduct.get(r.product_id as string) ?? [];
      arr.push(toRecall(r));
      recallByProduct.set(r.product_id as string, arr);
    }
    for (const r of (recallBrandRes.data ?? []) as Record<string, unknown>[]) {
      const arr = recallByBrand.get(r.brand_id as string) ?? [];
      arr.push(toRecall(r));
      recallByBrand.set(r.brand_id as string, arr);
    }

    const srcByProduct = new Map<string, EvidenceSource[]>();
    const srcByBrand = new Map<string, EvidenceSource[]>();
    const toSource = (row: Record<string, unknown>): EvidenceSource | null => {
      const s = one(row.evidence_sources as { title: string; publisher: string | null; url: string | null; source_type: string | null } | null);
      if (!s) return null;
      return {
        title: s.title,
        publisher: s.publisher,
        url: s.url,
        sourceType: s.source_type,
        relation: (row.relation as string) ?? null,
        isDemo: s.source_type === "demo",
      };
    };
    for (const row of (linkProdRes.data ?? []) as Record<string, unknown>[]) {
      const s = toSource(row);
      if (!s) continue;
      const arr = srcByProduct.get(row.product_id as string) ?? [];
      arr.push(s);
      srcByProduct.set(row.product_id as string, arr);
    }
    for (const row of (linkBrandRes.data ?? []) as Record<string, unknown>[]) {
      const s = toSource(row);
      if (!s) continue;
      const arr = srcByBrand.get(row.brand_id as string) ?? [];
      arr.push(s);
      srcByBrand.set(row.brand_id as string, arr);
    }

    return products.map((p) => {
      const brandRow = one(p.food_brands as { id: string; name: string; manufacturer_quality_profiles: { owns_facilities: boolean | null; recall_count: number | null; transparency_score: number | null; notes: string | null } | { owns_facilities: boolean | null; recall_count: number | null; transparency_score: number | null; notes: string | null }[] | null } | null);
      const mqp = brandRow ? one(brandRow.manufacturer_quality_profiles) : null;
      const nut = one(p.nutrition_profiles as { protein_pct: number | null; fat_pct: number | null; fiber_pct: number | null; moisture_pct: number | null; kcal_per_100g: number | null } | null);
      const brandId = p.brand_id as string | null;
      return {
        id: p.id,
        name: p.name,
        productType: p.product_type as ProductBundle["productType"],
        species: p.species as ProductBundle["species"],
        form: p.form,
        calorieDensity: p.calorie_density,
        barcode: p.barcode,
        lifeStage: p.life_stage as ProductBundle["lifeStage"],
        aafcoStatement: p.aafco_statement,
        brand: brandRow
          ? {
              id: brandRow.id,
              name: brandRow.name,
              ownsFacilities: mqp?.owns_facilities ?? null,
              recallCount: mqp?.recall_count ?? 0,
              transparencyScore: mqp?.transparency_score ?? null,
              notes: mqp?.notes ?? null,
            }
          : null,
        ingredients: ingByProduct.get(p.id) ?? [],
        nutrition: nut
          ? {
              proteinPct: nut.protein_pct,
              fatPct: nut.fat_pct,
              fiberPct: nut.fiber_pct,
              moisturePct: nut.moisture_pct,
              kcalPer100g: nut.kcal_per_100g,
            }
          : null,
        // Production user views never show demo/seed lab or source rows — they're
        // illustrative only and would otherwise read as evidence. (Purity then
        // correctly falls back to "no public lab test found".) Admin/dev/demo keep
        // them. Demo rows can never raise purity regardless (countsAsProductLevelPurity).
        labTests: [...(labByProduct.get(p.id) ?? []), ...(brandId ? labTestByBrand.get(brandId) ?? [] : [])].filter(
          (t) => shouldShowDemoData || !t.isDemo,
        ),
        recalls: [...(recallByProduct.get(p.id) ?? []), ...(brandId ? recallByBrand.get(brandId) ?? [] : [])].filter(
          (r) => shouldShowDemoData || !r.isDemo,
        ),
        sources: [...(srcByProduct.get(p.id) ?? []), ...(brandId ? srcByBrand.get(brandId) ?? [] : [])].filter(
          (s) => shouldShowDemoData || !s.isDemo,
        ),
      };
    });
  },

  async getProductBundle(productId: string): Promise<ProductBundle | null> {
    const bundles = await foodService.getBundles({ ids: [productId] });
    return bundles[0] ?? null;
  },

  /**
   * Barcode lookup: local catalog first (instant, offline-safe), then Open Pet
   * Food Facts, whose printed ingredients are matched back to the catalog.
   */
  async lookupByBarcode(barcode: string): Promise<BarcodeLookupResult> {
    const code = barcode.trim();
    const empty: BarcodeLookupResult = {
      productId: null,
      matchedName: null,
      brand: null,
      source: "none",
      rawLabelText: null,
      suggestions: [],
    };
    if (!code) return empty;

    const { data: hit } = await supabase
      .from("food_products")
      .select("id, name, food_brands(name)")
      .eq("barcode", code)
      .maybeSingle();
    if (hit) {
      return {
        productId: hit.id,
        matchedName: hit.name,
        brand: one(hit.food_brands as { name: string } | { name: string }[] | null)?.name ?? null,
        source: "catalog",
        rawLabelText: null,
        suggestions: [],
      };
    }

    const opff = await lookupOpenPetFoodFacts(code);
    if (!opff.found) return empty;

    let productId: string | null = null;
    let matchedName = opff.name;
    let brand = opff.brand;
    let suggestions: { id: string; name: string; brand: string | null }[] = [];
    if (opff.ingredientsText) {
      const [idx, items] = await Promise.all([foodService.getIngredientIndex(), foodService.getCatalogItems()]);
      const parsed = parseLabelText(`Ingredients: ${opff.ingredientsText}`);
      const m = matchByText(parsed, items, {
        nameHint: opff.name ?? "",
        canonicalNames: idx.canonicalNames,
        aliasMap: idx.aliasMap,
      });
      if (m.best) {
        productId = m.best.id;
        matchedName = m.best.name;
        brand = m.best.brand;
      }
      suggestions = m.suggestions.map((s) => ({ id: s.id, name: s.name, brand: s.brand }));
    }
    return { productId, matchedName, brand, source: "openpetfoodfacts", rawLabelText: opff.ingredientsText, suggestions };
  },

  /** Match a pasted/scanned label to the catalog. */
  async matchLabel(rawText: string, nameHint?: string): Promise<BarcodeLookupResult> {
    const [idx, items] = await Promise.all([foodService.getIngredientIndex(), foodService.getCatalogItems()]);
    const parsed = parseLabelText(rawText);
    const m = matchByText(parsed, items, { nameHint: nameHint ?? "", canonicalNames: idx.canonicalNames, aliasMap: idx.aliasMap });
    return {
      productId: m.best?.id ?? null,
      matchedName: m.best?.name ?? null,
      brand: m.best?.brand ?? null,
      source: m.best ? "catalog" : "none",
      rawLabelText: rawText,
      suggestions: m.suggestions.map((s) => ({ id: s.id, name: s.name, brand: s.brand })),
    };
  },

  /** Catalog alternatives for this pet (data-backed, never purity claims). */
  async getAlternatives(
    pet: PetContext,
    opts: { currentId: string; species: "dog" | "cat"; productType: string; nowIso: string }
  ): Promise<AlternativeItem[]> {
    // Only 3 alternatives are ever shown; cap the candidate pool so we don't
    // download + score the entire species catalog on every food-result load.
    const bundles = await foodService.getBundles({ species: opts.species, productType: opts.productType, limit: 60 });
    const candidates = bundles.map((b) => ({ bundle: b, review: buildReview({ bundle: b, pet, nowIso: opts.nowIso }) }));
    return pickAlternatives(opts.currentId, candidates, pet);
  },

  /** A scan/search creates a food_scan record (best-effort; null in local mode). */
  async createScan(
    petId: string,
    input: { productId?: string | null; rawLabelText?: string | null; imagePath?: string | null }
  ): Promise<string | null> {
    const owner_id = getUserId();
    if (!owner_id) return null;
    const { data, error } = await supabase
      .from("food_scans")
      .insert({
        pet_id: petId,
        owner_id,
        product_id: input.productId ?? null,
        raw_label_text: input.rawLabelText ?? null,
        image_path: input.imagePath ?? null,
      })
      .select("id")
      .single();
    if (error) throw error;
    return data.id;
  },

  /** Persist the pet-personalized review (sub-scores + recommendation). */
  async saveReview(
    petId: string,
    input: { productId?: string | null; scanId?: string | null; review: FoodReview; watchWindow?: string }
  ): Promise<void> {
    const owner_id = getUserId();
    if (!owner_id) return;
    const r = input.review;
    const sub = (k: string): number | null => r.subScores.find((s) => s.key === k)?.score ?? null;
    const { error } = await supabase.from("food_scores").insert({
      product_id: input.productId ?? null,
      food_scan_id: input.scanId ?? null,
      owner_id,
      pet_id: petId,
      grade: r.grade,
      summary: r.reason,
      factors: asJson(r.whyFactors),
      nutrition_fit_score: sub("nutrition_fit"),
      ingredient_quality_score: sub("ingredient_quality"),
      contaminant_confidence_score: sub("contaminant_confidence"),
      brand_transparency_score: sub("brand_transparency"),
      recall_risk_score: sub("recall_risk"),
      personal_outcome_score: sub("personal_outcome"),
      overall_score: r.overallScore,
      recommendation: r.recommendation,
    });
    if (error) throw error;
    await supabase.from("food_recommendations").insert({
      pet_id: petId,
      owner_id,
      product_id: input.productId ?? null,
      food_scan_id: input.scanId ?? null,
      recommendation: `${r.recommendationLabel}: ${r.reason}`,
      watch_window: input.watchWindow ?? null,
    });
  },

  async logFood(
    petId: string,
    input: { label: string; portion?: string; productId?: string; foodScanId?: string }
  ): Promise<void> {
    const owner_id = getUserId();
    if (!owner_id) throw new Error("Not authenticated");
    const { error } = await supabase.from("food_logs").insert({
      pet_id: petId,
      owner_id,
      label: input.label,
      portion: input.portion ?? null,
      product_id: input.productId ?? null,
      food_scan_id: input.foodScanId ?? null,
    });
    if (error) throw error;
  },

  /** Manual correction flow — every AI-like result is user-correctable. */
  async saveCorrection(input: {
    entityType: string;
    entityId?: string | null;
    field?: string;
    oldValue?: string;
    newValue?: string;
    note?: string;
  }): Promise<void> {
    const owner_id = getUserId();
    if (!owner_id) return;
    await supabase.from("user_corrections").insert({
      owner_id,
      entity_type: input.entityType,
      entity_id: input.entityId ?? null,
      field: input.field ?? null,
      old_value: input.oldValue ?? null,
      new_value: input.newValue ?? null,
      note: input.note ?? null,
    });
  },

  async listEvidence(): Promise<
    { id: string; title: string; publisher: string | null; url: string | null; summary: string | null }[]
  > {
    const { data, error } = await supabase
      .from("evidence_sources")
      .select("id, title, publisher, url, summary")
      .order("title", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },
};

import { getUserId } from "@/lib/backend";
import { supabase } from "@/lib/supabase";
import type { Json } from "@/types/db";

const asJson = (v: unknown): Json => v as unknown as Json;

export interface FoodProductSummary {
  id: string;
  name: string;
  productType: string;
  species: string;
  brand: string | null;
  calorieDensity: string | null;
}

export interface IngredientFlag {
  ingredient: string;
  flagType: string;
  severity: "good" | "watch" | "bad";
  message: string;
}

export interface FoodScore {
  grade: string;
  summary: string;
  factors: { label: string; severity: "good" | "watch" | "bad" }[];
}

function letterFor(score: number): string {
  if (score >= 93) return "A";
  if (score >= 88) return "A−";
  if (score >= 83) return "B+";
  if (score >= 78) return "B";
  if (score >= 73) return "B−";
  if (score >= 68) return "C+";
  if (score >= 63) return "C";
  if (score >= 58) return "C−";
  if (score >= 50) return "D";
  return "F";
}

export const foodService = {
  async searchProducts(query?: string): Promise<FoodProductSummary[]> {
    let q = supabase
      .from("food_products")
      .select("id, name, product_type, species, calorie_density, food_brands(name)")
      .order("name", { ascending: true });
    if (query && query.trim()) q = q.ilike("name", `%${query.trim()}%`);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).map((r) => {
      const brand = r.food_brands as { name: string } | null;
      return {
        id: r.id,
        name: r.name,
        productType: r.product_type,
        species: r.species,
        brand: brand?.name ?? null,
        calorieDensity: r.calorie_density,
      };
    });
  },

  /** Ingredient-level flags for a product (drives the food-label scan view). */
  async getIngredientFlags(productId: string): Promise<IngredientFlag[]> {
    const { data, error } = await supabase
      .from("food_product_ingredients")
      .select("position, food_ingredients(name, ingredient_flags(flag_type, severity, message))")
      .eq("product_id", productId)
      .order("position", { ascending: true });
    if (error) throw error;
    const flags: IngredientFlag[] = [];
    (data ?? []).forEach((row) => {
      const ing = row.food_ingredients as
        | { name: string; ingredient_flags: { flag_type: string; severity: string; message: string }[] }
        | null;
      if (!ing) return;
      (ing.ingredient_flags ?? []).forEach((f) => {
        flags.push({
          ingredient: ing.name,
          flagType: f.flag_type,
          severity: (f.severity as IngredientFlag["severity"]) ?? "watch",
          message: f.message,
        });
      });
    });
    return flags;
  },

  /**
   * Brand-neutral score from ingredient flags + calorie density. Computed, then
   * persisted to food_scores for the current user. No paid placement, no
   * endorsement — purely the data on the label.
   */
  async scoreProduct(productId: string): Promise<FoodScore> {
    const flags = await foodService.getIngredientFlags(productId);
    const { data: product } = await supabase
      .from("food_products")
      .select("calorie_density")
      .eq("id", productId)
      .single();

    let score = 90;
    const factors: FoodScore["factors"] = [];
    for (const f of flags) {
      if (f.severity === "bad") score -= 12;
      else if (f.severity === "watch") score -= 5;
      else score += 2;
      factors.push({ label: f.message, severity: f.severity });
    }
    if (product?.calorie_density === "calorie-dense") {
      score -= 5;
      factors.push({ label: "Calorie-dense — use sparingly", severity: "watch" });
    }
    score = Math.max(0, Math.min(100, score));
    const grade = letterFor(score);
    const summary =
      factors.some((f) => f.severity === "bad")
        ? "Some ingredients may not suit every pet — review the flags below."
        : "No major concerns on the label; feed to plan and watch your pet's response.";

    const owner_id = getUserId();
    if (owner_id) {
      await supabase
        .from("food_scores")
        .insert({ product_id: productId, owner_id, grade, summary, factors: asJson(factors) });
    }
    return { grade, summary, factors };
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

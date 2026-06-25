import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import {
  AlertTriangle,
  Beaker,
  Check,
  ChevronLeft,
  ExternalLink,
  FlaskConical,
  Info,
  Leaf,
  PawPrint,
  Pencil,
  ShieldCheck,
  Sparkles,
  Upload,
  X,
} from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Card, Disclaimer, PrimaryButton } from "@/components/ui";
import Colors, { Fonts, Radius, Space, softShadow } from "@/constants/colors";
import { PHOTO_LIMITATION } from "@/lib/food/evidence";
import { buildReview, type AlternativeItem } from "@/lib/food/engine";
import type { FoodReview, PetContext, ProductBundle, Severity } from "@/lib/food/types";
import { tcmForIngredients, thermalSummary } from "@/lib/integrative/engine";
import { usePets } from "@/providers/PetProvider";
import { foodService, labelSubmissionService } from "@/services";

const TONE = {
  good: { color: Colors.green600, bg: Colors.green100 },
  watch: { color: Colors.amber600, bg: Colors.amber100 },
  bad: { color: Colors.coral600, bg: Colors.coral100 },
} as const;

type ProvTone = "good" | "info" | "warn" | "muted";
const PROV_TONE: Record<ProvTone, { color: string; bg: string }> = {
  good: { color: Colors.green600, bg: Colors.green100 },
  info: { color: Colors.teal700, bg: Colors.teal50 },
  warn: { color: Colors.amber600, bg: Colors.amber100 },
  muted: { color: Colors.inkSoft, bg: Colors.cream2 },
};

function ProvChip({ label, tone }: { label: string; tone: ProvTone }) {
  const c = PROV_TONE[tone];
  return (
    <View style={[styles.provChip, { backgroundColor: c.bg }]}>
      <Text style={[styles.provChipText, { color: c.color }]}>{label}</Text>
    </View>
  );
}

/** Match-confidence label from how the product was found. */
function matchLabel(source: string | undefined): string {
  if (source === "barcode") return "Exact barcode match";
  if (source === "photo" || source === "paste") return "Label match — confirm";
  if (source === "search") return "You picked this";
  return "Matched";
}

/** Lab-evidence badge from the review's purity summary (never overclaims). */
function labBadge(purity: FoodReview["purity"]): { label: string; tone: ProvTone } {
  if (!purity.hasEvidence) return { label: "No lab data", tone: "muted" };
  if (purity.demoOnly) return { label: "Demo data", tone: "warn" };
  if (purity.confidence === "supported" || purity.confidence === "moderate")
    return { label: "Product-level lab", tone: "good" };
  return { label: "Brand-level only", tone: "info" };
}

function sourceBadge(sources: FoodReview["sources"]): { label: string; tone: ProvTone } {
  if (sources.length === 0) return { label: "No sources", tone: "muted" };
  if (sources.some((s) => !s.isDemo)) return { label: "Open database", tone: "info" };
  return { label: "Demo source", tone: "warn" };
}

const REC_STYLE = {
  good_fit: { color: Colors.green600, bg: Colors.green100, label: "Good fit" },
  use_caution: { color: Colors.amber600, bg: Colors.amber100, label: "Use caution" },
  avoid: { color: Colors.red600, bg: Colors.red100, label: "Avoid for this pet" },
} as const;

function bandColor(score: number): string {
  if (score >= 75) return Colors.green600;
  if (score >= 55) return Colors.amber600;
  return Colors.coral600;
}

function nowLabel(): string {
  const d = new Date();
  let h = d.getHours();
  const m = d.getMinutes();
  const ap = h < 12 ? "a" : "p";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m.toString().padStart(2, "0")}${ap}`;
}

interface Loaded {
  review: FoodReview;
  bundle: ProductBundle;
  alternatives: AlternativeItem[];
  scanId: string | null;
}

export default function FoodResultScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { productId, raw, image, source } = useLocalSearchParams<{
    productId: string;
    raw?: string;
    source?: string;
    image?: string;
  }>();
  const { selectedPet, addLog, todayIso, mode } = usePets();

  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<boolean>(false);
  const [reviewSubmitted, setReviewSubmitted] = useState<boolean>(false);

  const onSubmitForReview = useCallback(async () => {
    if (!raw || reviewSubmitted) return;
    setReviewSubmitted(true);
    try {
      await labelSubmissionService.submit({
        rawText: raw,
        matchedProductId: productId ?? null,
        matchConfidence: source ?? "manual",
      });
    } catch {
      // best-effort; the optimistic confirmation stays
    }
  }, [raw, productId, source, reviewSubmitted]);

  const petContext: PetContext = useMemo(
    () => ({
      name: selectedPet.name,
      species: selectedPet.species,
      ageYears: selectedPet.ageYears,
      allergies: selectedPet.allergies,
      conditions: selectedPet.conditions,
      calorieConcern: /weight|obes|over/i.test(selectedPet.conditions.join(" ")),
    }),
    [selectedPet]
  );

  useEffect(() => {
    let active = true;
    // Clear the previous product's review while the new one loads (tapping an
    // alternative re-runs this effect with a new productId).
    setData(null);
    setError(null);
    setSaved(false);
    (async () => {
      try {
        const bundle = await foodService.getProductBundle(productId);
        if (!bundle) {
          if (active) setError("We couldn't load that product. Try searching for it by name.");
          return;
        }
        const review = buildReview({ bundle, pet: petContext, nowIso: todayIso });
        const alternatives = await foodService
          .getAlternatives(petContext, {
            currentId: bundle.id,
            species: petContext.species,
            productType: bundle.productType,
            nowIso: todayIso,
          })
          .catch(() => [] as AlternativeItem[]);

        // A scan/search creates a food_scan record; the review is persisted too
        // (both best-effort — no-ops in local mode).
        let scanId: string | null = null;
        try {
          scanId = await foodService.createScan(selectedPet.id, {
            productId: bundle.id,
            rawLabelText: raw || null,
            imagePath: image || null,
          });
          await foodService.saveReview(selectedPet.id, { productId: bundle.id, scanId, review });
        } catch (e) {
          console.warn("[petwell] food review save failed:", e);
        }
        if (active) setData({ review, bundle, alternatives, scanId });
      } catch (e) {
        console.warn("[petwell] food result load failed:", e);
        if (active) setError("Something went wrong loading this review.");
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const recUrgency = useCallback((rec: FoodReview["recommendation"]) => {
    return rec === "good_fit" ? ("green" as const) : rec === "use_caution" ? ("amber" as const) : ("red" as const);
  }, []);

  const saveToLog = useCallback(() => {
    if (!data) return;
    const { review, bundle, scanId } = data;
    addLog(selectedPet.id, {
      id: `food-${Date.now()}`,
      petId: selectedPet.id,
      date: todayIso,
      time: nowLabel(),
      category: "food",
      title: `${bundle.name} — ${review.recommendationLabel}`,
      detail: `Grade ${review.grade} · ${review.overallScore}/100`,
      urgency: recUrgency(review.recommendation),
    });
    if (mode === "remote") {
      foodService
        .logFood(selectedPet.id, {
          label: bundle.name,
          productId: bundle.id,
          foodScanId: scanId ?? undefined,
        })
        .catch((e) => console.warn("[petwell] food log failed:", e));
    }
    setSaved(true);
  }, [data, addLog, selectedPet.id, todayIso, mode, recUrgency]);

  const correctMatch = useCallback(() => {
    if (data && mode === "remote") {
      foodService
        .saveCorrection({
          entityType: "food_scan",
          entityId: data.scanId,
          field: "product_id",
          oldValue: data.bundle.name,
          note: "User flagged the matched product as incorrect.",
        })
        .catch((e) => console.warn("[petwell] correction failed:", e));
    }
    router.replace({ pathname: "/food-scan", params: { mode: "search" } });
  }, [data, mode, router]);

  if (error) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={Fonts.h2}>Hmm.</Text>
        <Text style={[Fonts.bodySoft, { textAlign: "center", marginTop: 6 }]}>{error}</Text>
        <PrimaryButton label="Back to search" variant="primary" onPress={() => router.replace("/food-scan")} style={{ marginTop: Space.lg }} />
      </View>
    );
  }

  if (!data) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator color={Colors.teal700} />
        <Text style={[Fonts.bodySoft, { marginTop: 10 }]}>Building {selectedPet.name}&apos;s review…</Text>
      </View>
    );
  }

  const { review, bundle, alternatives } = data;
  const rec = REC_STYLE[review.recommendation];
  const lab = labBadge(review.purity);
  const src = sourceBadge(review.sources);
  const recallChip =
    review.recallStatus.status === "active"
      ? { label: "Recall history found", tone: "warn" as const }
      : review.recallStatus.status === "watch"
        ? { label: "Recall watch", tone: "warn" as const }
        : { label: "No recalls found", tone: "good" as const };
  const tcm = tcmForIngredients(bundle.ingredients.map((i) => i.name), petContext.species);
  const tcmSummary = thermalSummary(tcm);
  const thermalTone = (n: string) =>
    n === "warming" ? Colors.coral600 : n === "cooling" ? Colors.teal700 : Colors.inkSoft;
  const thermalBg = (n: string) =>
    n === "warming" ? Colors.coral100 : n === "cooling" ? Colors.teal50 : Colors.cream2;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.topbar}>
        <Pressable
          onPress={() => router.back()}
          style={styles.iconBtn}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ChevronLeft size={24} color={Colors.ink} />
        </Pressable>
        <Text style={Fonts.h3}>Food review</Text>
        <Pressable
          onPress={() => router.replace("/(tabs)/scan")}
          style={styles.iconBtn}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <X size={22} color={Colors.ink} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: Space.md, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        {/* Product match */}
        <View style={styles.matchRow}>
          <View style={styles.matchIcon}>
            <PawPrint size={20} color={Colors.teal700} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.productName}>{bundle.name}</Text>
            <Text style={Fonts.small}>
              {[bundle.brand?.name, bundle.productType, bundle.lifeStage ? `${bundle.lifeStage} stage` : null]
                .filter(Boolean)
                .join(" · ")}
            </Text>
          </View>
        </View>

        {/* Evidence & provenance — match confidence, lab level, recall status, source type */}
        <View style={styles.badgesRow}>
          <ProvChip label={matchLabel(source)} tone="info" />
          <ProvChip label={lab.label} tone={lab.tone} />
          <ProvChip label={recallChip.label} tone={recallChip.tone} />
          <ProvChip label={src.label} tone={src.tone} />
        </View>

        {/* Overall score + recommendation (the headline overall_recommendation) */}
        <View style={[styles.hero, { backgroundColor: rec.bg }]}>
          <View style={styles.gradeCircle}>
            <Text style={styles.gradeLetter}>{review.grade}</Text>
            <Text style={styles.gradeScore}>{review.overallScore}/100</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.recLabel, { color: rec.color }]}>{review.recommendationLabel}</Text>
            <Text style={styles.recReason}>{review.reason}</Text>
            <Text style={styles.forPet}>for {selectedPet.name}</Text>
          </View>
        </View>

        {/* Why this matters — plain-language explainability */}
        <View style={styles.whyMatters}>
          <Info size={14} color={Colors.teal700} />
          <Text style={styles.whyMattersText}>
            Personalized to {selectedPet.name}&apos;s profile, allergies, and conditions — weighing
            ingredients, nutrition fit, recalls, lab evidence, and brand transparency. Guidance, not a
            diagnosis.
          </Text>
        </View>

        {/* Allergy conflicts — safety first */}
        {review.allergyConflicts.length ? (
          <View style={[styles.alertCard, { backgroundColor: Colors.red100 }]}>
            <View style={styles.alertHead}>
              <AlertTriangle size={18} color={Colors.red600} />
              <Text style={[styles.alertTitle, { color: Colors.red600 }]}>Allergy conflict</Text>
            </View>
            {review.allergyConflicts.map((c) => (
              <View key={`${c.allergen}-${c.ingredient}`} style={styles.bulletRow}>
                <View style={[styles.dot, { backgroundColor: c.severity === "high" ? Colors.red600 : Colors.amber600 }]} />
                <Text style={styles.bulletText}>
                  <Text style={{ fontWeight: "800" }}>{c.ingredient}</Text> — {c.note}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* The six sub-scores */}
        <Text style={styles.sectionTitle}>Score breakdown</Text>
        <Text style={styles.sectionHint}>Each factor is 0–100 — higher is better. Together they set the grade above.</Text>
        <Card style={{ gap: 14, marginTop: 8 }}>
          {review.subScores.map((s) => (
            <View key={s.key}>
              <View style={styles.scoreHead}>
                <Text style={styles.scoreLabel}>{s.label}</Text>
                <Text style={[styles.scoreVal, { color: bandColor(s.score) }]}>{s.score}</Text>
              </View>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${s.score}%`, backgroundColor: bandColor(s.score) }]} />
              </View>
              {s.note ? <Text style={styles.scoreNote}>{s.note}</Text> : null}
            </View>
          ))}
        </Card>

        {/* AAFCO + life stage */}
        <Text style={styles.sectionTitle}>Nutrition & life stage</Text>
        <Card style={{ gap: 0, marginTop: 8 }}>
          <FitRow label="AAFCO statement" fit={review.aafco.fit} text={review.aafco.text} />
          <View style={styles.divider} />
          <FitRow label="Life-stage fit" fit={review.lifeStageFit.fit} text={review.lifeStageFit.text} />
        </Card>

        {/* Purity / lab evidence — the safety rule, surfaced honestly */}
        <Text style={styles.sectionTitle}>Purity & lab evidence</Text>
        <Card style={{ gap: 10, marginTop: 8 }}>
          <View style={styles.purityHead}>
            <FlaskConical size={18} color={review.purity.hasEvidence ? Colors.teal700 : Colors.amber600} />
            <Text style={styles.purityConfidence}>
              {review.purity.confidence === "none"
                ? "No public lab test found"
                : `Purity confidence: ${review.purity.confidence}`}
            </Text>
          </View>
          <Text style={styles.purityText}>{review.purity.text}</Text>
          {review.purity.tests.map((t, i) => (
            <View key={i} style={styles.labRow}>
              <View style={[styles.labStatus, { backgroundColor: t.status === "pass" ? Colors.green100 : Colors.coral100 }]}>
                <Text style={[styles.labStatusText, { color: t.status === "pass" ? Colors.green600 : Colors.coral600 }]}>
                  {(t.status ?? "n/a").toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.labSubstance}>
                  {t.substance}
                  {t.substanceCategory ? <Text style={Fonts.tiny}> · {t.substanceCategory.replace("_", " ")}</Text> : null}
                </Text>
                <Text style={styles.labResult}>{t.result}</Text>
              </View>
              {t.isDemo ? (
                <View style={styles.demoBadge}>
                  <Text style={styles.demoBadgeText}>DEMO</Text>
                </View>
              ) : null}
            </View>
          ))}
          <View style={styles.limitNote}>
            <Info size={14} color={Colors.inkFaint} />
            <Text style={styles.limitText}>{PHOTO_LIMITATION}</Text>
          </View>
        </Card>

        {/* Recall status */}
        <Text style={styles.sectionTitle}>Recall status</Text>
        <Card style={{ gap: 8, marginTop: 8 }}>
          <View style={styles.purityHead}>
            <ShieldCheck size={18} color={review.recallStatus.status === "none" ? Colors.green600 : Colors.amber600} />
            <Text style={styles.purityConfidence}>{review.recallStatus.text}</Text>
          </View>
          {review.recallStatus.recalls.map((r, i) => (
            <View key={i} style={styles.bulletRow}>
              <View style={[styles.dot, { backgroundColor: r.severity === "bad" ? Colors.red600 : Colors.amber600 }]} />
              <Text style={styles.bulletText}>
                {r.recallDate ? `${r.recallDate}: ` : ""}
                {r.reason}
              </Text>
            </View>
          ))}
        </Card>

        {/* Brand transparency */}
        <Text style={styles.sectionTitle}>Brand transparency</Text>
        <Card style={{ gap: 6, marginTop: 8 }}>
          <View style={styles.scoreHead}>
            <Text style={styles.scoreLabel}>{bundle.brand?.name ?? "Unknown brand"}</Text>
            <Text style={[styles.scoreVal, { color: bandColor(review.brandTransparency.score) }]}>
              {review.brandTransparency.score}
            </Text>
          </View>
          <Text style={styles.scoreNote}>{review.brandTransparency.text}</Text>
        </Card>

        {/* Ingredient concerns */}
        {review.ingredientConcerns.length ? (
          <>
            <Text style={styles.sectionTitle}>Ingredient concerns</Text>
            <Card style={{ gap: 10, marginTop: 8 }}>
              {review.ingredientConcerns.map((c, i) => (
                <View key={i} style={styles.bulletRow}>
                  <View style={[styles.dot, { backgroundColor: TONE[c.severity].color }]} />
                  <Text style={styles.bulletText}>
                    <Text style={{ fontWeight: "800" }}>{c.ingredient}</Text> — {c.message}
                  </Text>
                </View>
              ))}
            </Card>
          </>
        ) : null}

        {/* Food as Medicine — TCM energetics (a traditional lens, not a diagnosis) */}
        {tcm.length ? (
          <>
            <Text style={styles.sectionTitle}>Food as medicine</Text>
            <Text style={styles.sectionHint}>
              A traditional (TCM) energetics lens on this recipe — supportive context, not a diagnosis.
            </Text>
            {tcmSummary ? (
              <View style={[styles.tcmSummary, { backgroundColor: thermalBg(tcmSummary.nature) }]}>
                <Leaf size={15} color={thermalTone(tcmSummary.nature)} />
                <Text style={[styles.tcmSummaryText, { color: thermalTone(tcmSummary.nature) }]}>{tcmSummary.text}</Text>
              </View>
            ) : null}
            <Card style={{ gap: 0, marginTop: 8 }}>
              {tcm.map((t, i) => (
                <View key={t.ingredient}>
                  {i > 0 ? <View style={styles.divider} /> : null}
                  <View style={styles.tcmRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={Fonts.h3}>{t.ingredient}</Text>
                      <Text style={styles.tcmPattern}>
                        {t.flavor} · {t.tcmPattern}
                      </Text>
                      {t.caveat ? <Text style={styles.tcmCaveat}>{t.caveat}</Text> : null}
                    </View>
                    <View style={[styles.thermalPill, { backgroundColor: thermalBg(t.thermalNature) }]}>
                      <Text style={[styles.thermalText, { color: thermalTone(t.thermalNature) }]}>{t.thermalNature}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </Card>
          </>
        ) : null}

        {/* Alternatives — data-backed, never a purity/"cleanest" claim */}
        {alternatives.length ? (
          <>
            <Text style={styles.sectionTitle}>Alternatives to consider for {selectedPet.name}</Text>
            <Text style={styles.sectionHint}>
              Suggested by the data below — not a purity claim, which a photo can&apos;t verify.
            </Text>
            {alternatives.map((a) => (
              <Pressable
                key={a.productId}
                style={styles.altCard}
                onPress={() => router.replace({ pathname: "/food-result", params: { productId: a.productId } })}
              >
                <View style={styles.altGrade}>
                  <Text style={styles.altGradeText}>{a.grade}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={Fonts.h3}>{a.name}</Text>
                  {a.brand ? <Text style={Fonts.tiny}>{a.brand}</Text> : null}
                  <View style={styles.altReasons}>
                    {a.reasons.map((r, i) => (
                      <View key={i} style={styles.altChip}>
                        <Leaf size={11} color={Colors.green600} />
                        <Text style={styles.altChipText}>{r.text}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </Pressable>
            ))}
          </>
        ) : null}

        {/* Why this scored this way */}
        <Text style={styles.sectionTitle}>Why this scored this way</Text>
        <Card style={{ gap: 10, marginTop: 8 }}>
          {review.whyFactors.map((f, i) => (
            <View key={i} style={styles.bulletRow}>
              {f.severity === "good" ? (
                <View style={[styles.miniIcon, { backgroundColor: Colors.green600 }]}>
                  <Check size={11} color="#fff" strokeWidth={3} />
                </View>
              ) : (
                <View style={[styles.dot, { backgroundColor: TONE[f.severity].color, marginTop: 7 }]} />
              )}
              <Text style={styles.bulletText}>{f.text}</Text>
            </View>
          ))}
        </Card>

        {/* Sources */}
        <Text style={styles.sectionTitle}>Sources</Text>
        <Card style={{ gap: 0, marginTop: 8 }}>
          {review.sources.map((s, i) => (
            <View key={`${s.title}-${i}`}>
              {i > 0 ? <View style={styles.divider} /> : null}
              <Pressable
                style={styles.sourceRow}
                disabled={!s.url}
                onPress={() => s.url && Linking.openURL(s.url).catch(() => {})}
              >
                <Beaker size={15} color={s.isDemo ? Colors.amber600 : Colors.teal700} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.sourceTitle}>
                    {s.title}
                    {s.isDemo ? <Text style={{ color: Colors.amber600 }}> · demo/seed</Text> : null}
                  </Text>
                  {s.publisher ? <Text style={Fonts.tiny}>{s.publisher}</Text> : null}
                </View>
                {s.url ? <ExternalLink size={15} color={Colors.inkFaint} /> : null}
              </Pressable>
            </View>
          ))}
        </Card>

        {/* Correction */}
        <Pressable style={styles.correctRow} onPress={correctMatch}>
          <Pencil size={15} color={Colors.teal700} />
          <Text style={styles.correctText}>Not the right product? Correct this match</Text>
        </Pressable>

        {/* Crowdsource a label for admin review — marked crowdsourced_unverified until reviewed */}
        {raw ? (
          <Pressable
            style={styles.correctRow}
            onPress={onSubmitForReview}
            disabled={reviewSubmitted}
            accessibilityRole="button"
            accessibilityLabel="Submit this label for review"
          >
            <Upload size={15} color={reviewSubmitted ? Colors.inkFaint : Colors.teal700} />
            <Text style={[styles.correctText, reviewSubmitted ? { color: Colors.inkFaint } : null]}>
              {reviewSubmitted
                ? "Submitted for review — thank you"
                : "Submit this label to improve our data"}
            </Text>
          </Pressable>
        ) : null}

        {/* Actions */}
        <View style={styles.actions}>
          <PrimaryButton
            label={saved ? "Saved to log" : "Save to food log"}
            icon={saved ? <Check size={18} color="#fff" /> : <Sparkles size={18} color="#fff" />}
            variant="primary"
            onPress={saveToLog}
            style={{ flex: 1 }}
          />
          <PrimaryButton
            label="New scan"
            variant="outline"
            onPress={() => router.replace("/food-scan")}
            style={{ flex: 1 }}
          />
        </View>

        <View style={{ marginTop: Space.lg }}>
          <Disclaimer />
        </View>
      </ScrollView>
    </View>
  );
}

function FitRow({ label, fit, text }: { label: string; fit: Severity; text: string }) {
  return (
    <View style={styles.fitRow}>
      <View style={[styles.fitDot, { backgroundColor: TONE[fit].bg }]}>
        <View style={[styles.fitDotInner, { backgroundColor: TONE[fit].color }]} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.fitLabel}>{label}</Text>
        <Text style={styles.fitText}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  center: { alignItems: "center", justifyContent: "center", padding: Space.lg },
  topbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Space.md,
    paddingVertical: Space.sm,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
    ...softShadow,
  },
  matchRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  badgesRow: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 12 },
  provChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.pill },
  provChipText: { fontSize: 11.5, fontWeight: "700" },
  matchIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.teal50,
    alignItems: "center",
    justifyContent: "center",
  },
  productName: { ...Fonts.h2, fontSize: 19 },
  hero: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    borderRadius: Radius.lg,
    padding: Space.md,
    marginTop: Space.md,
  },
  gradeCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255,255,255,0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  gradeLetter: { fontSize: 30, fontWeight: "800", color: Colors.ink, lineHeight: 34 },
  gradeScore: { ...Fonts.tiny, marginTop: 0 },
  recLabel: { fontSize: 18, fontWeight: "800", letterSpacing: -0.3 },
  recReason: { ...Fonts.body, color: Colors.ink, marginTop: 3, lineHeight: 20 },
  forPet: { ...Fonts.tiny, marginTop: 4 },
  alertCard: { borderRadius: Radius.lg, padding: Space.md, marginTop: Space.md, gap: 8 },
  alertHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  alertTitle: { ...Fonts.h3 },
  sectionTitle: { ...Fonts.h2, marginTop: Space.lg },
  sectionHint: { ...Fonts.small, marginTop: 2 },
  tcmSummary: { flexDirection: "row", gap: 8, alignItems: "center", borderRadius: Radius.md, padding: 12, marginTop: 8 },
  tcmSummaryText: { ...Fonts.small, flex: 1, lineHeight: 18, fontWeight: "600" },
  tcmRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12 },
  tcmPattern: { ...Fonts.small, color: Colors.inkSoft, marginTop: 2, lineHeight: 18 },
  tcmCaveat: { ...Fonts.tiny, color: Colors.inkFaint, marginTop: 3, lineHeight: 15 },
  thermalPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.pill },
  thermalText: { fontSize: 11.5, fontWeight: "800", textTransform: "capitalize" },
  whyMatters: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: Colors.teal50,
    borderRadius: Radius.md,
    padding: 12,
    marginTop: Space.md,
    borderWidth: 1,
    borderColor: Colors.teal100,
  },
  whyMattersText: { ...Fonts.small, color: Colors.teal900, flex: 1, lineHeight: 18 },
  scoreHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  scoreLabel: { ...Fonts.h3, fontSize: 14.5 },
  scoreVal: { fontSize: 16, fontWeight: "800" },
  track: { height: 8, borderRadius: 4, backgroundColor: Colors.cream2, overflow: "hidden", marginTop: 6 },
  fill: { height: 8, borderRadius: 4 },
  scoreNote: { ...Fonts.small, color: Colors.inkSoft, marginTop: 6, lineHeight: 18 },
  divider: { height: 1, backgroundColor: Colors.hairline },
  fitRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingVertical: 12 },
  fitDot: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  fitDotInner: { width: 10, height: 10, borderRadius: 5 },
  fitLabel: { ...Fonts.h3, fontSize: 14 },
  fitText: { ...Fonts.small, color: Colors.inkSoft, marginTop: 2, lineHeight: 18 },
  purityHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  purityConfidence: { ...Fonts.h3, fontSize: 14.5, flex: 1, textTransform: "capitalize" },
  purityText: { ...Fonts.small, color: Colors.inkSoft, lineHeight: 19 },
  labRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  labStatus: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.sm, minWidth: 58, alignItems: "center" },
  labStatusText: { fontSize: 10.5, fontWeight: "800" },
  labSubstance: { ...Fonts.body, fontWeight: "700", fontSize: 14 },
  labResult: { ...Fonts.small, color: Colors.inkSoft },
  demoBadge: { backgroundColor: Colors.amber100, borderRadius: Radius.sm, paddingHorizontal: 7, paddingVertical: 3 },
  demoBadgeText: { fontSize: 9.5, fontWeight: "800", color: Colors.amber600, letterSpacing: 0.4 },
  limitNote: { flexDirection: "row", gap: 8, backgroundColor: Colors.cream2, borderRadius: Radius.sm, padding: 10, marginTop: 2 },
  limitText: { ...Fonts.tiny, color: Colors.inkSoft, flex: 1, lineHeight: 16 },
  bulletRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  dot: { width: 7, height: 7, borderRadius: 4, marginTop: 7 },
  miniIcon: { width: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center", marginTop: 1 },
  bulletText: { ...Fonts.body, flex: 1, lineHeight: 20, color: Colors.inkSoft },
  altCard: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Space.md,
    marginTop: 10,
    ...softShadow,
  },
  altGrade: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.teal800,
    alignItems: "center",
    justifyContent: "center",
  },
  altGradeText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  altReasons: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  altChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.green100,
    borderRadius: Radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  altChipText: { fontSize: 11, color: Colors.green600, fontWeight: "700" },
  sourceRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12 },
  sourceTitle: { ...Fonts.body, fontWeight: "700", fontSize: 14 },
  correctRow: { flexDirection: "row", alignItems: "center", gap: 8, justifyContent: "center", marginTop: Space.lg },
  correctText: { ...Fonts.small, color: Colors.teal700 },
  actions: { flexDirection: "row", gap: 10, marginTop: Space.md },
});

import { Image } from "expo-image";
import { Stack } from "expo-router";
import { Check, Download, FileText, HelpCircle, Minus, Share2, X } from "lucide-react-native";
import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";

import { Card, Disclaimer, PrimaryButton } from "@/components/ui";
import Colors, { Fonts, Radius, Space, Urgency } from "@/constants/colors";
import { RECORDS } from "@/constants/mockData";
import { compileReport, type CompileInput } from "@/lib/report/compile";
import { exportReportPdf, shareReport } from "@/lib/report/export";
import { buildReportHtml, buildReportText } from "@/lib/report/html";
import type { ReportData } from "@/lib/report/types";
import { getQuestion } from "@/lib/triage/engine";
import { useTriage } from "@/lib/triage/store";
import { getActiveProgramRuns, type ProgramRunView } from "@/lib/programs/store";
import { programById } from "@/lib/integrative/programs";
import { usePets } from "@/providers/PetProvider";
import { reportService } from "@/services";
import type { TimelineEntry } from "@/types/pet";

const SUPP_KEYWORDS = [
  "probiotic", "omega", "fish oil", "glucosamine", "chondroitin", "supplement",
  "milk thistle", "enzyme", "vitamin", "cranberry", "slippery elm", "chamomile",
  "turmeric", "curcumin", "l-theanine", "calming",
];

function supplementsInUse(timeline: TimelineEntry[]): string[] {
  const out = new Set<string>();
  for (const t of timeline) {
    const text = `${t.title} ${t.detail ?? ""}`.toLowerCase();
    if (t.category === "meds" || SUPP_KEYWORDS.some((k) => text.includes(k))) {
      if (SUPP_KEYWORDS.some((k) => text.includes(k))) out.add(t.title);
    }
  }
  return [...out].slice(0, 8);
}

const SectionHeader = memo(function SectionHeader({ children }: { children: string }) {
  return <Text style={styles.sectionHeader}>{children}</Text>;
});

function toTimelineItems(timeline: TimelineEntry[]) {
  return timeline.map((t) => ({ date: t.date, title: t.title, detail: t.detail, category: t.category }));
}

export default function VetReportScreen() {
  const { selectedPet, timeline, mode } = usePets();
  const [data, setData] = useState<ReportData | null>(null);
  const [saved, setSaved] = useState<boolean>(false);
  const [status, setStatus] = useState<string | null>(null);
  const [programs, setPrograms] = useState<ProgramRunView[]>([]);

  useEffect(() => {
    let active = true;
    getActiveProgramRuns(selectedPet.id)
      .then((runs) => {
        if (active) setPrograms(runs);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [selectedPet.id]);

  const suppsUsed = useMemo(() => supplementsInUse(timeline), [timeline]);

  // In-session triage (local mode / freshly run) from the store.
  const tOutcome = useTriage((s) => s.outcome);
  const tPetId = useTriage((s) => s.outcomePetId);
  const tLabel = useTriage((s) => s.concernLabel);
  const tModule = useTriage((s) => s.module);
  const tCtx = useTriage((s) => s.ctx);

  const storeTriage = useMemo<CompileInput["triage"]>(() => {
    if (!tOutcome || tPetId !== selectedPet.id || !tModule || !tCtx) return null;
    const answers = tCtx.order
      .map((qid) => {
        const q = getQuestion(tModule, qid);
        if (!q) return null;
        return { question: q.text, answer: tCtx.picked[qid]?.label ?? "Not sure" };
      })
      .filter(Boolean) as { question: string; answer: string }[];
    return {
      concernLabel: tLabel,
      urgency: tOutcome.urgency,
      confidence: tOutcome.confidence,
      causes: tOutcome.causes.map((c) => ({ name: c.name, note: c.note })),
      redFlags: tOutcome.redFlags,
      summary: tOutcome.summary,
      answers,
    };
  }, [tOutcome, tPetId, selectedPet.id, tModule, tCtx, tLabel]);

  useEffect(() => {
    let active = true;
    (async () => {
      const base: Omit<CompileInput, "triage" | "scans" | "medications"> = {
        generatedAt: new Date().toISOString(),
        pet: {
          name: selectedPet.name,
          species: selectedPet.species,
          breed: selectedPet.breed,
          ageYears: selectedPet.ageYears,
          sex: selectedPet.sex,
          weightLb: selectedPet.weightLb,
          photo: selectedPet.photo,
          status: selectedPet.status,
          statusNote: selectedPet.statusNote,
        },
        allergies: selectedPet.allergies,
        conditions: selectedPet.conditions,
        timeline: toTimelineItems(timeline),
      };

      let input: CompileInput;
      if (mode === "remote") {
        const g = await reportService.gather(selectedPet.id).catch(() => null);
        input = {
          ...base,
          triage: g?.triage ?? storeTriage,
          scans: (g?.scans ?? []).map((s) => ({
            type: s.scan_type,
            score: s.score,
            urgency: s.urgency,
            date: s.created_at,
            note: s.correlation ?? s.notes,
          })),
          medications: (g?.medications ?? []).map((m) => ({ name: m.name, purpose: m.purpose, status: m.status })),
        };
      } else {
        const localMeds = (RECORDS[selectedPet.demoKey ?? selectedPet.id]?.["Medications"] ?? []).map((r) => ({
          name: r.title,
          purpose: r.subtitle,
        }));
        input = {
          ...base,
          triage: storeTriage,
          scans: timeline
            .filter((t) => t.category === "scan")
            .map((t) => ({ type: t.title, score: t.detail ?? null, urgency: t.urgency ?? null, date: t.date, note: null })),
          medications: localMeds,
        };
      }
      if (active) setData(compileReport(input));
    })();
    return () => {
      active = false;
    };
  }, [selectedPet, timeline, mode, storeTriage]);

  const saveSnapshot = useCallback(() => {
    if (!data) return;
    setSaved(true);
    if (mode === "remote") {
      reportService
        .createReport(selectedPet.id, {
          title: "Vet-ready summary",
          concernSummary: data.concernSummary ?? undefined,
          payload: data as unknown as Record<string, unknown>,
        })
        .catch((e) => console.warn("[petwell] report save failed:", e));
    }
  }, [data, mode, selectedPet.id]);

  const onExportPdf = useCallback(async () => {
    if (!data) return;
    const method = await exportReportPdf(buildReportHtml(data), `petwell-${data.pet.name}-report`);
    setStatus(
      method === "print"
        ? "Opening print dialog — choose “Save as PDF”."
        : method === "download"
          ? "Report downloaded."
          : method === "share"
            ? "Report shared."
            : "Couldn't open the export — try Share instead."
    );
    saveSnapshot();
  }, [data, saveSnapshot]);

  const onShare = useCallback(async () => {
    if (!data) return;
    const method = await shareReport(buildReportText(data), `Petwell — ${data.pet.name} vet report`);
    setStatus(
      method === "web-share" || method === "share"
        ? "Shared with your clinic."
        : method === "mailto"
          ? "Opening email to your clinic…"
          : method === "cancel"
            ? null
            : "Couldn't open share — try Export PDF."
    );
    saveSnapshot();
  }, [data, saveSnapshot]);

  if (!data) {
    return (
      <View style={[styles.container, styles.center]}>
        <Stack.Screen options={{ title: "Vet-ready summary" }} />
        <ActivityIndicator color={Colors.teal700} />
        <Text style={[Fonts.bodySoft, { marginTop: 10 }]}>Compiling {selectedPet.name}&apos;s report…</Text>
      </View>
    );
  }

  const u = data.triage ? Urgency[data.triage.urgencyKey as keyof typeof Urgency] : null;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Vet-ready summary" }} />
      <ScrollView contentContainerStyle={{ padding: Space.md, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.reportHeader}>
          <View style={styles.reportIcon}>
            <FileText size={22} color="#fff" />
          </View>
          <View>
            <Text style={styles.reportTitle}>Vet-ready summary</Text>
            <Text style={styles.reportDate}>
              Generated{" "}
              {new Date(data.generatedAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </Text>
          </View>
        </View>

        {/* Pet profile */}
        <Card style={styles.profileCard}>
          {selectedPet.photo ? (
            <Image source={{ uri: selectedPet.photo }} style={styles.avatar} contentFit="cover" />
          ) : (
            <View style={styles.avatar} />
          )}
          <View style={{ flex: 1 }}>
            <Text style={Fonts.h2}>{data.pet.name}</Text>
            <Text style={Fonts.small}>
              {data.pet.ageYears} yr · {data.pet.breed} · {data.pet.sex} · {data.pet.weightLb} lb
            </Text>
            {data.conditions.length > 0 ? (
              <Text style={[Fonts.small, { marginTop: 4, color: Colors.teal700 }]}>{data.conditions.join(" · ")}</Text>
            ) : null}
          </View>
        </Card>

        {/* Concern summary */}
        {data.concernSummary ? (
          <>
            <SectionHeader>Concern summary</SectionHeader>
            <Card>
              <Text style={styles.bodyText}>{data.concernSummary}</Text>
            </Card>
          </>
        ) : null}

        {/* Triage */}
        <SectionHeader>Triage</SectionHeader>
        {data.triage ? (
          <Card style={{ gap: 10 }}>
            <View style={styles.triageTop}>
              <Text style={Fonts.h3}>{data.triage.concernLabel}</Text>
              {u ? (
                <View style={[styles.triagePill, { backgroundColor: u.bg }]}>
                  <Text style={[styles.triagePillText, { color: u.color }]}>{u.label}</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.triageMeta}>{data.triage.confidence} confidence</Text>
            {data.triage.causes.slice(0, 4).map((c, i) => (
              <View key={i} style={styles.bulletRow}>
                <View style={styles.dot} />
                <Text style={styles.bulletText}>
                  {c.name}
                  {c.note ? <Text style={{ color: Colors.inkFaint }}> · {c.note}</Text> : null}
                </Text>
              </View>
            ))}
            {data.triage.answers.length ? (
              <>
                <Text style={styles.subLabel}>Triage answers</Text>
                {data.triage.answers.map((a, i) => (
                  <View key={i} style={styles.qaRow}>
                    <Text style={styles.qaQ}>{a.question}</Text>
                    <Text style={styles.qaA}>{a.answer}</Text>
                  </View>
                ))}
              </>
            ) : null}
          </Card>
        ) : (
          <Card>
            <Text style={styles.bodyText}>
              No triage on file yet. Use <Text style={{ fontWeight: "800" }}>Ask</Text> to run a symptom
              check and it will attach here automatically.
            </Text>
          </Card>
        )}

        {/* Red flags present/absent */}
        <SectionHeader>Red-flag screen</SectionHeader>
        <Card style={{ gap: 12 }}>
          {data.redFlagsPresent.map((f) => (
            <View key={f} style={styles.flagRow}>
              <View style={[styles.flagDot, { backgroundColor: Colors.amber100 }]}>
                <Minus size={13} color={Colors.amber600} strokeWidth={3} />
              </View>
              <Text style={styles.bulletText}>{f}</Text>
              <Text style={[styles.flagStatus, { color: Colors.amber600 }]}>Present</Text>
            </View>
          ))}
          {data.redFlagsAbsent.map((f) => (
            <View key={f} style={styles.flagRow}>
              <View style={[styles.flagDot, { backgroundColor: Colors.green100 }]}>
                <X size={13} color={Colors.green600} strokeWidth={3} />
              </View>
              <Text style={styles.bulletText}>{f}</Text>
              <Text style={[styles.flagStatus, { color: Colors.green600 }]}>Absent</Text>
            </View>
          ))}
        </Card>

        {/* Allergies & conditions */}
        <SectionHeader>Allergies & conditions</SectionHeader>
        <Card style={{ gap: 8 }}>
          <Text style={styles.subLabel}>Allergies</Text>
          <Text style={styles.bodyText}>{data.allergies.length ? data.allergies.join(", ") : "None reported."}</Text>
          <Text style={[styles.subLabel, { marginTop: 6 }]}>Conditions</Text>
          <Text style={styles.bodyText}>{data.conditions.length ? data.conditions.join(", ") : "None reported."}</Text>
        </Card>

        {/* Meds */}
        <SectionHeader>Medications & supplements</SectionHeader>
        <Card style={{ gap: 10 }}>
          {data.medications.length ? (
            data.medications.map((m, i) => (
              <View key={i} style={styles.bulletRow}>
                <View style={styles.dot} />
                <Text style={styles.bulletText}>
                  {m.name}
                  {m.purpose ? <Text style={{ color: Colors.inkFaint }}> · {m.purpose}</Text> : null}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.bodyText}>None on file.</Text>
          )}
        </Card>

        {/* Integrative support tried */}
        <SectionHeader>Integrative support tried</SectionHeader>
        <Card style={{ gap: 12 }}>
          {programs.length === 0 && suppsUsed.length === 0 ? (
            <Text style={styles.bodyText}>
              No integrative programs or supplements logged yet. Started programs and logged supplements/herbs will
              appear here for your vet.
            </Text>
          ) : null}
          {programs.length > 0 ? (
            <View style={{ gap: 8 }}>
              <Text style={styles.subLabel}>Guided programs</Text>
              {programs.map((p) => {
                const t = programById(p.templateId);
                return (
                  <View key={p.id} style={styles.bulletRow}>
                    <View style={styles.dot} />
                    <Text style={styles.bulletText}>
                      {t?.title ?? p.templateId}
                      <Text style={{ color: Colors.inkFaint }}> · {p.progress.summaryLine}</Text>
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : null}
          {suppsUsed.length > 0 ? (
            <View style={{ gap: 8 }}>
              <Text style={styles.subLabel}>Supplements & herbs in use</Text>
              {suppsUsed.map((s, i) => (
                <View key={i} style={styles.bulletRow}>
                  <View style={styles.dot} />
                  <Text style={styles.bulletText}>{s}</Text>
                </View>
              ))}
              <Text style={[Fonts.tiny, { color: Colors.inkFaint, lineHeight: 16 }]}>
                Please confirm doses and interactions — these are owner-reported.
              </Text>
            </View>
          ) : null}
        </Card>

        {/* Food changes */}
        <SectionHeader>Food & diet changes</SectionHeader>
        <Card style={{ gap: 10 }}>
          {data.foodChanges.length ? (
            data.foodChanges.map((f, i) => (
              <View key={i} style={styles.bulletRow}>
                <View style={styles.dot} />
                <Text style={styles.bulletText}>
                  {f.title}
                  {f.detail ? <Text style={{ color: Colors.inkFaint }}> · {f.detail}</Text> : null}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.bodyText}>No recent diet changes logged.</Text>
          )}
        </Card>

        {/* Scans */}
        <SectionHeader>Photos & scans</SectionHeader>
        <Card style={{ gap: 0 }}>
          {data.scans.length ? (
            data.scans.slice(0, 6).map((s, i) => (
              <View key={i}>
                {i > 0 ? <View style={styles.divider} /> : null}
                <View style={styles.timelineRow}>
                  <Text style={styles.timelineDate}>
                    {new Date(s.date.length <= 10 ? s.date + "T00:00:00" : s.date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text style={Fonts.h3}>
                      {s.type}
                      {s.score ? <Text style={Fonts.small}> · {s.score}</Text> : null}
                    </Text>
                    {s.note ? <Text style={Fonts.small}>{s.note}</Text> : null}
                  </View>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.bodyText}>No scans recorded yet.</Text>
          )}
        </Card>

        {/* Recent timeline */}
        <SectionHeader>Recent timeline</SectionHeader>
        <Card style={{ gap: 0 }}>
          {data.timeline.slice(0, 6).map((s, i) => (
            <View key={i}>
              {i > 0 ? <View style={styles.divider} /> : null}
              <View style={styles.timelineRow}>
                <Text style={styles.timelineDate}>
                  {new Date(s.date.length <= 10 ? s.date + "T00:00:00" : s.date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={Fonts.h3}>{s.title}</Text>
                  {s.detail ? <Text style={Fonts.small}>{s.detail}</Text> : null}
                </View>
              </View>
            </View>
          ))}
        </Card>

        {/* Questions */}
        <SectionHeader>Questions to ask the vet</SectionHeader>
        <Card style={{ gap: 12 }}>
          {data.questions.map((q, i) => (
            <View key={i} style={styles.bulletRow}>
              <HelpCircle size={17} color={Colors.teal700} style={{ marginTop: 1 }} />
              <Text style={styles.bulletText}>{q}</Text>
            </View>
          ))}
        </Card>

        {/* Export actions */}
        <View style={styles.actions}>
          <PrimaryButton
            label={saved ? "Saved · Export PDF" : "Export PDF"}
            icon={saved ? <Check size={18} color="#fff" /> : <Download size={18} color="#fff" />}
            variant="primary"
            onPress={onExportPdf}
            style={{ flex: 1 }}
          />
          <PrimaryButton
            label="Share with clinic"
            icon={<Share2 size={18} color={Colors.teal800} />}
            variant="outline"
            onPress={onShare}
            style={{ flex: 1 }}
          />
        </View>
        {status ? <Text style={styles.statusText}>{status}</Text> : null}
        <Text style={styles.freeNote}>Export is always free — no subscription required.</Text>

        <View style={{ marginTop: Space.md }}>
          <Disclaimer />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  center: { alignItems: "center", justifyContent: "center" },
  reportHeader: { flexDirection: "row", alignItems: "center", gap: Space.sm, marginBottom: Space.md },
  reportIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.teal800,
    alignItems: "center",
    justifyContent: "center",
  },
  reportTitle: { ...Fonts.h2 },
  reportDate: { ...Fonts.small },
  profileCard: { flexDirection: "row", alignItems: "center", gap: Space.sm },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: Colors.cream2 },
  sectionHeader: { ...Fonts.tiny, marginTop: Space.lg, marginBottom: 8, letterSpacing: 0.8 },
  bodyText: { ...Fonts.body, lineHeight: 22, color: Colors.inkSoft },
  subLabel: { ...Fonts.tiny, marginTop: 4 },
  triageTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  triagePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.pill },
  triagePillText: { fontSize: 12, fontWeight: "800" },
  triageMeta: { ...Fonts.small, lineHeight: 18 },
  qaRow: { paddingVertical: 4 },
  qaQ: { ...Fonts.small, color: Colors.inkSoft },
  qaA: { ...Fonts.body, fontWeight: "700", color: Colors.ink },
  divider: { height: 1, backgroundColor: Colors.hairline },
  timelineRow: { flexDirection: "row", gap: 12, paddingVertical: 12, alignItems: "flex-start" },
  timelineDate: { ...Fonts.small, color: Colors.teal700, fontWeight: "800", width: 52, marginTop: 1 },
  bulletRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.teal600, marginTop: 7 },
  bulletText: { ...Fonts.body, flex: 1, lineHeight: 21, color: Colors.inkSoft },
  flagRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  flagDot: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  flagStatus: { fontSize: 12.5, fontWeight: "800" },
  actions: { flexDirection: "row", gap: 10, marginTop: Space.xl },
  statusText: { ...Fonts.small, color: Colors.teal700, textAlign: "center", marginTop: 10 },
  freeNote: { ...Fonts.small, color: Colors.teal700, textAlign: "center", marginTop: 6, fontWeight: "700" },
});

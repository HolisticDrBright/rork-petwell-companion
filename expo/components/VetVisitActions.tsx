import { SaveStatus } from "@/components/SaveStatus";
import { Card, PrimaryButton } from "@/components/ui";
import Colors, { Fonts, Space } from "@/constants/colors";
import { useSaveAction } from "@/hooks/useSaveAction";
import { exportJson, exportReportPdf } from "@/lib/report/export";
import type { ReportData } from "@/lib/report/types";
import { visitPackageHtml, type VetVisitPackage } from "@/lib/report/visitPackage";
import { triageReferences } from "@/lib/triage/sources";
import { careScheduleService } from "@/services/careScheduleService";
import { integrativeService } from "@/services/integrativeService";
import { configuredVisitViewer, privateDocumentDataUrl, vetVisitPackageService } from "@/services/vetVisitPackageService";
import type { TimelineEntry } from "@/types/pet";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { Switch, Text, View } from "react-native";

export function VetVisitActions({ petId, data, timeline, today, remote, autoPrepare }: {
  petId: string; data: ReportData; timeline: TimelineEntry[]; today: string; remote: boolean; autoPrepare?: boolean;
}) {
  const query = useQueryClient();
  const { saving, saveError, runSave } = useSaveAction();
  const [photos, setPhotos] = useState(false);
  const [preview, setPreview] = useState<VetVisitPackage | null>(null);
  const [link, setLink] = useState<{ id: string; url: string } | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);
  const links = useQuery({ queryKey: ["vet-visit-packages", petId], queryFn: () => vetVisitPackageService.list(petId), enabled: remote });

  const prepare = useCallback(() => {
    void runSave(async () => {
      const now = new Date();
      const until = new Date(now.getTime() + 14 * 86_400_000);
      const cut = new Date(today + "T12:00:00Z");
      cut.setUTCDate(cut.getUTCDate() - 29);
      const cutoff = cut.toISOString().slice(0, 10);
      const inWindow = (date: string) => date.slice(0, 10) >= cutoff && date.slice(0, 10) <= today;
      const included = timeline.filter(entry => inWindow(entry.date)).sort((a,b) => b.date.localeCompare(a.date));
      const [schedule, history] = remote ? await Promise.all([
        careScheduleService.occurrences(petId, now, until),
        integrativeService.healthScoreHistory(petId),
      ]) : [[], []] as const;
      const attachments: VetVisitPackage["photos"] = [];
      if (photos) {
        for (const e of included.filter(e => e.category === "scan" && /^[a-f0-9-]{36}\/ai-scan-/i.test(e.imagePath ?? "")).slice(0, 4)) {
          attachments.push({ label: `${e.date} · ${e.title}`, dataUrl: await privateDocumentDataUrl(e.imagePath!) });
        }
      }
      setPreview({
        version: 1,
        report: {
          ...data, pet: { ...data.pet, photo: "" }, timeline: data.timeline.filter(entry => inWindow(entry.date)),
          foodChanges: data.foodChanges.filter(entry => inWindow(entry.date)),
          scans: data.scans.filter(entry => inWindow(entry.date)), loggingSummary: null,
        },
        photos: attachments,
        citations: triageReferences(data.triage?.urgencyKey ?? "green", data.triage?.concernLabel ?? "", data.pet.species),
        schedules: schedule.map(s => ({ title: s.title, kind: s.kind, amount: s.amount, confirmed: !!s.completed_at, dateTime: s.scheduled_at })),
        score_history: history.filter(s => inWindow(s.generated_at)),
        weight_history: included.flatMap(e => e.category === "weight" && typeof e.value === "number" && Number.isFinite(e.value)
          ? [{ date: e.date, pounds: e.value }] : []),
      });
    });
  }, [data, petId, photos, remote, runSave, timeline, today]);

  const requested = useRef(false);
  useEffect(() => {
    if (autoPrepare && !requested.current) {
      requested.current = true;
      prepare();
    }
  }, [autoPrepare, prepare]);

  return (
    <Card style={{ gap: Space.sm, marginVertical: Space.md }}>
      <Text style={Fonts.h3}>Vet visit package</Text>
      <Text style={Fonts.small}>Prepare a copy of the last 30 days of relevant records, the triage result, and upcoming care.</Text>
      {remote ? <View style={{ flexDirection: "row", gap: Space.sm, alignItems: "center", justifyContent: "space-between" }}>
        <Text style={[Fonts.small, { flex: 1 }]}>Attach up to four recent scan photos</Text>
        <Switch accessibilityLabel="Attach recent scan photos" value={photos} disabled={saving}
          onValueChange={value => { setPhotos(value); setPreview(null); }} />
      </View> : null}
      <PrimaryButton label="Prepare for vet visit" variant="outline" disabled={saving} onPress={prepare} />
      {preview ? <>
        <Text style={Fonts.small}>{preview.report.timeline.length} log entries · {preview.photos.length} photos · {preview.citations.length} references</Text>
        {preview.report.timeline.slice(0, 6).map((entry, index) => <Text style={Fonts.small} key={index}>{entry.date} · {entry.title}</Text>)}
        <PrimaryButton label="Export vet visit PDF" variant="outline" disabled={saving} onPress={() => runSave(async () => {
          if (await exportReportPdf(visitPackageHtml(preview), "petwell-vet-visit") === "none") throw new Error("PDF unavailable.");
        })} />
        <PrimaryButton label="Export handoff JSON" variant="outline" disabled={saving} onPress={() => runSave(async () => {
          if (await exportJson(preview, "petwell-vet-visit.json") === "none") throw new Error("Export unavailable.");
        })} />
        {remote && configuredVisitViewer() ? <>
          <Text style={Fonts.small}>Anyone with the link can view this copy for 30 days. You can revoke access at any time.</Text>
          <PrimaryButton label="Create 30-day viewing link" disabled={saving} onPress={() => runSave(async () => {
            setLink(await vetVisitPackageService.create(petId, preview));
            void query.invalidateQueries({ queryKey: ["vet-visit-packages", petId] });
          })} />
        </> : null}
      </> : null}
      {link ? <Text selectable style={[Fonts.small, { color: Colors.teal800 }]}>{link.url}</Text> : null}
      {links.data?.filter(item => !item.revoked_at && new Date(item.expires_at).getTime() > Date.now()).map(item => (
        <View style={{ gap: Space.xs }} key={item.id}>
          <Text style={Fonts.small}>Link expires {new Date(item.expires_at).toLocaleDateString()}</Text>
          <PrimaryButton label={confirmRevoke === item.id ? "Confirm revoke" : "Revoke link"} variant="outline" disabled={saving}
            onPress={() => {
              if (confirmRevoke !== item.id) { setConfirmRevoke(item.id); return; }
              void runSave(async () => {
                await vetVisitPackageService.revoke(item.id);
                if (link?.id === item.id) setLink(null);
                setConfirmRevoke(null);
                void query.invalidateQueries({ queryKey: ["vet-visit-packages", petId] });
              });
            }} />
        </View>
      ))}
      {links.isError ? <Text style={Fonts.small}>Couldn’t load links to manage. Try reopening this report.</Text> : null}
      <SaveStatus saving={saving} saveError={saveError} />
    </Card>
  );
}

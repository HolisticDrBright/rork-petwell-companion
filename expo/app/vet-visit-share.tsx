import { Card, PrimaryButton } from "@/components/ui";
import { VetSources } from "@/components/VetSources";
import Colors, { Fonts, Space } from "@/constants/colors";
import { exportReportPdf } from "@/lib/report/export";
import { isEmbeddedPhoto, visitPackageHtml } from "@/lib/report/visitPackage";
import { vetVisitPackageService } from "@/services/vetVisitPackageService";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { Stack } from "expo-router";
import { useState } from "react";
import { Platform, ScrollView, Text } from "react-native";

export default function VetVisitShareScreen() {
  const [token] = useState(() => Platform.OS === "web" && typeof window !== "undefined" ? window.location.hash.slice(1) : "");
  const { data, isPending, isError } = useQuery({
    queryKey: ["vet-visit-package", token],
    queryFn: () => vetVisitPackageService.open(token),
    enabled: !!token,
    gcTime: 0,
    retry: false,
    refetchInterval: 30_000,
  });
  const [exportError, setExportError] = useState(false);
  return (
    <ScrollView style={{ backgroundColor: Colors.cream }} contentContainerStyle={{ padding: Space.md, gap: Space.md }}>
      <Stack.Screen options={{ title: "Petwell vet visit", headerBackVisible: false }} />
      {!token || isError || (!isPending && !data) ? <Card><Text style={Fonts.body}>This link is invalid, expired, or revoked.</Text></Card>
        : isPending || !data ? <Text style={Fonts.body}>Loading visit package…</Text> :
          <Card style={{ gap: Space.sm }}>
            <Text style={Fonts.h2}>{data.report.pet.name}’s vet visit summary</Text>
            <Text style={Fonts.body}>{data.report.pet.species} · Prepared {new Date(data.report.generatedAt).toLocaleDateString()}</Text>
            {data.report.triage ? <Text style={Fonts.body}>{data.report.triage.urgencyLabel} · {data.report.triage.concernLabel}</Text> : null}
            {data.report.concernSummary ? <Text style={Fonts.bodySoft}>{data.report.concernSummary}</Text> : null}
            {(data.report.timeline ?? []).map((item, index) => <Text style={Fonts.small} key={index}>{item.date} · {item.title}{item.detail ? " · " + item.detail : ""}</Text>)}
            {data.photos.filter(photo => isEmbeddedPhoto(photo.dataUrl)).map((photo, index) => (
              <Image key={index} source={{ uri: photo.dataUrl }} style={{ width: "100%", height: 220 }} contentFit="contain" accessibilityLabel={photo.label} />
            ))}
            <VetSources citations={data.citations ?? []} />
            {exportError ? <Text accessibilityRole="alert" style={Fonts.small}>Couldn’t open the PDF export.</Text> : null}
            <PrimaryButton label="Open PDF export" variant="outline" onPress={async () => {
              setExportError(await exportReportPdf(visitPackageHtml(data), "petwell-vet-visit") === "none");
            }} />
          </Card>}
    </ScrollView>
  );
}

import { NoPetSelected } from "@/components/NoPetSelected";
import { SaveStatus } from "@/components/SaveStatus";
import { Card, PrimaryButton } from "@/components/ui";
import Colors, { Fonts, Space } from "@/constants/colors";
import { useSaveAction } from "@/hooks/useSaveAction";
import { exportJson, exportReportPdf } from "@/lib/report/export";
import { usePets } from "@/providers/PetProvider";
import { petExportHtml, petExportService } from "@/services/petExportService";
import { Stack } from "expo-router";
import { ScrollView, Text } from "react-native";

export default function ExportPetScreen() {
  const { selectedPet, mode } = usePets();
  const { saving, saveError, runSave } = useSaveAction();
  if (!selectedPet) return <NoPetSelected />;
  async function download(format: "json" | "pdf", petId: string) {
    const data = await petExportService.get(petId);
    const result = format === "pdf"
      ? await exportReportPdf(petExportHtml(data), "petwell-pet-records")
      : await exportJson(data, "petwell-pet-records.json");
    if (result === "none") throw new Error("Export failed.");
  }
  return (
    <ScrollView style={{ backgroundColor: Colors.cream }} contentContainerStyle={{ padding: Space.md }}>
      <Stack.Screen options={{ title: "Export pet records" }} />
      <Card style={{ gap: Space.sm }}>
        <Text style={Fonts.h2}>Export {selectedPet.name}’s records</Text>
        <Text style={Fonts.small}>Download your pet’s account records and the photos attached to confirmed document imports. Export is free.</Text>
        {mode === "remote" ? <>
          <PrimaryButton label="Export JSON" disabled={saving} onPress={() => runSave(() => download("json", selectedPet.id))} />
          <PrimaryButton label="Export PDF" variant="outline" disabled={saving} onPress={() => runSave(() => download("pdf", selectedPet.id))} />
        </> : <Text style={Fonts.small}>Sign in to export account records.</Text>}
        <SaveStatus saving={saving} saveError={saveError} />
      </Card>
    </ScrollView>
  );
}

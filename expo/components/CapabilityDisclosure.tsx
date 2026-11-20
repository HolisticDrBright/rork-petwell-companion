import { Card, PrimaryButton } from "@/components/ui";
import { Fonts, Space } from "@/constants/colors";
import { supabase } from "@/lib/supabase";
import { storage } from "@/services/storage";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Text } from "react-native";

const notices = {
  scan: {
    available: "A photo can help you record visible changes to share with your vet.",
    limits: "A photo cannot diagnose illness or measure contaminants. Check urgent symptoms with a veterinarian.",
  },
  score: {
    available: "Petwell summarizes recent logs and shows the inputs and coverage behind each score.",
    limits: "The score is a tracking aid. It cannot assess whether a pet is healthy or predict illness.",
  },
  chat: {
    available: "Petwell provides general information when it can cite a veterinary source.",
    limits: "Chat cannot examine your pet, diagnose illness, or recommend treatment. Contact your vet for urgent concerns.",
  },
};

export function CapabilityDisclosure({ feature, remote }: { feature: keyof typeof notices; remote: boolean }) {
  const [seen, setSeen] = useState<number | null>(null);
  const key = `petwell.capability.${feature}`;
  const { data } = useQuery({
    queryKey: ["capability-disclosure", feature], enabled: remote,
    staleTime: 10 * 60_000, retry: false,
    queryFn: async () => {
      const { data: row, error } = await supabase.from("capability_disclosures").select("available,limits,version")
        .eq("feature", feature).single();
      if (error) throw error;
      return row;
    },
  });
  const notice = data ?? { ...notices[feature], version: 1 };
  useEffect(() => {
    let active = true;
    void storage.getJSON(key, 0).then(value => { if (active) setSeen(value); });
    return () => { active = false; };
  }, [key]);
  if (seen === null || seen >= notice.version) return null;
  return <Card style={{ gap: Space.sm, marginBottom: Space.md }}>
    <Text style={Fonts.h3}>What this feature can do</Text>
    <Text style={Fonts.body}>{notice.available}</Text>
    <Text style={Fonts.small}>{notice.limits}</Text>
    <PrimaryButton label="Got it" variant="outline" onPress={() => {
      setSeen(notice.version);
      void storage.setJSON(key, notice.version);
    }} />
  </Card>;
}

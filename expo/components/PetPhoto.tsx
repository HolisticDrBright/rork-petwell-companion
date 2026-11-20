import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { PawPrint } from "lucide-react-native";
import React from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import Colors from "@/constants/colors";
import { supabase } from "@/lib/supabase";

export function PetPhoto({ photo, style }: { photo: string; style: StyleProp<ViewStyle> }) {
  const isPrivate = /^[a-f0-9-]{36}\/profile-\S+\.jpg$/i.test(photo);
  const signed = useQuery({
    queryKey: ["pet-photo", photo],
    enabled: isPrivate,
    staleTime: 45 * 60_000,
    refetchInterval: 50 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from("pet-photos").createSignedUrl(photo, 3600);
      if (error) throw error;
      return data.signedUrl;
    },
  });
  const uri = isPrivate ? signed.data : photo;
  return (
    <View style={[style, styles.frame]}>
      {uri ? <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <PawPrint size={18} color={Colors.teal700} />}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { overflow: "hidden", alignItems: "center", justifyContent: "center", backgroundColor: Colors.cream2 },
});

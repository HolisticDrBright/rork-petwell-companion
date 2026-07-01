import { Image } from "expo-image";
import React, { useEffect, useState } from "react";
import { StyleSheet } from "react-native";

import Colors, { Radius } from "@/constants/colors";
import { supabase } from "@/lib/supabase";

/**
 * Thumbnail for a timeline entry's attached photo. `imagePath` is either a local
 * URI (local mode / just captured) rendered directly, or an owner-scoped storage
 * path in the private documents bucket resolved to a short-lived signed URL.
 * Renders nothing until a usable URI exists (and nothing at all on failure).
 */
export function AttachedPhoto({ imagePath, size = 56 }: { imagePath: string; size?: number }) {
  const direct = /^(file:|content:|https?:|data:)/.test(imagePath);
  const [uri, setUri] = useState<string | null>(direct ? imagePath : null);

  useEffect(() => {
    if (direct) return;
    let active = true;
    supabase.storage
      .from("documents")
      .createSignedUrl(imagePath, 3600)
      .then(({ data }) => {
        if (active && data?.signedUrl) setUri(data.signedUrl);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [imagePath, direct]);

  if (!uri) return null;
  return <Image source={{ uri }} style={[styles.thumb, { width: size, height: size }]} contentFit="cover" />;
}

const styles = StyleSheet.create({
  thumb: { borderRadius: Radius.md, backgroundColor: Colors.cream2, marginTop: 8 },
});

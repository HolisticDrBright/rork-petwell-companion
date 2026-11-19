import { useRouter } from "expo-router";
import { Text, View } from "react-native";
import { PrimaryButton } from "@/components/ui";
import Colors, { Fonts } from "@/constants/colors";

export function AccountRequired() {
  const router = useRouter();
  return <View style={{ flex: 1, justifyContent: "center", padding: 24, gap: 18, backgroundColor: Colors.cream }}>
    <Text style={Fonts.title}>Keep your pet’s records together</Text>
    <Text style={Fonts.body}>Sign in or create an account to save your pets and access their records across devices.</Text>
    <PrimaryButton label="Sign in or create account" onPress={() => router.push("/account")} />
  </View>;
}

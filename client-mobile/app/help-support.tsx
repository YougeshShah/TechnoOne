import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing } from "../src/theme/theme";

export default function HelpSupportScreen() {
  const router = useRouter();
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={{ width: 22 }} />
      </View>

      <Text style={styles.title}>Help & Support</Text>
      <Text style={styles.sectionHeading}>Frequently Asked Questions</Text>

      <View style={styles.faqCard}>
        <Text style={styles.faqQ}>How do I access courses?</Text>
        <Text style={styles.faqA}>Browse courses from your dashboard once your student account is activated by your institution.</Text>
      </View>

      <View style={styles.faqCard}>
        <Text style={styles.faqQ}>How do I contact support?</Text>
        <Text style={styles.faqA}>Reach out to your institution administrator or support team for assistance with your account.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  headerTitle: { fontSize: 16, fontWeight: "800", color: "#111827" },
  title: { fontSize: 22, fontWeight: "800", color: "#111827", marginBottom: 16 },
  sectionHeading: { fontSize: 15, fontWeight: "700", color: "#1F2937", marginBottom: 12 },
  faqCard: { backgroundColor: "#fff", padding: 14, borderRadius: 10, borderWidth: 1, borderColor: "#E5E7EB", marginBottom: 12 },
  faqQ: { fontSize: 14, fontWeight: "700", color: "#111827", marginBottom: 4 },
  faqA: { fontSize: 13, color: "#4B5563", lineHeight: 18 },
});

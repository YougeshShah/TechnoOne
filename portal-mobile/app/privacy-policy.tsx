import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing } from "../src/theme/theme";

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 22 }} />
      </View>

      <Text style={styles.title}>Privacy Policy</Text>
      <Text style={styles.date}>Last updated: October 2026</Text>

      <Text style={styles.sectionHeading}>1. Information We Collect</Text>
      <Text style={styles.body}>
        We collect account registration details, student rosters, live class logs, and academic management data for institutional administration.
      </Text>

      <Text style={styles.sectionHeading}>2. How We Use Your Information</Text>
      <Text style={styles.body}>
        Data is used strictly to manage educational institutions, student verification, and proctoring reviews.
      </Text>

      <Text style={styles.sectionHeading}>3. Data Security</Text>
      <Text style={styles.body}>
        We employ robust security measures to protect all institutional records against unauthorized access.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  headerTitle: { fontSize: 16, fontWeight: "800", color: "#111827" },
  title: { fontSize: 22, fontWeight: "800", color: "#111827", marginBottom: 4 },
  date: { fontSize: 12, color: "#6B7280", marginBottom: 20 },
  sectionHeading: { fontSize: 15, fontWeight: "700", color: "#1F2937", marginTop: 16, marginBottom: 6 },
  body: { fontSize: 13, color: "#4B5563", lineHeight: 20 },
});

import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing } from "../src/theme/theme";

export default function TermsOfServiceScreen() {
  const router = useRouter();
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms of Service</Text>
        <View style={{ width: 22 }} />
      </View>

      <Text style={styles.title}>Terms of Service</Text>
      <Text style={styles.date}>Last updated: October 2026</Text>

      <Text style={styles.sectionHeading}>1. Acceptance of Terms</Text>
      <Text style={styles.body}>
        By accessing or using our mobile application, you agree to be bound by these Terms of Service and our Privacy Policy.
      </Text>

      <Text style={styles.sectionHeading}>2. Educational Services</Text>
      <Text style={styles.body}>
        This application provides access to educational content, mock tests, and live classes. Course enrollment and account activations are managed securely through authorized administrative channels.
      </Text>

      <Text style={styles.sectionHeading}>3. User Conduct</Text>
      <Text style={styles.body}>
        Users agree not to misuse the platform, attempt unauthorized access, or share account credentials. Proctoring and security measures are enforced during examinations.
      </Text>

      <Text style={styles.sectionHeading}>4. Changes to Terms</Text>
      <Text style={styles.body}>
        We reserve the right to modify these terms at any time. Continued use of the application constitutes acceptance of updated terms.
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

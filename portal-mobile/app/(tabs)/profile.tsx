import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuthStore } from "../../src/store/authStore";
import { useLogout } from "../../src/hooks/useAuth";
import { Card } from "../../src/components/Card";
import { colors, spacing } from "../../src/theme/theme";
import { useTranslation } from "../../src/i18n/LanguageContext";

function getRoleLabel(accountType?: string, tenantType?: string | null): string {
  const isEducation = tenantType === "EDUCATION";
  if (isEducation) {
    if (accountType === "LAW_FIRM_ADMIN" || accountType === "COMPANY") return "Institution Admin";
    if (accountType === "LAWYER") return "Teacher";
    if (accountType === "STAFF") return "Staff";
    return "Institution";
  }
  if (accountType === "LAW_FIRM_ADMIN") return "Law Firm Admin";
  if (accountType === "COMPANY") return "Admin";
  if (accountType === "STAFF") return "Staff";
  return "Lawyer";
}

export default function ProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();
  const { t } = useTranslation();

  const roleLabel = getRoleLabel(user?.accountType, user?.tenantType);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.avatarWrap}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.fullName?.charAt(0) ?? "U"}</Text>
        </View>
        <Text style={styles.name}>{user?.fullName}</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      <Card style={{ marginBottom: spacing.md }}>
        <InfoRow label={t("role")} value={roleLabel} />
        <InfoRow label={t("accountStatus")} value={user?.lawFirmStatus || "ACTIVE"} />
      </Card>

      <TouchableOpacity style={styles.actionButton} onPress={() => router.push("/edit-profile")}>
        <Ionicons name="person-outline" size={20} color={colors.primary} />
        <Text style={styles.actionButtonText}>Edit Profile</Text>
        <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionButton} onPress={() => router.push("/settings")}>
        <Ionicons name="settings-outline" size={20} color={colors.primary} />
        <Text style={styles.actionButtonText}>Settings & Management</Text>
        <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Ionicons name="log-out-outline" size={20} color="#fff" />
        <Text style={styles.logoutText}>{t("logout")}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.md },
  avatarWrap: { alignItems: "center", marginVertical: spacing.lg },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  avatarText: { color: "#fff", fontSize: 28, fontWeight: "800" },
  name: { fontSize: 18, fontWeight: "700", color: colors.textPrimary },
  email: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: spacing.sm },
  infoLabel: { fontSize: 13, color: colors.textSecondary },
  infoValue: { fontSize: 13, color: colors.textPrimary, fontWeight: "600" },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  actionButtonText: { flex: 1, fontSize: 14, fontWeight: "600", color: colors.textPrimary },
  logoutButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.error,
    borderRadius: 10,
    paddingVertical: 14,
    gap: spacing.sm,
  },
  logoutText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});

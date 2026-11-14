import { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Alert, Modal, TextInput } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import { authExtraApi } from "../src/api/authExtra.api";
import { useChangePassword } from "../src/hooks/useDomainData";
import { useAuthStore } from "../src/store/authStore";
import { useTranslation } from "../src/i18n/LanguageContext";
import Constants from "expo-constants";
import { colors, spacing, radius } from "../src/theme/theme";

function SettingsRow({ icon, label, onPress, right }: { icon: any; label: string; onPress?: () => void; right?: React.ReactNode }) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} disabled={!onPress}>
      <View style={styles.rowLeft}>
        <Ionicons name={icon} size={20} color={colors.primary} style={{ marginRight: 12 }} />
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      {right ?? (onPress && <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />)}
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const user = useAuthStore((s) => s.user);
  const { t, language, setLanguage } = useTranslation();
  const changePassword = useChangePassword();

  const isAdmin = user?.accountType === "LAW_FIRM_ADMIN" || user?.accountType === "COMPANY";
  const isEducation = user?.tenantType === "EDUCATION";
  const isLawFirm = user?.tenantType === "LAW_FIRM";

  const [notifEnabled, setNotifEnabled] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const toggleNotif = useMutation({
    mutationFn: (enabled: boolean) => authExtraApi.toggleNotifications(enabled),
  });

  const handleToggleNotif = (val: boolean) => {
    setNotifEnabled(val);
    toggleNotif.mutate(val, {
      onError: () => {
        setNotifEnabled(!val);
        Alert.alert("Error", "Could not update notification preference.");
      },
    });
  };

  const resetForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const submitChangePassword = () => {
    if (newPassword.length < 8) {
      Alert.alert("Too short", "New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Mismatch", "New password and confirmation do not match.");
      return;
    }
    changePassword.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          Alert.alert("Success", "Password changed successfully.");
          resetForm();
          setModalOpen(false);
        },
        onError: (err: any) => {
          Alert.alert("Error", err?.response?.data?.message || "Could not change password.");
        },
      }
    );
  };

  const appVersion = Constants.expoConfig?.version ?? "1.0.0";

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Text style={styles.sectionHeader}>Management & Tools</Text>
        <View style={styles.card}>
          {isAdmin && (
            <>
              <SettingsRow
                icon="people-outline"
                label={isEducation ? "Staff & Teachers" : "Staff & Lawyers"}
                onPress={() => router.push("/staff")}
              />
              <View style={styles.divider} />
            </>
          )}
          {isAdmin && isEducation && (
            <>
              <SettingsRow icon="school-outline" label="Students" onPress={() => router.push("/students")} />
              <View style={styles.divider} />
            </>
          )}
          {isEducation && (
            <>
              <SettingsRow icon="videocam-outline" label="Live Classes" onPress={() => router.push("/live-classes")} />
              <View style={styles.divider} />
            </>
          )}
          {isAdmin && (
            <>
              <SettingsRow icon="bar-chart-outline" label="Reports" onPress={() => router.push("/reports")} />
              <View style={styles.divider} />
              <SettingsRow icon="shield-checkmark-outline" label="Roles & Permissions" onPress={() => router.push("/roles")} />
              <View style={styles.divider} />
              <SettingsRow icon="cash-outline" label="Accounting" onPress={() => router.push("/accounting")} />
              <View style={styles.divider} />
            </>
          )}
          {isAdmin && isEducation && (
            <>
              <SettingsRow icon="speedometer-outline" label="Usage Limits" onPress={() => router.push("/usage-limits")} />
              <View style={styles.divider} />
            </>
          )}
          {isLawFirm && (
            <>
              <SettingsRow icon="library-outline" label="नजिर खोज (Precedent Search)" onPress={() => router.push("/precedents")} />
              <View style={styles.divider} />
              <SettingsRow icon="globe-outline" label="UK Case Law" onPress={() => router.push("/uk-precedents")} />
              <View style={styles.divider} />
              <SettingsRow icon="create-outline" label="Drafting Panel" onPress={() => router.push("/drafting")} />
              <View style={styles.divider} />
              <SettingsRow icon="sparkles-outline" label="AI Legal Assistant" onPress={() => router.push("/ai-assistant")} />
              <View style={styles.divider} />
            </>
          )}
          <SettingsRow icon="document-text-outline" label="AI Content Generator" onPress={() => router.push("/ai-content")} />
          <View style={styles.divider} />
          <SettingsRow icon="chatbubbles-outline" label="Messages" onPress={() => router.push("/messages")} />
          <View style={styles.divider} />
          <SettingsRow icon="card-outline" label="Subscription" onPress={() => router.push("/subscription")} />
        </View>

        <Text style={styles.sectionHeader}>Preferences & Security</Text>
        <View style={styles.card}>
          <SettingsRow
            icon="notifications-outline"
            label="Push Notifications"
            right={<Switch value={notifEnabled} onValueChange={handleToggleNotif} trackColor={{ true: colors.primary }} />}
          />
          <View style={styles.divider} />
          <SettingsRow
            icon="language-outline"
            label={t("language")}
            onPress={() => setLanguage(language === "en" ? "ne" : "en")}
            right={<Text style={styles.langValue}>{language === "en" ? "English" : "नेपाली"}</Text>}
          />
          <View style={styles.divider} />
          <SettingsRow icon="lock-closed-outline" label={t("changePassword")} onPress={() => setModalOpen(true)} />
        </View>

        <Text style={styles.sectionHeader}>Support & Legal</Text>
        <View style={styles.card}>
          {isAdmin && (
            <>
              <SettingsRow icon="help-buoy-outline" label="Support Tickets" onPress={() => router.push("/tickets")} />
              <View style={styles.divider} />
            </>
          )}
          <SettingsRow icon="help-circle-outline" label="Help & Support" onPress={() => router.push("/help-support")} />
          <View style={styles.divider} />
          <SettingsRow icon="information-circle-outline" label="About" onPress={() => router.push("/about")} />
          <View style={styles.divider} />
          <SettingsRow icon="document-text-outline" label="Privacy Policy" onPress={() => router.push("/privacy-policy")} />
          <View style={styles.divider} />
          <SettingsRow icon="document-outline" label="Terms of Service" onPress={() => router.push("/terms-of-service")} />
        </View>

        <Text style={styles.sectionHeader}>Account</Text>
        <View style={styles.card}>
          <SettingsRow icon="trash-outline" label="Delete Account" onPress={() => router.push("/delete-account")} />
        </View>

        <Text style={styles.versionText}>Version {appVersion}</Text>
      </ScrollView>

      <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Change Password</Text>
            <Text style={styles.modalLabel}>Current Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={styles.passwordInput}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry={!showCurrent}
                placeholder="••••••••"
                placeholderTextColor="#9CA3AF"
              />
              <TouchableOpacity onPress={() => setShowCurrent((v) => !v)} style={styles.eyeButton}>
                <Ionicons name={showCurrent ? "eye-off-outline" : "eye-outline"} size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalLabel}>New Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={styles.passwordInput}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showNew}
                placeholder="Minimum 8 characters"
                placeholderTextColor="#9CA3AF"
              />
              <TouchableOpacity onPress={() => setShowNew((v) => !v)} style={styles.eyeButton}>
                <Ionicons name={showNew ? "eye-off-outline" : "eye-outline"} size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalLabel}>Confirm New Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={styles.passwordInput}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirm}
                placeholder="Re-enter new password"
                placeholderTextColor="#9CA3AF"
              />
              <TouchableOpacity onPress={() => setShowConfirm((v) => !v)} style={styles.eyeButton}>
                <Ionicons name={showConfirm ? "eye-off-outline" : "eye-outline"} size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.saveButton} onPress={submitChangePassword} disabled={changePassword.isPending}>
              <Text style={styles.saveButtonText}>{changePassword.isPending ? "Saving..." : "Save Password"}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                resetForm();
                setModalOpen(false);
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  sectionHeader: { fontSize: 12, fontWeight: "700", color: "#9CA3AF", textTransform: "uppercase", marginTop: 20, marginBottom: 8, marginLeft: 4 },
  card: { backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB", overflow: "hidden" },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 14, paddingHorizontal: 16 },
  rowLeft: { flexDirection: "row", alignItems: "center" },
  rowLabel: { fontSize: 15, color: "#111827", fontWeight: "500" },
  langValue: { fontSize: 13, color: colors.textSecondary, fontWeight: "600" },
  divider: { height: 1, backgroundColor: "#F3F4F6", marginLeft: 48 },
  versionText: { textAlign: "center", color: "#9CA3AF", fontSize: 12, marginTop: 24, marginBottom: 12 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg },
  modalTitle: { fontSize: 17, fontWeight: "800", color: colors.textPrimary, marginBottom: spacing.sm },
  modalLabel: { fontSize: 13, fontWeight: "600", color: colors.textSecondary, marginTop: spacing.sm, marginBottom: 6 },
  passwordRow: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm },
  passwordInput: { flex: 1, padding: spacing.sm, fontSize: 14 },
  eyeButton: { paddingHorizontal: 10, paddingVertical: 10 },
  saveButton: { backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: spacing.lg },
  saveButtonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  cancelButton: { alignItems: "center", paddingVertical: 12 },
  cancelButtonText: { color: colors.textSecondary, fontWeight: "600" },
});

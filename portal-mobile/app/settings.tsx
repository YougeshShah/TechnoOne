import { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Alert } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import { authExtraApi } from "../src/api/authExtra.api";
import { useMyProfile } from "../src/hooks/useDomainData";
import Constants from "expo-constants";
import { colors } from "../src/theme/theme";

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
  const { data: profile } = useMyProfile();
  const [notifEnabled, setNotifEnabled] = useState(true);

  const orgType = (profile?.organizationType || profile?.tenantType || profile?.domain || profile?.type || "").toUpperCase();
  const isLawFirm = orgType.includes("LAW") || orgType.includes("LEGAL");

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

  const appVersion = Constants.expoConfig?.version ?? "1.0.0";

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      
      <Text style={styles.sectionHeader}>Account Security</Text>
      <View style={styles.card}>
        <SettingsRow icon="lock-closed-outline" label="Change Password" onPress={() => router.push("/change-password")} />
        <View style={styles.divider} />
        <SettingsRow icon="trash-outline" label="Delete Account" onPress={() => router.push("/delete-account")} />
      </View>

      <Text style={styles.sectionHeader}>Management & Tools</Text>
      <View style={styles.card}>
        <SettingsRow icon="shield-checkmark-outline" label="Roles & Permissions" onPress={() => router.push("/roles")} />
        <View style={styles.divider} />
        <SettingsRow icon="people-outline" label={isLawFirm ? "Staff & Lawyers" : "Staff & Teachers"} onPress={() => router.push("/staff")} />
        {!isLawFirm && (
          <>
            <View style={styles.divider} />
            <SettingsRow icon="school-outline" label="Students" onPress={() => router.push("/students")} />
            <View style={styles.divider} />
            <SettingsRow icon="videocam-outline" label="Live Classes" onPress={() => router.push("/live-classes")} />
          </>
        )}
        <View style={styles.divider} />
        <SettingsRow icon="card-outline" label="Accounting" onPress={() => router.push("/accounting")} />
        <View style={styles.divider} />
        <SettingsRow icon="ribbon-outline" label="Subscription" onPress={() => router.push("/subscription")} />
        <View style={styles.divider} />
        <SettingsRow icon="sparkles-outline" label="AI Content Generator" onPress={() => router.push("/ai-content")} />
        {isLawFirm && (
          <>
            <View style={styles.divider} />
            <SettingsRow icon="book-outline" label="नजिर खोज (Precedent Search)" onPress={() => router.push("/precedents")} />
          </>
        )}
      </View>

      <Text style={styles.sectionHeader}>Preferences & Usage</Text>
      <View style={styles.card}>
        <SettingsRow
          icon="notifications-outline"
          label="Push Notifications"
          right={<Switch value={notifEnabled} onValueChange={handleToggleNotif} trackColor={{ true: colors.primary }} />}
        />
        <View style={styles.divider} />
        <SettingsRow icon="language-outline" label="Language" onPress={() => router.push("/language")} />
        <View style={styles.divider} />
        <SettingsRow icon="stats-chart-outline" label="Usage Limits" onPress={() => router.push("/usage-limits")} />
      </View>

      <Text style={styles.sectionHeader}>Support & Legal</Text>
      <View style={styles.card}>
        <SettingsRow icon="help-buoy-outline" label="Support Tickets" onPress={() => router.push("/tickets")} />
        <View style={styles.divider} />
        <SettingsRow icon="help-circle-outline" label="Help & Support" onPress={() => router.push("/help-support")} />
        <View style={styles.divider} />
        <SettingsRow icon="information-circle-outline" label="About" onPress={() => router.push("/about")} />
        <View style={styles.divider} />
        <SettingsRow icon="document-text-outline" label="Privacy Policy" onPress={() => router.push("/privacy-policy")} />
        <View style={styles.divider} />
        <SettingsRow icon="document-outline" label="Terms of Service" onPress={() => router.push("/terms-of-service")} />
      </View>

      <Text style={styles.versionText}>Version {appVersion}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  sectionHeader: { fontSize: 12, fontWeight: "700", color: "#9CA3AF", textTransform: "uppercase", marginTop: 20, marginBottom: 8, marginLeft: 4 },
  card: { backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB", overflow: "hidden" },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 14, paddingHorizontal: 16 },
  rowLeft: { flexDirection: "row", alignItems: "center" },
  rowLabel: { fontSize: 15, color: "#111827", fontWeight: "500" },
  divider: { height: 1, backgroundColor: "#F3F4F6", marginLeft: 48 },
  versionText: { textAlign: "center", color: "#9CA3AF", fontSize: 12, marginTop: 24, marginBottom: 12 },
});

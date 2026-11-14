import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useMyProfile } from "../../src/hooks/useDomainData";
import { colors } from "../../src/theme/theme";

function getDisplayRole(profile: any): string {
  const rawRole = (profile?.role || "").toUpperCase();
  const orgType = (profile?.organizationType || profile?.tenantType || profile?.domain || profile?.type || "").toUpperCase();
  
  const isInstitution = 
    orgType.includes("INST") || 
    orgType.includes("EDU") || 
    orgType.includes("ACAD") || 
    rawRole.includes("INST") || 
    rawRole.includes("TEACHER");

  if (isInstitution) {
    if (rawRole === "LAWYER" || rawRole === "ADMIN" || rawRole === "OWNER" || !rawRole) {
      return "Institution Admin";
    }
  }

  if (rawRole === "LAWYER" && !orgType.includes("LAW") && !orgType.includes("LEGAL")) {
    return "Institution Admin";
  }

  return profile?.role || "Admin";
}

export default function ProfileScreen() {
  const { data: profile } = useMyProfile();

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: () => router.replace("/(auth)/login") }
    ]);
  };

  const displayRole = getDisplayRole(profile);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <View style={styles.headerCard}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>{profile?.name?.[0] || "P"}</Text>
        </View>
        <Text style={styles.name}>{profile?.name || "User"}</Text>
        <Text style={styles.email}>{profile?.email || ""}</Text>
        
        <View style={styles.badgeContainer}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Role: {displayRole}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: "#DEF7EC" }]}>
            <Text style={[styles.badgeText, { color: "#03543F" }]}>Status: {profile?.status || "ACTIVE"}</Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <TouchableOpacity style={styles.row} onPress={() => router.push("/edit-profile")}>
          <View style={styles.rowLeft}>
            <Ionicons name="person-outline" size={20} color={colors.primary} style={{ marginRight: 12 }} />
            <Text style={styles.rowLabel}>Edit Profile</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.row} onPress={() => router.push("/settings")}>
          <View style={styles.rowLeft}>
            <Ionicons name="settings-outline" size={20} color={colors.primary} style={{ marginRight: 12 }} />
            <Text style={styles.rowLabel}>Settings & Management</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="#DC2626" style={{ marginRight: 8 }} />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  headerCard: { backgroundColor: "#fff", borderRadius: 12, padding: 24, alignItems: "center", marginBottom: 16, borderWidth: 1, borderColor: "#E5E7EB" },
  avatarContainer: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primary, justifyContent: "center", alignItems: "center", marginBottom: 12 },
  avatarText: { fontSize: 28, fontWeight: "bold", color: "#fff" },
  name: { fontSize: 18, fontWeight: "700", color: "#111827", marginBottom: 4 },
  email: { fontSize: 14, color: "#6B7280", marginBottom: 12 },
  badgeContainer: { flexDirection: "row", gap: 8 },
  badge: { backgroundColor: "#F3F4F6", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 12, fontWeight: "600", color: "#374151" },
  card: { backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB", overflow: "hidden", marginBottom: 20 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 14, paddingHorizontal: 16 },
  rowLeft: { flexDirection: "row", alignItems: "center" },
  rowLabel: { fontSize: 15, color: "#111827", fontWeight: "500" },
  divider: { height: 1, backgroundColor: "#F3F4F6", marginLeft: 48 },
  logoutButton: { flexDirection: "row", justifyContent: "center", alignItems: "center", backgroundColor: "#FEE2E2", padding: 14, borderRadius: 12, borderWidth: 1, borderColor: "#FCA5A5" },
  logoutText: { color: "#DC2626", fontSize: 16, fontWeight: "600" }
});

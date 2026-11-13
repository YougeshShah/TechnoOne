import { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Image } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { profileApi } from "../../src/api";
import { SERVER_ORIGIN } from "../../src/api/client";
import { useMySubscriptions } from "../../src/hooks";
import { router } from "expo-router";
import { useAuthStore } from "../../src/store/authStore";
import { useMyProfile } from "../../src/hooks";

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}
function formatRelativeTime(iso?: string | null) {
  if (!iso) return "Never";
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(iso);
}

function MenuRow({ icon, label, onPress, danger }: { icon: any; label: string; onPress: () => void; danger?: boolean }) {
  return (
    <TouchableOpacity style={styles.menuRow} onPress={onPress}>
      <View style={[styles.menuIconBox, danger && { backgroundColor: "#FEF2F2" }]}>
        <Ionicons name={icon} size={18} color={danger ? "#DC2626" : "#2563EB"} />
      </View>
      <Text style={[styles.menuLabel, danger && { color: "#DC2626" }]}>{label}</Text>
      {!danger && <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />}
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const updateUser = useAuthStore((s) => s.updateUser);
  const { data: profile } = useMyProfile();
  const { data: subscriptions } = useMySubscriptions();
  const hasLawSubscription = subscriptions?.some(
    (s: any) => s.course?.category === "LAW" && (s.status === "ACTIVE" || s.status === "TRIAL")
  );
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const handlePickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Please allow photo library access to change your profile picture.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (result.canceled || !result.assets?.[0]) return;
    setUploadingAvatar(true);
    try {
      const uploaded = await profileApi.uploadAvatar(result.assets[0].uri);
      updateUser({ avatarUrl: uploaded.avatarUrl } as any);
    } catch {
      Alert.alert("Error", "Failed to upload profile picture.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const avatarUrl = (user as any)?.avatarUrl;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      {/* Header card */}
      <View style={styles.headerCard}>
        <TouchableOpacity onPress={handlePickAvatar} disabled={uploadingAvatar} style={styles.avatarWrap}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl.startsWith("http") ? avatarUrl : `${SERVER_ORIGIN}/uploads/${avatarUrl}` }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>{user?.fullName?.charAt(0) ?? "S"}</Text>
            </View>
          )}
          <View style={styles.cameraBadge}>
            <Ionicons name="camera" size={12} color="#fff" />
          </View>
        </TouchableOpacity>
        <Text style={styles.name}>{user?.fullName}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        {user?.tenantName && (
          <View style={styles.institutionBadge}>
            <Ionicons name="school-outline" size={12} color="#2563EB" />
            <Text style={styles.institutionText}>{user.tenantName}</Text>
          </View>
        )}
        {profile?.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>Member since {formatDate(profile?.createdAt)}</Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.metaText}>Active {formatRelativeTime(profile?.lastLoginAt)}</Text>
        </View>
      </View>

      {/* Account section */}
      <Text style={styles.sectionHeader}>Account</Text>
      <View style={styles.menuCard}>
        <MenuRow icon="person-outline" label="Edit Profile" onPress={() => router.push("/edit-profile")} />
        <View style={styles.divider} />
        <MenuRow icon="lock-closed-outline" label="Change Password" onPress={() => router.push("/change-password")} />
      </View>

      <Text style={styles.sectionHeader}>Learning</Text>
      <View style={styles.menuCard}>
        <MenuRow icon="bar-chart-outline" label="My Progress" onPress={() => router.push("/progress")} />
        <View style={styles.divider} />
        <MenuRow icon="videocam-outline" label="Live Classes" onPress={() => router.push("/live-classes")} />
      </View>

      {hasLawSubscription && (
        <>
          <Text style={styles.sectionHeader}>Study Tools</Text>
          <View style={styles.menuCard}>
            <MenuRow icon="search-outline" label="नजिर खोज (Precedent Search)" onPress={() => router.push("/precedents")} />
            <MenuRow icon="document-text-outline" label="My Notes" onPress={() => router.push("/my-notes")} />
            <MenuRow icon="chatbubbles-outline" label="Messages" onPress={() => router.push("/messages")} />
          </View>
        </>
      )}

      {/* Settings pushed lower, its own group */}
      <Text style={styles.sectionHeader}>Preferences</Text>
      <View style={styles.menuCard}>
        <MenuRow icon="settings-outline" label="Settings" onPress={() => router.push("/settings")} />
      </View>

      <View style={styles.menuCard}>
        <MenuRow
          icon="log-out-outline"
          label="Log Out"
          danger
          onPress={() => {
            logout();
            router.replace("/(auth)/login");
          }}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  headerCard: { backgroundColor: "#fff", borderRadius: 16, padding: 24, alignItems: "center", borderWidth: 1, borderColor: "#E5E7EB", marginBottom: 20 },
  avatarWrap: { marginBottom: 12 },
  avatarImage: { width: 76, height: 76, borderRadius: 38 },
  avatarPlaceholder: { width: 76, height: 76, borderRadius: 38, backgroundColor: "#2563EB", justifyContent: "center", alignItems: "center" },
  avatarInitial: { color: "#fff", fontSize: 28, fontWeight: "700" },
  cameraBadge: { position: "absolute", bottom: 0, right: 0, backgroundColor: "#2563EB", borderRadius: 10, width: 22, height: 22, justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: "#fff" },
  name: { fontSize: 18, fontWeight: "800", color: "#111827" },
  email: { fontSize: 13, color: "#6B7280", marginTop: 2 },
  institutionBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "#EFF6FF", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, marginTop: 8 },
  institutionText: { fontSize: 12, fontWeight: "600", color: "#2563EB", marginLeft: 5 },
  bio: { fontSize: 13, color: "#4B5563", textAlign: "center", marginTop: 8, paddingHorizontal: 8 },
  metaRow: { flexDirection: "row", alignItems: "center", marginTop: 10 },
  metaText: { fontSize: 11, color: "#9CA3AF" },
  metaDot: { fontSize: 11, color: "#D1D5DB", marginHorizontal: 6 },
  sectionHeader: { fontSize: 12, fontWeight: "700", color: "#9CA3AF", textTransform: "uppercase", marginBottom: 8, marginTop: 4, marginLeft: 4 },
  menuCard: { backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "#E5E7EB", marginBottom: 20, overflow: "hidden" },
  menuRow: { flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 16 },
  menuIconBox: { width: 32, height: 32, borderRadius: 8, backgroundColor: "#EFF6FF", justifyContent: "center", alignItems: "center", marginRight: 12 },
  menuLabel: { flex: 1, fontSize: 15, color: "#111827", fontWeight: "500" },
  divider: { height: 1, backgroundColor: "#F3F4F6", marginLeft: 60 },
});

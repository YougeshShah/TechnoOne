import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Modal,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { proctoringReviewApi, FlaggedAttemptMobile } from "../src/api/proctoringReview.api";
import { useAuthStore } from "../src/store/authStore";
import { attachmentUrlFor } from "../src/utils/staticUrl";
import { colors, spacing } from "../src/theme/theme";

export default function FlaggedAttemptsScreen() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const isEducation = user?.tenantType === "EDUCATION";

  const { data: flaggedAttempts, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["mobile-flagged-attempts"],
    queryFn: () => proctoringReviewApi.listFlaggedAttempts(),
    enabled: isEducation,
  });

  const resolveMutation = useMutation({
    mutationFn: ({ attemptId, action }: { attemptId: string; action: "APPROVE" | "DISQUALIFY" }) =>
      proctoringReviewApi.resolveFlaggedAttempt(attemptId, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mobile-flagged-attempts"] });
    },
  });

  if (!isEducation) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Proctoring Review</Text>
          <View style={{ width: 22 }} />
        </View>
        <View style={{ padding: 24, alignItems: "center" }}>
          <Text style={styles.emptyText}>This feature is only available for educational institutions.</Text>
        </View>
      </View>
    );
  }

  const handleResolve = (item: FlaggedAttemptMobile, action: "APPROVE" | "DISQUALIFY") => {
    const title = action === "APPROVE" ? "Approve & Purge Snapshots?" : "Disqualify Attempt (0 Score)?";
    const msg =
      action === "APPROVE"
        ? `Clear the proctoring flag for ${item.student?.fullName || "this student"}, keep their score, and delete snapshots from server storage?`
        : `Set ${item.student?.fullName || "this student"}'s score to 0 and delete snapshots from server storage?`;

    Alert.alert(title, msg, [
      { text: "Cancel", style: "cancel" },
      {
        text: action === "APPROVE" ? "Approve" : "Disqualify",
        style: action === "DISQUALIFY" ? "destructive" : "default",
        onPress: () => resolveMutation.mutate({ attemptId: item.id, action }),
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Flagged Exam Attempts ({flaggedAttempts?.length ?? 0})</Text>
        <TouchableOpacity onPress={() => refetch()}>
          <Ionicons name="refresh" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <View style={styles.infoBanner}>
        <Ionicons name="shield-checkmark-outline" size={16} color="#1D4ED8" />
        <Text style={styles.infoBannerText}>
          Approving or disqualifying an attempt automatically deletes its proctoring photos from server disk.
        </Text>
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : (
        <FlatList
          data={flaggedAttempts ?? []}
          keyExtractor={(item) => item.id}
          refreshing={isRefetching}
          onRefresh={refetch}
          contentContainerStyle={{ padding: spacing.md }}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="checkmark-done-circle-outline" size={42} color="#10B981" />
              <Text style={styles.emptyTitle}>All Clear!</Text>
              <Text style={styles.emptyText}>No flagged mock test attempts are waiting for review.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const cleanSnapshots = (item.proctoringSnapshotUrls ?? []).map((rel) =>
              attachmentUrlFor(rel.replace(/^\/+/, "").replace(/^uploads\/+/, ""))
            );
            return (
              <View style={styles.card}>
                <View style={{ marginBottom: 10 }}>
                  <Text style={styles.studentName}>{item.student?.fullName || "Student"}</Text>
                  <Text style={styles.subText}>{item.student?.email}</Text>
                  <Text style={styles.testTitle}>Test: {item.mockTest?.title || "Mock Test"}</Text>
                  <Text style={styles.subText}>Started: {new Date(item.startedAt).toLocaleString()}</Text>
                </View>

                <View style={styles.badgeRow}>
                  <View style={[styles.badge, { backgroundColor: "#FEF2F2", borderColor: "#FECACA" }]}>
                    <Text style={[styles.badgeText, { color: "#DC2626" }]}>
                      ⚠️ Tab/App Switches: {item.appLeftCount}
                    </Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" }]}>
                    <Text style={[styles.badgeText, { color: "#1D4ED8" }]}>
                      {item.submittedAt ? `Score: ${item.score ?? 0}/${item.totalQuestions}` : "Not Submitted"}
                    </Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: "#F3F4F6", borderColor: "#E5E7EB" }]}>
                    <Text style={[styles.badgeText, { color: "#374151" }]}>
                      Photos: {cleanSnapshots.length}
                    </Text>
                  </View>
                </View>

                {cleanSnapshots.length > 0 ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 10 }}>
                    {cleanSnapshots.map((uri, idx) => (
                      <TouchableOpacity key={idx} onPress={() => setPreviewUrl(uri)} style={styles.thumbWrap}>
                        <Image source={{ uri }} style={styles.thumbImg} resizeMode="cover" />
                        <View style={styles.thumbLabel}>
                          <Text style={styles.thumbLabelText}>#{idx + 1}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                ) : (
                  <Text style={[styles.subText, { marginVertical: 8 }]}>
                    No camera snapshots saved for this attempt.
                  </Text>
                )}

                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.approveBtn]}
                    disabled={resolveMutation.isPending}
                    onPress={() => handleResolve(item, "APPROVE")}
                  >
                    <Ionicons name="checkmark-circle-outline" size={16} color="#059669" />
                    <Text style={styles.approveBtnText}>Approve & Purge</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, styles.disqualifyBtn]}
                    disabled={resolveMutation.isPending}
                    onPress={() => handleResolve(item, "DISQUALIFY")}
                  >
                    <Ionicons name="ban-outline" size={16} color="#fff" />
                    <Text style={styles.disqualifyBtnText}>Disqualify (0)</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}

      <Modal visible={!!previewUrl} transparent animationType="fade" onRequestClose={() => setPreviewUrl(null)}>
        <View style={styles.modalBackdrop}>
          <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setPreviewUrl(null)}>
            <Ionicons name="close-circle" size={34} color="#fff" />
          </TouchableOpacity>
          {previewUrl && <Image source={{ uri: previewUrl }} style={styles.fullImg} resizeMode="contain" />}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: { fontSize: 16, fontWeight: "800", color: "#111827" },
  infoBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#BFDBFE",
  },
  infoBannerText: { fontSize: 11, color: "#1E3A8A", flex: 1 },
  emptyBox: { alignItems: "center", padding: 36, backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "#E5E7EB", marginTop: 20 },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: "#111827", marginTop: 8 },
  emptyText: { fontSize: 13, color: "#6B7280", marginTop: 4, textAlign: "center" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#FECACA",
    padding: 14,
    marginBottom: 14,
  },
  studentName: { fontSize: 15, fontWeight: "800", color: "#111827" },
  testTitle: { fontSize: 13, fontWeight: "700", color: "#1F2937", marginTop: 4 },
  subText: { fontSize: 11, color: "#6B7280", marginTop: 2 },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  badgeText: { fontSize: 11, fontWeight: "700" },
  thumbWrap: {
    width: 120,
    height: 90,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#EF4444",
    marginRight: 10,
    backgroundColor: "#000",
  },
  thumbImg: { width: "100%", height: "100%" },
  thumbLabel: {
    position: "absolute",
    bottom: 4,
    right: 4,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  thumbLabelText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 8 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  approveBtn: { backgroundColor: "#ECFDF5", borderWidth: 1, borderColor: "#10B981" },
  approveBtnText: { fontSize: 12, fontWeight: "700", color: "#059669" },
  disqualifyBtn: { backgroundColor: "#DC2626" },
  disqualifyBtnText: { fontSize: 12, fontWeight: "700", color: "#fff" },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCloseBtn: { position: "absolute", top: 50, right: 20, zIndex: 10 },
  fullImg: { width: "92%", height: "75%" },
});

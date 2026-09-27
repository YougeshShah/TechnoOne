import { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert, Linking, Modal, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { liveClassApi } from "../src/api/liveClass.api";
import { useAuthStore } from "../src/store/authStore";
import { colors, spacing, radius } from "../src/theme/theme";

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: "#2563EB",
  LIVE: "#DC2626",
  ENDED: "#6B7280",
  CANCELLED: "#9CA3AF",
};

export default function LiveClassesScreen() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  // Scheduling is Company/institution-admin only on the backend
  // (authorize("COMPANY", "LAW_FIRM_ADMIN") on POST /live-classes) --
  // lawyers/staff/teachers can only view and host classes assigned to them.
  const canManage = user?.accountType === "LAW_FIRM_ADMIN";
  const { data: classes, isLoading } = useQuery({ queryKey: ["my-live-classes"], queryFn: () => liveClassApi.myClasses() });

  const joinAsHost = useMutation({
    mutationFn: (id: string) => liveClassApi.joinAsHost(id),
    onSuccess: (data) => Linking.openURL(data.meetingUrl),
    onError: () => Alert.alert("Error", "Could not join this class. It may not be assigned to you."),
  });

  const cancelClass = useMutation({
    mutationFn: (id: string) => liveClassApi.cancel(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-live-classes"] }),
    onError: () => Alert.alert("Error", "Could not cancel this class."),
  });

  const [recordingModalId, setRecordingModalId] = useState<string | null>(null);
  const [recordingUrlInput, setRecordingUrlInput] = useState("");
  const uploadRecording = useMutation({
    mutationFn: ({ id, url }: { id: string; url: string }) => liveClassApi.uploadRecording(id, url),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-live-classes"] });
      setRecordingModalId(null);
      setRecordingUrlInput("");
    },
    onError: () => Alert.alert("Error", "Could not save the recording link."),
  });

  return (
    <View style={styles.container}>
      {canManage && (
        <TouchableOpacity style={styles.scheduleButton} onPress={() => router.push("/schedule-live-class")}>
          <Ionicons name="add-circle" size={18} color="#fff" />
          <Text style={styles.scheduleButtonText}>Schedule Class</Text>
        </TouchableOpacity>
      )}

      {isLoading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      <FlatList
        data={classes ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: spacing.md }}
        ListEmptyComponent={!isLoading ? <Text style={styles.emptyText}>No live classes scheduled.</Text> : null}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
              <Text style={styles.title}>{item.title}</Text>
              <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status] + "20" }]}>
                <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] }]}>{item.status}</Text>
              </View>
            </View>
            {item.course?.name && <Text style={styles.meta}>{item.course.name}</Text>}
            <Text style={styles.meta}>{new Date(item.scheduledAt).toLocaleString()}</Text>
            {item.host?.fullName && <Text style={styles.meta}>Teacher: {item.host.fullName}</Text>}

            {(item.status === "SCHEDULED" || item.status === "LIVE") && (
              <TouchableOpacity
                style={styles.joinButton}
                onPress={() => joinAsHost.mutate(item.id)}
                disabled={joinAsHost.isPending}
              >
                <Ionicons name="videocam" size={16} color="#fff" />
                <Text style={styles.joinButtonText}>{joinAsHost.isPending ? "Joining..." : "Start / Join"}</Text>
              </TouchableOpacity>
            )}

            {canManage && item.status === "SCHEDULED" && (
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() =>
                  Alert.alert("Cancel class?", "Students will no longer be able to join this class.", [
                    { text: "No", style: "cancel" },
                    { text: "Yes, cancel", style: "destructive", onPress: () => cancelClass.mutate(item.id) },
                  ])
                }
              >
                <Text style={styles.cancelButtonText}>Cancel Class</Text>
              </TouchableOpacity>
            )}

            {canManage && item.status === "ENDED" && !item.recordingUrl && (
              <TouchableOpacity
                style={styles.addRecordingButton}
                onPress={() => {
                  setRecordingModalId(item.id);
                  setRecordingUrlInput("");
                }}
              >
                <Ionicons name="link-outline" size={16} color={colors.primary} />
                <Text style={styles.addRecordingButtonText}>Add Recording Link</Text>
              </TouchableOpacity>
            )}

            {item.status === "ENDED" && item.recordingUrl && (
              <TouchableOpacity style={styles.recordingButton} onPress={() => Linking.openURL(item.recordingUrl as string)}>
                <Ionicons name="play-circle-outline" size={16} color={colors.primary} />
                <Text style={styles.recordingButtonText}>Watch Recording</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      />

      <Modal visible={!!recordingModalId} transparent animationType="slide" onRequestClose={() => setRecordingModalId(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Recording Link</Text>
            <Text style={styles.modalHint}>Paste the recording URL (Google Drive, YouTube unlisted, etc.) so students can watch it later.</Text>
            <TextInput
              style={styles.modalInput}
              value={recordingUrlInput}
              onChangeText={setRecordingUrlInput}
              placeholder="https://..."
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={[styles.modalSaveButton, (!recordingUrlInput.trim() || uploadRecording.isPending) && { opacity: 0.6 }]}
              disabled={!recordingUrlInput.trim() || uploadRecording.isPending}
              onPress={() => recordingModalId && uploadRecording.mutate({ id: recordingModalId, url: recordingUrlInput.trim() })}
            >
              <Text style={styles.modalSaveButtonText}>{uploadRecording.isPending ? "Saving..." : "Save"}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCancelButton} onPress={() => setRecordingModalId(null)}>
              <Text style={styles.modalCancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scheduleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.primary,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: radius.md,
    paddingVertical: 12,
  },
  scheduleButtonText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  cancelButton: { alignItems: "center", marginTop: 8 },
  cancelButtonText: { color: "#DC2626", fontWeight: "600", fontSize: 13 },
  addRecordingButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 10 },
  addRecordingButtonText: { color: colors.primary, fontWeight: "600", fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: "#fff", borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg },
  modalTitle: { fontSize: 16, fontWeight: "700", marginBottom: 6 },
  modalHint: { fontSize: 12, color: "#6B7280", marginBottom: spacing.sm },
  modalInput: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: radius.sm, padding: spacing.sm, fontSize: 14, marginBottom: spacing.md },
  modalSaveButton: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 12, alignItems: "center" },
  modalSaveButtonText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  modalCancelButton: { alignItems: "center", paddingVertical: 12 },
  modalCancelButtonText: { color: "#6B7280", fontWeight: "600" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { textAlign: "center", color: colors.textSecondary, marginTop: spacing.xl },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  title: { fontSize: 15, fontWeight: "700", color: colors.textPrimary, flex: 1, marginRight: 8 },
  meta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  statusText: { fontSize: 10, fontWeight: "700" },
  joinButton: {
    flexDirection: "row",
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: 10,
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
  },
  joinButtonText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  recordingButton: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 },
  recordingButtonText: { color: colors.primary, fontWeight: "600", fontSize: 13 },
});

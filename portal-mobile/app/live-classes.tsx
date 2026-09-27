import { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert, Linking } from "react-native";
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

            {item.status === "ENDED" && item.recordingUrl && (
              <TouchableOpacity style={styles.recordingButton} onPress={() => Linking.openURL(item.recordingUrl as string)}>
                <Ionicons name="play-circle-outline" size={16} color={colors.primary} />
                <Text style={styles.recordingButtonText}>Watch Recording</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      />
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

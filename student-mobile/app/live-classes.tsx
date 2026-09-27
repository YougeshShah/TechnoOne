import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueries } from "@tanstack/react-query";
import { liveClassApi, LiveClassItem } from "../src/api/liveClass.api";
import { useMySubscriptions } from "../src/hooks";

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: "#2563EB",
  LIVE: "#DC2626",
  ENDED: "#6B7280",
  CANCELLED: "#9CA3AF",
};

export default function LiveClassesScreen() {
  const router = useRouter();
  const { data: subscriptions, isLoading: loadingSubs } = useMySubscriptions();
  const activeCourseIds = (subscriptions ?? [])
    .filter((s: any) => s.status === "ACTIVE" || s.status === "TRIAL")
    .map((s: any) => s.course.id);

  const classQueries = useQueries({
    queries: activeCourseIds.map((courseId: string) => ({
      queryKey: ["my-live-classes", courseId],
      queryFn: () => liveClassApi.listForCourse(courseId),
      enabled: !!courseId,
    })),
  });

  const isLoading = loadingSubs || classQueries.some((q) => q.isLoading);
  const allClasses: LiveClassItem[] = classQueries
    .flatMap((q) => q.data ?? [])
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

  const join = useMutation({
    mutationFn: (id: string) => liveClassApi.join(id),
    onSuccess: (data) => Linking.openURL(data.meetingUrl),
    onError: (err: any) => {
      Alert.alert("Can't join yet", err?.response?.data?.message || "Could not join this class.");
    },
  });

  return (
    <View style={styles.container}>
      {isLoading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      )}
      <FlatList
        data={allClasses}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyBox}>
              <Ionicons name="videocam-outline" size={32} color="#D1D5DB" />
              <Text style={styles.emptyText}>No live classes scheduled.</Text>
            </View>
          ) : null
        }
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
              <TouchableOpacity style={styles.joinButton} onPress={() => join.mutate(item.id)} disabled={join.isPending}>
                <Ionicons name="videocam" size={16} color="#fff" />
                <Text style={styles.joinButtonText}>{join.isPending ? "Joining..." : "Join Class"}</Text>
              </TouchableOpacity>
            )}
            {item.status === "ENDED" && item.recordingUrl && (
              <TouchableOpacity
                style={styles.recordingButton}
                onPress={() =>
                  router.push({ pathname: "/recording-player", params: { url: item.recordingUrl as string, title: item.title } })
                }
              >
                <Ionicons name="play-circle-outline" size={16} color="#2563EB" />
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
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyBox: { alignItems: "center", marginTop: 60 },
  emptyText: { fontSize: 13, color: "#6B7280", marginTop: 8 },
  card: { backgroundColor: "#fff", borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: "#E5E7EB" },
  title: { fontSize: 15, fontWeight: "700", color: "#111827", flex: 1, marginRight: 8 },
  meta: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  statusText: { fontSize: 10, fontWeight: "700" },
  joinButton: {
    flexDirection: "row",
    backgroundColor: "#2563EB",
    borderRadius: 10,
    paddingVertical: 10,
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
  },
  joinButtonText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  recordingButton: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 },
  recordingButtonText: { color: "#2563EB", fontWeight: "600", fontSize: 13 },
});

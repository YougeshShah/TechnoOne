import { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { institutionStudentApi, InstitutionStudent } from "../src/api/institutionStudent.api";
import { colors, spacing, radius } from "../src/theme/theme";

const statusColor: Record<string, string> = {
  ACTIVE: "#059669",
  PENDING_VERIFICATION: "#D97706",
  SUSPENDED: "#DC2626",
};

const TABS: { key: "PENDING_VERIFICATION" | "ACTIVE" | undefined; label: string }[] = [
  { key: "PENDING_VERIFICATION", label: "Pending" },
  { key: "ACTIVE", label: "Active" },
  { key: undefined, label: "All" },
];

export default function StudentsScreen() {
  const [tab, setTab] = useState<"PENDING_VERIFICATION" | "ACTIVE" | undefined>("PENDING_VERIFICATION");
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["institution-students", tab],
    queryFn: () => institutionStudentApi.list(tab),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["institution-students"] });
  const approve = useMutation({ mutationFn: (id: string) => institutionStudentApi.approve(id), onSuccess: invalidate });
  const reject = useMutation({ mutationFn: (id: string) => institutionStudentApi.reject(id), onSuccess: invalidate });
  const suspend = useMutation({ mutationFn: (id: string) => institutionStudentApi.suspend(id), onSuccess: invalidate });

  const handleReject = (student: InstitutionStudent) => {
    Alert.alert("Reject Student?", `Remove ${student.fullName}'s registration? This cannot be undone.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Reject", style: "destructive", onPress: () => reject.mutate(student.id) },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Students</Text>
        <TouchableOpacity onPress={() => router.push("/flagged-attempts" as any)} style={{ backgroundColor: "#FEF2F2", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: "#FECACA" }}>
          <Text style={{ fontSize: 11, fontWeight: "700", color: "#DC2626" }}>⚠️ Flagged Exams</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabRow}>
        {TABS.map((tb) => (
          <TouchableOpacity
            key={tb.label}
            style={[styles.tab, tab === tb.key && styles.tabActive]}
            onPress={() => setTab(tb.key)}
          >
            <Text style={[styles.tabText, tab === tb.key && styles.tabTextActive]}>{tb.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: spacing.md }}
          ListEmptyComponent={<Text style={styles.emptyText}>No students found.</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.fullName}</Text>
                <Text style={styles.email}>{item.email}</Text>
                {item.phone && <Text style={styles.email}>{item.phone}</Text>}
                <View style={[styles.tag, { backgroundColor: (statusColor[item.status] ?? "#6B7280") + "1A", marginTop: 6 }]}>
                  <Text style={[styles.tagText, { color: statusColor[item.status] ?? "#6B7280" }]}>{item.status.replace("_", " ")}</Text>
                </View>
              </View>
              <View style={styles.actions}>
                {item.status === "PENDING_VERIFICATION" && (
                  <>
                    <TouchableOpacity onPress={() => approve.mutate(item.id)} style={styles.actionBtn}>
                      <Ionicons name="checkmark-circle-outline" size={22} color="#059669" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleReject(item)} style={styles.actionBtn}>
                      <Ionicons name="close-circle-outline" size={22} color="#DC2626" />
                    </TouchableOpacity>
                  </>
                )}
                {item.status === "ACTIVE" && (
                  <TouchableOpacity onPress={() => suspend.mutate(item.id)} style={styles.actionBtn}>
                    <Ionicons name="pause-circle-outline" size={22} color="#DC2626" />
                  </TouchableOpacity>
                )}
                {item.status === "SUSPENDED" && (
                  <TouchableOpacity onPress={() => approve.mutate(item.id)} style={styles.actionBtn}>
                    <Ionicons name="play-circle-outline" size={22} color="#059669" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle: { fontSize: 17, fontWeight: "700", color: colors.textPrimary },
  tabRow: { flexDirection: "row", padding: spacing.md, gap: 8 },
  tab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { fontSize: 13, fontWeight: "600", color: colors.textSecondary },
  tabTextActive: { color: "#fff" },
  emptyText: { textAlign: "center", color: colors.textSecondary, marginTop: 40 },
  card: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: spacing.md, marginBottom: spacing.sm },
  name: { fontSize: 15, fontWeight: "700", color: colors.textPrimary },
  email: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  tag: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  tagText: { fontSize: 10, fontWeight: "700" },
  actions: { flexDirection: "row", gap: 4 },
  actionBtn: { padding: 4 },
});

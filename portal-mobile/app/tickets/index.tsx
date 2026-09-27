import { useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Modal } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { ticketApi, TicketStatus, TicketSummary } from "../../src/api/ticket.api";
import { Card } from "../../src/components/Card";
import { colors, spacing, radius } from "../../src/theme/theme";

const POLL_INTERVAL_MS = 8000;

const STATUS_COLOR: Record<TicketStatus, string> = {
  OPEN: colors.warning,
  IN_PROGRESS: colors.info,
  RESOLVED: colors.success,
  CLOSED: colors.textSecondary,
};

const FILTERS: Array<{ label: string; value: TicketStatus | "ALL" }> = [
  { label: "All", value: "ALL" },
  { label: "Open", value: "OPEN" },
  { label: "In Progress", value: "IN_PROGRESS" },
  { label: "Resolved", value: "RESOLVED" },
  { label: "Closed", value: "CLOSED" },
];

export default function TicketsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<TicketStatus | "ALL">("ALL");
  const [filterPickerOpen, setFilterPickerOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["tickets", filter],
    queryFn: () => ticketApi.list(filter === "ALL" ? undefined : filter),
    refetchInterval: POLL_INTERVAL_MS,
  });

  const tickets = data?.items ?? [];

  const activeFilterLabel = FILTERS.find((f) => f.value === filter)?.label ?? "All";

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.filterDropdown} onPress={() => setFilterPickerOpen(true)}>
        <Text style={styles.filterDropdownText}>Status: {activeFilterLabel}</Text>
        <Ionicons name="chevron-down" size={18} color="#6B7280" />
      </TouchableOpacity>

      <Modal visible={filterPickerOpen} transparent animationType="slide" onRequestClose={() => setFilterPickerOpen(false)}>
        <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setFilterPickerOpen(false)}>
          <View style={[styles.pickerCard, { paddingBottom: spacing.md + insets.bottom }]}>
            <Text style={styles.pickerTitle}>Filter by Status</Text>
            {FILTERS.map((f) => (
              <TouchableOpacity
                key={f.value}
                style={styles.pickerItem}
                onPress={() => {
                  setFilter(f.value);
                  setFilterPickerOpen(false);
                }}
              >
                <Text style={styles.pickerItemText}>{f.label}</Text>
                {filter === f.value && <Ionicons name="checkmark" size={18} color={colors.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <FlatList
        data={tickets}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: spacing.md, flexGrow: 1 }}
        renderItem={({ item }: { item: TicketSummary }) => (
          <TouchableOpacity onPress={() => router.push({ pathname: "/tickets/[id]", params: { id: item.id } })}>
            <Card style={{ marginBottom: spacing.sm }}>
              <View style={styles.rowBetween}>
                <Text style={styles.subject} numberOfLines={1}>{item.subject}</Text>
                <View style={[styles.statusBadge, { backgroundColor: `${STATUS_COLOR[item.status]}22` }]}>
                  <Text style={[styles.statusText, { color: STATUS_COLOR[item.status] }]}>{item.status.replace("_", " ")}</Text>
                </View>
              </View>
              <Text style={styles.meta}>{new Date(item.updatedAt).toLocaleString()}</Text>
            </Card>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          !isLoading ? (
            <Text style={styles.emptyText}>No tickets in this filter.</Text>
          ) : (
            <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
          )
        }
      />

      <TouchableOpacity style={[styles.fab, { bottom: spacing.lg + insets.bottom }]} onPress={() => router.push("/tickets/new")}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  filterDropdown: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  filterDropdownText: { fontSize: 14, fontWeight: "600", color: colors.textPrimary },
  pickerOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  pickerCard: { backgroundColor: "#fff", borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg },
  pickerTitle: { fontSize: 16, fontWeight: "700", marginBottom: spacing.md },
  pickerItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  pickerItemText: { fontSize: 15, color: colors.textPrimary },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  subject: { fontSize: 14, fontWeight: "700", color: colors.textPrimary, flex: 1, marginRight: spacing.sm },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: "700" },
  meta: { fontSize: 12, color: colors.textSecondary, marginTop: 6 },
  emptyText: { textAlign: "center", color: colors.textSecondary, marginTop: spacing.xl },
  fab: {
    position: "absolute",
    right: spacing.md,
    bottom: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
});

import sys

# Run this from the portal-mobile/ root directory.

path = 'app/tickets/index.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old1 = '''import { useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { ticketApi, TicketStatus, TicketSummary } from "../../src/api/ticket.api";
import { Card } from "../../src/components/Card";
import { colors, spacing, radius } from "../../src/theme/theme";'''

new1 = '''import { useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Modal } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { ticketApi, TicketStatus, TicketSummary } from "../../src/api/ticket.api";
import { Card } from "../../src/components/Card";
import { colors, spacing, radius } from "../../src/theme/theme";'''

c1 = content.count(old1)
print(f'imports anchor count = {c1}')
if c1 != 1:
    print('ERROR: aborting (imports).')
    sys.exit(1)
content = content.replace(old1, new1)

old2 = '''export default function TicketsScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<TicketStatus | "ALL">("ALL");'''

new2 = '''export default function TicketsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<TicketStatus | "ALL">("ALL");
  const [filterPickerOpen, setFilterPickerOpen] = useState(false);'''

c2 = content.count(old2)
print(f'state anchor count = {c2}')
if c2 != 1:
    print('ERROR: aborting (state).')
    sys.exit(1)
content = content.replace(old2, new2)

old3 = '''  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{ paddingHorizontal: spacing.md, gap: spacing.sm }}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.value}
            style={[styles.filterChip, filter === f.value && styles.filterChipActive]}
            onPress={() => setFilter(f.value)}
          >
            <Text style={[styles.filterChipText, filter === f.value && styles.filterChipTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>'''

new3 = '''  const activeFilterLabel = FILTERS.find((f) => f.value === filter)?.label ?? "All";

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
      </Modal>'''

c3 = content.count(old3)
print(f'filter-row anchor count = {c3}')
if c3 != 1:
    print('ERROR: aborting (filter row).')
    sys.exit(1)
content = content.replace(old3, new3)

old4 = '''      <TouchableOpacity style={styles.fab} onPress={() => router.push("/tickets/new")}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>'''

new4 = '''      <TouchableOpacity style={[styles.fab, { bottom: spacing.lg + insets.bottom }]} onPress={() => router.push("/tickets/new")}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>'''

c4 = content.count(old4)
print(f'fab anchor count = {c4}')
if c4 != 1:
    print('ERROR: aborting (fab).')
    sys.exit(1)
content = content.replace(old4, new4)

old5 = '''  filterRow: { flexGrow: 0, paddingVertical: spacing.sm },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterChipText: { fontSize: 12, fontWeight: "600", color: colors.textSecondary },
  filterChipTextActive: { color: "#fff" },'''

new5 = '''  filterDropdown: {
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
  pickerItemText: { fontSize: 15, color: colors.textPrimary },'''

c5 = content.count(old5)
print(f'styles anchor count = {c5}')
if c5 != 1:
    print('ERROR: aborting (styles).')
    sys.exit(1)
content = content.replace(old5, new5)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Patched app/tickets/index.tsx')

import { useState, useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  ActivityIndicator,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePrecedentSearch, usePrecedentDetail, usePrecedentCategories } from "../src/hooks/usePrecedents";
import { colors, spacing, radius } from "../src/theme/theme";

function HighlightedText({ text, term, activeInThisParagraph }: { text: string; term: string; activeInThisParagraph: number | null }) {
  if (!term.trim()) return <Text>{text}</Text>;
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  let localMatchIndex = -1;
  return (
    <Text>
      {parts.map((part, i) => {
        if (part.toLowerCase() !== term.toLowerCase()) return part;
        localMatchIndex++;
        const isActive = localMatchIndex === activeInThisParagraph;
        return (
          <Text key={i} style={{ backgroundColor: isActive ? "#FB923C" : "#FEF08A" }}>
            {part}
          </Text>
        );
      })}
    </Text>
  );
}

// Same paragraph-level scroll-to-match approach used in the Legal Library
// viewer -- React Native has no scrollIntoView and measuring inline <Text>
// spans is unreliable, so this splits the judgment into paragraphs,
// tracks each one's Y position via onLayout, and scrolls to whichever
// paragraph holds the currently "active" match.
function DocumentSearchViewer({ text, term }: { text: string; term: string }) {
  const scrollRef = useRef<ScrollView>(null);
  const paragraphYPositions = useRef<Record<number, number>>({});
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);

  const paragraphs = useMemo(() => text.split(/\n+/), [text]);

  const matchCountsByParagraph = useMemo(() => {
    if (!term.trim()) return [];
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(escaped, "gi");
    return paragraphs.map((p) => (p.match(re) ?? []).length);
  }, [paragraphs, term]);

  const totalMatches = matchCountsByParagraph.reduce((a, b) => a + b, 0);

  function locateMatch(globalIndex: number): { paragraphIndex: number; localIndex: number } {
    let remaining = globalIndex;
    for (let p = 0; p < matchCountsByParagraph.length; p++) {
      if (remaining < matchCountsByParagraph[p]) return { paragraphIndex: p, localIndex: remaining };
      remaining -= matchCountsByParagraph[p];
    }
    return { paragraphIndex: 0, localIndex: 0 };
  }

  const scrollToMatch = (globalIndex: number) => {
    const { paragraphIndex } = locateMatch(globalIndex);
    const y = paragraphYPositions.current[paragraphIndex];
    if (y !== undefined) scrollRef.current?.scrollTo({ y: Math.max(0, y - 40), animated: true });
  };

  const goToMatch = (index: number) => {
    if (totalMatches === 0) return;
    const wrapped = (index + totalMatches) % totalMatches;
    setActiveMatchIndex(wrapped);
    scrollToMatch(wrapped);
  };

  const { paragraphIndex: activeParagraph, localIndex: activeLocalIndex } = locateMatch(activeMatchIndex);

  return (
    <View style={{ flex: 1 }}>
      {term.trim() && (
        <View style={styles.matchBar}>
          <Text style={styles.matchCount}>{totalMatches > 0 ? `${activeMatchIndex + 1} / ${totalMatches}` : "0 / 0"}</Text>
          <TouchableOpacity onPress={() => goToMatch(activeMatchIndex - 1)} disabled={totalMatches === 0}>
            <Ionicons name="chevron-up" size={20} color={totalMatches === 0 ? "#D1D5DB" : colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => goToMatch(activeMatchIndex + 1)} disabled={totalMatches === 0}>
            <Ionicons name="chevron-down" size={20} color={totalMatches === 0 ? "#D1D5DB" : colors.textPrimary} />
          </TouchableOpacity>
        </View>
      )}
      <ScrollView ref={scrollRef} contentContainerStyle={{ padding: spacing.md }}>
        {paragraphs.map((p, i) => (
          <View key={i} onLayout={(e) => (paragraphYPositions.current[i] = e.nativeEvent.layout.y)} style={{ marginBottom: 10 }}>
            <HighlightedText text={p} term={term} activeInThisParagraph={i === activeParagraph ? activeLocalIndex : null} />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

export default function PrecedentsScreen() {
  const insets = useSafeAreaInsets();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [inDocSearch, setInDocSearch] = useState("");

  const { data: categories } = usePrecedentCategories();
  const { data: results, isLoading } = usePrecedentSearch({ search: search || undefined, category: category || undefined, page, limit: 20 });
  const { data: detail, isLoading: loadingDetail } = usePrecedentDetail(viewingId ?? undefined);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>नजिर खोज</Text>
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          placeholder="कुनैपनि शब्द, पक्षको नाम खोज्नुहोस्..."
          value={searchInput}
          onChangeText={setSearchInput}
          onSubmitEditing={() => {
            setSearch(searchInput);
            setPage(1);
          }}
          returnKeyType="search"
        />
      </View>

      <TouchableOpacity style={styles.categoryDropdown} onPress={() => setCategoryPickerOpen(true)}>
        <Text style={category ? styles.categoryDropdownText : styles.categoryDropdownPlaceholder}>{category || "All Categories"}</Text>
        <Ionicons name="chevron-down" size={18} color="#6B7280" />
      </TouchableOpacity>

      {isLoading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      <FlatList
        data={results?.items ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: spacing.md }}
        ListEmptyComponent={!isLoading ? <Text style={styles.emptyText}>कुनै नजिर भेटिएन।</Text> : null}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => {
              setViewingId(item.id);
              setInDocSearch("");
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={styles.cardTitle} numberOfLines={2}>
                {item.title}
              </Text>
              {item.category && (
                <View style={styles.categoryChip}>
                  <Text style={styles.categoryChipText}>{item.category}</Text>
                </View>
              )}
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 6 }}>
              {item.court && <Text style={styles.cardMeta}>{item.court}</Text>}
              {item.caseNumber && <Text style={styles.cardMeta}>{item.caseNumber}</Text>}
              {item.decisionDate && <Text style={styles.cardMeta}>मिति: {item.decisionDate}</Text>}
            </View>
          </TouchableOpacity>
        )}
      />
      {results && results.pagination.totalPages > 1 && (
        <View style={[styles.pageBar, { paddingBottom: 10 + insets.bottom }]}>
          <TouchableOpacity
            onPress={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            style={[styles.pageButton, page <= 1 && styles.pageButtonDisabled]}
          >
            <Ionicons name="chevron-back" size={18} color={page <= 1 ? "#D1D5DB" : colors.primary} />
          </TouchableOpacity>
          <Text style={styles.pageText}>
            Page {results.pagination.page} of {results.pagination.totalPages}
          </Text>
          <TouchableOpacity
            onPress={() => setPage((p) => Math.min(results.pagination.totalPages, p + 1))}
            disabled={page >= results.pagination.totalPages}
            style={[styles.pageButton, page >= results.pagination.totalPages && styles.pageButtonDisabled]}
          >
            <Ionicons name="chevron-forward" size={18} color={page >= results.pagination.totalPages ? "#D1D5DB" : colors.primary} />
          </TouchableOpacity>
        </View>
      )}

      <Modal visible={categoryPickerOpen} transparent animationType="slide" onRequestClose={() => setCategoryPickerOpen(false)}>
        <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setCategoryPickerOpen(false)}>
          <View style={[styles.pickerCard, { paddingBottom: spacing.md + insets.bottom }]}>
            <Text style={styles.pickerTitle}>Select Category</Text>
            <FlatList
              data={["", ...(categories ?? [])]}
              keyExtractor={(item, i) => item || `all-${i}`}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.pickerItem}
                  onPress={() => {
                    setCategory(item);
                    setCategoryPickerOpen(false);
                  }}
                >
                  <Text style={styles.pickerItemText}>{item || "All Categories"}</Text>
                  {category === item && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={!!viewingId} animationType="slide" onRequestClose={() => setViewingId(null)}>
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle} numberOfLines={1}>
              {detail?.title}
            </Text>
            <TouchableOpacity onPress={() => setViewingId(null)}>
              <Ionicons name="close" size={26} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {loadingDetail && (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          )}

          {detail && !loadingDetail && (
            <>
              <View style={styles.searchBar}>
                <Ionicons name="search" size={18} color="#9CA3AF" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="यो फैसला भित्र शब्द खोज्नुहोस्..."
                  value={inDocSearch}
                  onChangeText={setInDocSearch}
                />
              </View>
              <DocumentSearchViewer text={detail.fullContent} term={inDocSearch} />
            </>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  pageBar: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 16, paddingVertical: 10, borderTopWidth: 1, borderTopColor: "#E5E7EB" },
  pageButton: { padding: 8, borderRadius: 20, backgroundColor: "#F3F4F6" },
  pageButtonDisabled: { opacity: 0.5 },
  pageText: { fontSize: 13, fontWeight: "600", color: colors.textPrimary },
  container: { flex: 1, backgroundColor: colors.background },
  header: { padding: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { fontSize: 18, fontWeight: "700", color: colors.textPrimary },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F3F4F6",
    borderRadius: radius.sm,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    paddingHorizontal: 12,
    height: 42,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.textPrimary },
  categoryDropdown: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: radius.sm,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    paddingHorizontal: 12,
    height: 42,
  },
  categoryDropdownText: { fontSize: 14, color: colors.textPrimary, fontWeight: "600" },
  categoryDropdownPlaceholder: { fontSize: 14, color: "#9CA3AF" },
  pickerOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  pickerCard: { backgroundColor: "#fff", borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, maxHeight: "70%" },
  pickerTitle: { fontSize: 16, fontWeight: "700", marginBottom: spacing.md },
  pickerItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  pickerItemText: { fontSize: 15, color: colors.textPrimary },
  emptyText: { textAlign: "center", color: colors.textSecondary, marginTop: spacing.xl },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  cardTitle: { fontSize: 14, fontWeight: "700", color: colors.textPrimary, flex: 1, marginRight: 8 },
  cardMeta: { fontSize: 11, color: colors.textSecondary },
  categoryChip: { backgroundColor: "#EFF6FF", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, alignSelf: "flex-start" },
  categoryChipText: { fontSize: 10, color: colors.primary, fontWeight: "700" },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { fontSize: 16, fontWeight: "700", flex: 1, marginRight: 12, color: colors.textPrimary },
  matchBar: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: spacing.md, paddingVertical: 8, backgroundColor: "#F9FAFB", borderBottomWidth: 1, borderBottomColor: colors.border },
  matchCount: { fontSize: 13, color: colors.textSecondary, marginRight: "auto" },
});

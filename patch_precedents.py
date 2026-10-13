import sys

# Run this from the portal-mobile/ root directory.

path = 'app/precedents.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Imports: add useSafeAreaInsets.
old1 = '''import { Ionicons } from "@expo/vector-icons";
import { usePrecedentSearch, usePrecedentDetail, usePrecedentCategories } from "../src/hooks/usePrecedents";
import { colors, spacing, radius } from "../src/theme/theme";'''

new1 = '''import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePrecedentSearch, usePrecedentDetail, usePrecedentCategories } from "../src/hooks/usePrecedents";
import { colors, spacing, radius } from "../src/theme/theme";'''

c1 = content.count(old1)
print(f'imports anchor count = {c1}')
if c1 != 1:
    print('ERROR: aborting (imports).')
    sys.exit(1)
content = content.replace(old1, new1)

# 2. Component body: add insets + categoryPickerOpen state.
old2 = '''export default function PrecedentsScreen() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [inDocSearch, setInDocSearch] = useState("");'''

new2 = '''export default function PrecedentsScreen() {
  const insets = useSafeAreaInsets();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [inDocSearch, setInDocSearch] = useState("");'''

c2 = content.count(old2)
print(f'state anchor count = {c2}')
if c2 != 1:
    print('ERROR: aborting (state).')
    sys.exit(1)
content = content.replace(old2, new2)

# 3. Replace horizontal chip filter with a dropdown button (+ modal added later).
old3 = '''      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow} contentContainerStyle={{ paddingHorizontal: spacing.md, gap: 8 }}>
        <TouchableOpacity onPress={() => setCategory("")} style={[styles.chip, !category && styles.chipActive]}>
          <Text style={[styles.chipText, !category && styles.chipTextActive]}>All</Text>
        </TouchableOpacity>
        {categories?.map((c) => (
          <TouchableOpacity key={c} onPress={() => setCategory(c)} style={[styles.chip, category === c && styles.chipActive]}>
            <Text style={[styles.chipText, category === c && styles.chipTextActive]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>'''

new3 = '''      <TouchableOpacity style={styles.categoryDropdown} onPress={() => setCategoryPickerOpen(true)}>
        <Text style={category ? styles.categoryDropdownText : styles.categoryDropdownPlaceholder}>{category || "All Categories"}</Text>
        <Ionicons name="chevron-down" size={18} color="#6B7280" />
      </TouchableOpacity>'''

c3 = content.count(old3)
print(f'chip-row anchor count = {c3}')
if c3 != 1:
    print('ERROR: aborting (chip row).')
    sys.exit(1)
content = content.replace(old3, new3)

# 4. Pagination bar: add safe-area bottom padding so it clears the phone's gesture/nav bar.
old4 = '''      {results && results.pagination.totalPages > 1 && (
        <View style={styles.pageBar}>'''

new4 = '''      {results && results.pagination.totalPages > 1 && (
        <View style={[styles.pageBar, { paddingBottom: 10 + insets.bottom }]}>'''

c4 = content.count(old4)
print(f'pageBar anchor count = {c4}')
if c4 != 1:
    print('ERROR: aborting (pageBar).')
    sys.exit(1)
content = content.replace(old4, new4)

# 5. Add the category picker modal right after the closing of the results FlatList's
#    pagination block, before the detail-viewer Modal.
old5 = '''      <Modal visible={!!viewingId} animationType="slide" onRequestClose={() => setViewingId(null)}>'''

new5 = '''      <Modal visible={categoryPickerOpen} transparent animationType="slide" onRequestClose={() => setCategoryPickerOpen(false)}>
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

      <Modal visible={!!viewingId} animationType="slide" onRequestClose={() => setViewingId(null)}>'''

c5 = content.count(old5)
print(f'detail-modal anchor count = {c5}')
if c5 != 1:
    print('ERROR: aborting (detail modal).')
    sys.exit(1)
content = content.replace(old5, new5)

# 6. Styles: drop the now-unused chip styles, add dropdown + picker-modal styles.
old6 = '''  chipRow: { maxHeight: 52, marginTop: spacing.sm },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: "#F3F4F6", justifyContent: "center" },
  chipActive: { backgroundColor: colors.primary },
  chipText: { fontSize: 13, color: "#374151", fontWeight: "600" },
  chipTextActive: { color: "#fff" },'''

new6 = '''  categoryDropdown: {
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
  pickerItemText: { fontSize: 15, color: colors.textPrimary },'''

c6 = content.count(old6)
print(f'styles anchor count = {c6}')
if c6 != 1:
    print('ERROR: aborting (styles).')
    sys.exit(1)
content = content.replace(old6, new6)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Patched app/precedents.tsx')

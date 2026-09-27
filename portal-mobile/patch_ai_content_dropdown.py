import sys

# Run this from the portal-mobile/ root directory. Run AFTER the earlier
# patch_ai_content.py (tenant-aware DOCUMENT_TYPES) and patch_root_layout.py.

path = 'app/ai-content.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old1 = '''import { useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useMutation } from "@tanstack/react-query";
import { apiClient } from "../src/api/client";
import { colors, spacing, radius } from "../src/theme/theme";
import { useAuthStore } from "../src/store/authStore";'''

new1 = '''import { useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Platform, Modal, FlatList } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useMutation } from "@tanstack/react-query";
import { apiClient } from "../src/api/client";
import { colors, spacing, radius } from "../src/theme/theme";
import { useAuthStore } from "../src/store/authStore";'''

c1 = content.count(old1)
print(f'imports anchor count = {c1}')
if c1 != 1:
    print('ERROR: aborting (imports).')
    sys.exit(1)
content = content.replace(old1, new1)

old2 = '''  const [documentType, setDocumentType] = useState(DOCUMENT_TYPES[0]);
  const [details, setDetails] = useState("");
  const [language, setLanguage] = useState<"en" | "ne">("en");
  const [copied, setCopied] = useState(false);'''

new2 = '''  const [documentType, setDocumentType] = useState(DOCUMENT_TYPES[0]);
  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [details, setDetails] = useState("");
  const [language, setLanguage] = useState<"en" | "ne">("en");
  const [copied, setCopied] = useState(false);'''

c2 = content.count(old2)
print(f'state anchor count = {c2}')
if c2 != 1:
    print('ERROR: aborting (state).')
    sys.exit(1)
content = content.replace(old2, new2)

old3 = '''      <Text style={styles.label}>Document Type</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroll}>
        {DOCUMENT_TYPES.map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.typeChip, documentType === t && styles.typeChipActive]}
            onPress={() => setDocumentType(t)}
          >
            <Text style={[styles.typeChipText, documentType === t && styles.typeChipTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>'''

new3 = '''      <Text style={styles.label}>Document Type</Text>
      <TouchableOpacity style={styles.dropdown} onPress={() => setTypePickerOpen(true)}>
        <Text style={styles.dropdownText}>{documentType}</Text>
        <Ionicons name="chevron-down" size={18} color="#6B7280" />
      </TouchableOpacity>

      <Modal visible={typePickerOpen} transparent animationType="slide" onRequestClose={() => setTypePickerOpen(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setTypePickerOpen(false)}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Document Type</Text>
            <FlatList
              data={DOCUMENT_TYPES}
              keyExtractor={(t) => t}
              renderItem={({ item: t }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    setDocumentType(t);
                    setTypePickerOpen(false);
                  }}
                >
                  <Text style={styles.modalItemText}>{t}</Text>
                  {documentType === t && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>'''

c3 = content.count(old3)
print(f'document-type anchor count = {c3}')
if c3 != 1:
    print('ERROR: aborting (document type block).')
    sys.exit(1)
content = content.replace(old3, new3)

old4 = '''  typeScroll: { marginBottom: spacing.sm },
  typeChip: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 8, marginRight: 8 },
  typeChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  typeChipText: { fontSize: 13, color: "#374151" },
  typeChipTextActive: { color: "#fff", fontWeight: "600" },'''

new4 = '''  dropdown: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: spacing.sm,
  },
  dropdownText: { fontSize: 14, color: "#111827", fontWeight: "600" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: "#fff", borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, maxHeight: "70%" },
  modalTitle: { fontSize: 16, fontWeight: "700", marginBottom: spacing.md },
  modalItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  modalItemText: { fontSize: 15, color: "#111827" },'''

c4 = content.count(old4)
print(f'styles anchor count = {c4}')
if c4 != 1:
    print('ERROR: aborting (styles).')
    sys.exit(1)
content = content.replace(old4, new4)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Patched app/ai-content.tsx (document type -> dropdown)')

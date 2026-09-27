import { useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Platform, Modal, FlatList } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useMutation } from "@tanstack/react-query";
import { apiClient } from "../src/api/client";
import { colors, spacing, radius } from "../src/theme/theme";
import { useAuthStore } from "../src/store/authStore";

const LAW_FIRM_DOCUMENT_TYPES = [
  "Legal Notice",
  "Client Engagement Letter",
  "Demand Letter",
  "Affidavit (सपथपत्र)",
  "Power of Attorney (मुख्तियारनामा)",
  "Rental/Lease Agreement",
  "NDA",
];

const EDUCATION_DOCUMENT_TYPES = [
  "Course Syllabus",
  "Student Notice/Circular",
  "Certificate of Completion",
  "Parent/Guardian Letter",
  "Class Schedule Notice",
  "Admission Offer Letter",
  "Fee Reminder Notice",
];

export default function AiContentScreen() {
  const user = useAuthStore((s) => s.user);
  const DOCUMENT_TYPES = user?.tenantType === "EDUCATION" ? EDUCATION_DOCUMENT_TYPES : LAW_FIRM_DOCUMENT_TYPES;
  const [documentType, setDocumentType] = useState(DOCUMENT_TYPES[0]);
  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [details, setDetails] = useState("");
  const [language, setLanguage] = useState<"en" | "ne">("en");
  const [copied, setCopied] = useState(false);

  const generate = useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post("/ai-content/generate", { documentType, details, language });
      return data.data as { content: string };
    },
  });

  const handleCopy = async () => {
    if (generate.data?.content) {
      await Clipboard.setStringAsync(generate.data.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.subtitle}>
        Generate a first draft. Always review and edit before use — this is a starting point, not a finished document.
      </Text>

      <Text style={styles.label}>Document Type</Text>
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
      </Modal>

      <Text style={styles.label}>Language</Text>
      <View style={styles.langRow}>
        <TouchableOpacity style={[styles.langChip, language === "en" && styles.langChipActive]} onPress={() => setLanguage("en")}>
          <Text style={[styles.langChipText, language === "en" && styles.langChipTextActive]}>English</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.langChip, language === "ne" && styles.langChipActive]} onPress={() => setLanguage("ne")}>
          <Text style={[styles.langChipText, language === "ne" && styles.langChipTextActive]}>Nepali</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>Details (names, dates, key facts...)</Text>
      <TextInput
        style={styles.textArea}
        multiline
        numberOfLines={6}
        value={details}
        onChangeText={setDetails}
        placeholder="e.g. Client: Ram Sharma. Issue: Tenant hasn't paid rent for 2 months..."
        textAlignVertical="top"
      />

      <TouchableOpacity
        style={[styles.generateButton, (!details.trim() || generate.isPending) && styles.generateButtonDisabled]}
        onPress={() => generate.mutate()}
        disabled={!details.trim() || generate.isPending}
      >
        {generate.isPending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.generateButtonText}>Generate Draft</Text>}
      </TouchableOpacity>

      {generate.isError && (
        <Text style={styles.errorText}>
          {(generate.error as any)?.response?.data?.message || "Something went wrong. Please try again."}
        </Text>
      )}

      {generate.data?.content && (
        <View style={styles.resultBox}>
          <View style={styles.resultHeader}>
            <Text style={styles.resultTitle}>Generated Draft</Text>
            <TouchableOpacity onPress={handleCopy} style={styles.copyButton}>
              <Ionicons name={copied ? "checkmark" : "copy-outline"} size={16} color={colors.primary} />
              <Text style={styles.copyButtonText}>{copied ? "Copied!" : "Copy"}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.resultText}>{generate.data.content}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { padding: spacing.md, paddingBottom: 40 },
  subtitle: { fontSize: 13, color: "#6B7280", marginBottom: spacing.md },
  label: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: spacing.xs, marginTop: spacing.sm },
  dropdown: {
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
  modalItemText: { fontSize: 15, color: "#111827" },
  langRow: { flexDirection: "row", gap: 8, marginBottom: spacing.sm },
  langChip: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: radius.md, paddingHorizontal: 16, paddingVertical: 8 },
  langChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  langChipText: { fontSize: 13, color: "#374151" },
  langChipTextActive: { color: "#fff", fontWeight: "600" },
  textArea: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: radius.md, padding: spacing.sm, minHeight: 120, fontSize: 14 },
  generateButton: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 14, alignItems: "center", marginTop: spacing.md },
  generateButtonDisabled: { opacity: 0.5 },
  generateButtonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  errorText: { color: "#DC2626", marginTop: spacing.sm, fontSize: 13 },
  resultBox: { marginTop: spacing.lg, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: radius.md, padding: spacing.md },
  resultHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm },
  resultTitle: { fontWeight: "700", fontSize: 15 },
  copyButton: { flexDirection: "row", alignItems: "center", gap: 4 },
  copyButtonText: { color: colors.primary, fontSize: 13, fontWeight: "600" },
  resultText: { fontSize: 14, color: "#111827", lineHeight: 20 },
});

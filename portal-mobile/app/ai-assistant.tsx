import { useState, useRef } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, ActivityIndicator, KeyboardAvoidingView, Platform, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import { apiClient } from "../src/api/client";
import { colors, spacing, radius } from "../src/theme/theme";

interface Source {
  id: string;
  jurisdiction?: "NEPAL" | "UK";
  title: string;
  caseType?: string | null;
  decisionDate?: string | null;
  citation?: string | null;
  url?: string | null;
}

interface Message {
  role: "user" | "assistant";
  text: string;
  sources?: Source[];
  isError?: boolean;
}

export default function AiAssistantScreen() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const listRef = useRef<FlatList>(null);

  const ask = useMutation({
    mutationFn: async ({ q, history }: { q: string; history: { role: "user" | "assistant"; text: string }[] }) => {
      const { data } = await apiClient.post("/ai-assistant/ask", { question: q, history });
      return data.data as { answer: string; sources: Source[] };
    },
    onSuccess: (data) => {
      setMessages((prev) => [...prev, { role: "assistant", text: data.answer, sources: data.sources }]);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || "Something went wrong. Please try again.";
      setMessages((prev) => [...prev, { role: "assistant", text: msg, isError: true }]);
    },
  });

  const handleAsk = () => {
    const trimmed = question.trim();
    if (!trimmed || ask.isPending) return;
    const history = messages
      .filter((m) => !m.isError)
      .map((m) => ({ role: m.role, text: m.text }));
    setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
    ask.mutate({ q: trimmed, history });
    setQuestion("");
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
      {messages.length > 0 && (
        <View style={styles.topBar}>
          <Text style={styles.topBarTitle}>Nepal 🇳🇵 & UK 🇬🇧 Legal Agent</Text>
          <TouchableOpacity onPress={() => setMessages([])} style={styles.clearBtn}>
            <Ionicons name="trash-outline" size={14} color="#6B7280" />
            <Text style={styles.clearBtnText}>Clear</Text>
          </TouchableOpacity>
        </View>
      )}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            Ask any legal question or follow-up cross-question (e.g. "Property dispute मा नेपाल र UK को नजिरले के भन्छ?") — answers analyze both Nepali नजिर & UK Case Law with citations.
          </Text>
        }
        renderItem={({ item }) => (
          <View style={[styles.messageRow, item.role === "user" && styles.messageRowUser]}>
            <Ionicons name={item.role === "assistant" ? "sparkles" : "person-circle-outline"} size={20} color={item.role === "assistant" ? colors.primary : "#6B7280"} />
            <View style={styles.messageContent}>
              <Text style={[styles.messageText, item.isError && styles.errorText]}>{item.text}</Text>
              {item.sources && item.sources.length > 0 && (
                <View style={styles.sourcesSection}>
                  <Text style={styles.sourcesHeading}>References (Nepal & UK):</Text>
                  <View style={styles.sourcesRow}>
                    {item.sources.map((s: Source) => (
                      <TouchableOpacity
                        key={s.id}
                        disabled={!s.url}
                        onPress={() => s.url && Linking.openURL(s.url)}
                        style={[styles.sourceChip, s.jurisdiction === "UK" && styles.sourceChipUk]}
                      >
                        <Text style={styles.sourceChipText} numberOfLines={1}>{s.title}</Text>
                        {s.url && <Ionicons name="open-outline" size={12} color="#4B5563" />}
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </View>
          </View>
        )}
        ListFooterComponent={
          ask.isPending ? (
            <View style={styles.messageRow}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.thinkingText}>Searching Nepali नजिर & UK Case Law...</Text>
            </View>
          ) : null
        }
      />
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Ask a legal question or cross-question..."
          value={question}
          onChangeText={setQuestion}
          onSubmitEditing={handleAsk}
          editable={!ask.isPending}
          multiline
        />
        <TouchableOpacity style={styles.sendButton} onPress={handleAsk} disabled={!question.trim() || ask.isPending}>
          <Ionicons name="send" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: spacing.md, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#F3F4F6", backgroundColor: "#F9FAFB" },
  topBarTitle: { fontSize: 12, fontWeight: "700", color: "#374151" },
  clearBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4 },
  clearBtnText: { fontSize: 12, color: "#6B7280", fontWeight: "600" },
  list: { padding: spacing.md, flexGrow: 1 },
  emptyText: { color: "#6B7280", textAlign: "center", marginTop: 40, paddingHorizontal: spacing.lg, lineHeight: 20 },
  messageRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md, alignItems: "flex-start" },
  messageRowUser: {},
  messageContent: { flex: 1 },
  messageText: { fontSize: 14, color: "#111827", lineHeight: 21 },
  errorText: { color: "#DC2626" },
  thinkingText: { color: "#6B7280", fontSize: 13 },
  sourcesSection: { marginTop: 8 },
  sourcesHeading: { fontSize: 11, fontWeight: "700", color: "#6B7280", marginBottom: 4 },
  sourcesRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  sourceChip: { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderColor: "#D1D5DB", backgroundColor: "#F9FAFB", borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 4, maxWidth: 260 },
  sourceChipUk: { borderColor: "#93C5FD", backgroundColor: "#EFF6FF" },
  sourceChipText: { fontSize: 11, color: "#1F2937", flexShrink: 1 },
  inputRow: { flexDirection: "row", gap: spacing.sm, padding: spacing.md, borderTopWidth: 1, borderTopColor: "#E5E7EB", alignItems: "flex-end" },
  input: { flex: 1, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, maxHeight: 100 },
  sendButton: { backgroundColor: colors.primary, width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
});

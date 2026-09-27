import { useState, useRef, useEffect, useLayoutEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Linking,
} from "react-native";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { messagingApi, MessageItem } from "../../src/api/messaging.api";
import { resolveMediaUrl } from "../../src/api/client";
import { useAuthStore } from "../../src/store/authStore";

const POLL_INTERVAL_MS = 4000;
const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024;
const PRIMARY = "#2563EB";

interface PendingFile {
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
}

export default function ConversationThreadScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const navigation = useNavigation();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const queryClient = useQueryClient();
  const listRef = useRef<FlatList>(null);

  const insets = useSafeAreaInsets();
  const [text, setText] = useState("");
  const [pendingFile, setPendingFile] = useState<PendingFile | null>(null);
  const [sending, setSending] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ title: name || "Conversation" });
  }, [navigation, name]);

  const { data, isLoading } = useQuery({
    queryKey: ["messages", id],
    queryFn: () => messagingApi.listMessages(id as string),
    refetchInterval: POLL_INTERVAL_MS,
    enabled: !!id,
  });

  const messages: MessageItem[] = data?.items ?? [];
  let lastMineIndex = -1;
  messages.forEach((m, i) => {
    if (m.senderId === currentUserId) lastMineIndex = i;
  });

  const deleteMessage = useMutation({
    mutationFn: (messageId: string) => messagingApi.deleteMessage(messageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", id] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: () => Alert.alert("Error", "Could not delete this message."),
  });

  const confirmDelete = (messageId: string) => {
    Alert.alert("Delete message?", "This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteMessage.mutate(messageId) },
    ]);
  };

  useEffect(() => {
    if (messages.length) setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages.length]);

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Please allow photo library access to attach a photo.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    if (asset.fileSize && asset.fileSize > MAX_ATTACHMENT_BYTES) {
      Alert.alert("File too large", "Maximum attachment size is 8MB.");
      return;
    }
    const fileName = asset.uri.split("/").pop() || "photo.jpg";
    const ext = fileName.split(".").pop()?.toLowerCase();
    const mimeType = asset.mimeType || (ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg");
    setPendingFile({ uri: asset.uri, name: fileName, mimeType, size: asset.fileSize });
  };

  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: ["image/*", "application/pdf"] });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    if (asset.size && asset.size > MAX_ATTACHMENT_BYTES) {
      Alert.alert("File too large", "Maximum attachment size is 8MB.");
      return;
    }
    setPendingFile({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType || "application/pdf", size: asset.size });
  };

  const handleAttach = () => {
    Alert.alert("Attach", "What would you like to attach?", [
      { text: "Photo", onPress: pickImage },
      { text: "Document (PDF)", onPress: pickDocument },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleSend = async () => {
    if ((!text.trim() && !pendingFile) || sending || !id) return;
    const content = text;
    const file = pendingFile;
    setText("");
    setPendingFile(null);
    setSending(true);
    try {
      let attachmentUrl: string | undefined;
      let attachmentType: string | undefined;
      if (file) {
        const uploaded = await messagingApi.uploadAttachment(file.uri, file.mimeType, file.name);
        attachmentUrl = uploaded.attachmentUrl;
        attachmentType = uploaded.attachmentType;
      }
      await messagingApi.sendMessage(id as string, content, attachmentUrl, attachmentType);
      queryClient.invalidateQueries({ queryKey: ["messages", id] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message || "Message failed to send.");
      setText(content);
      setPendingFile(file);
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
      {isLoading && messages.length === 0 ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={PRIMARY} />
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.emptyText}>Say hello 👋</Text>}
          renderItem={({ item, index }) => {
            const isMine = item.senderId === currentUserId;
            const isImage = !!item.attachmentType?.startsWith("image/");
            const attachmentFullUrl = item.attachmentUrl ? resolveMediaUrl(`/uploads/${item.attachmentUrl}`) : null;
            return (
              <View style={[styles.messageRow, isMine && styles.messageRowMine]}>
                <TouchableOpacity
                  activeOpacity={isMine ? 0.7 : 1}
                  onLongPress={isMine ? () => confirmDelete(item.id) : undefined}
                  style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}
                >
                  {attachmentFullUrl && isImage && (
                    <TouchableOpacity onPress={() => Linking.openURL(attachmentFullUrl)}>
                      <Image source={{ uri: attachmentFullUrl }} style={styles.attachmentImage} />
                    </TouchableOpacity>
                  )}
                  {attachmentFullUrl && !isImage && (
                    <TouchableOpacity style={styles.fileChip} onPress={() => Linking.openURL(attachmentFullUrl)}>
                      <Ionicons name="document-attach-outline" size={16} color={isMine ? "#fff" : PRIMARY} />
                      <Text style={[styles.fileChipText, isMine && { color: "#fff" }]}>File attachment</Text>
                    </TouchableOpacity>
                  )}
                  {!!item.content && <Text style={[styles.messageText, isMine && styles.messageTextMine]}>{item.content}</Text>}
                </TouchableOpacity>
                {isMine && index === lastMineIndex && (
                  <Text style={styles.statusText}>{item.isRead ? "Seen" : "Delivered"}</Text>
                )}
              </View>
            );
          }}
        />
      )}

      {pendingFile && (
        <View style={styles.pendingRow}>
          <Ionicons name={pendingFile.mimeType.startsWith("image/") ? "image-outline" : "document-outline"} size={16} color="#6B7280" />
          <Text style={styles.pendingName} numberOfLines={1}>
            {pendingFile.name}
          </Text>
          <TouchableOpacity onPress={() => setPendingFile(null)}>
            <Ionicons name="close-circle" size={18} color="#6B7280" />
          </TouchableOpacity>
        </View>
      )}

      <View style={[styles.inputRow, { paddingBottom: 12 + insets.bottom }]}>
        <TouchableOpacity onPress={handleAttach} style={styles.attachButton} disabled={sending}>
          <Ionicons name="attach" size={22} color={PRIMARY} />
        </TouchableOpacity>
        <TextInput style={styles.input} placeholder="Message..." value={text} onChangeText={setText} multiline editable={!sending} />
        <TouchableOpacity style={styles.sendButton} onPress={handleSend} disabled={(!text.trim() && !pendingFile) || sending}>
          {sending ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={18} color="#fff" />}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  list: { padding: 16, flexGrow: 1 },
  emptyText: { color: "#6B7280", textAlign: "center", marginTop: 40 },
  messageRow: { marginBottom: 8, alignItems: "flex-start" },
  messageRowMine: { alignItems: "flex-end" },
  statusText: { fontSize: 10, color: "#6B7280", marginTop: 2, marginRight: 2 },
  bubble: { maxWidth: "80%", borderRadius: 12, padding: 10 },
  bubbleMine: { backgroundColor: PRIMARY, borderBottomRightRadius: 2 },
  bubbleTheirs: { backgroundColor: "#F1F5F9", borderBottomLeftRadius: 2 },
  messageText: { fontSize: 14, color: "#111827", lineHeight: 20 },
  messageTextMine: { color: "#fff" },
  attachmentImage: { width: 200, height: 150, borderRadius: 8, marginBottom: 6 },
  fileChip: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(0,0,0,0.06)", paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8, marginBottom: 6 },
  fileChipText: { fontSize: 12, color: PRIMARY, fontWeight: "600" },
  pendingRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingTop: 8 },
  pendingName: { flex: 1, fontSize: 12, color: "#6B7280" },
  inputRow: { flexDirection: "row", gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: "#E5E7EB", alignItems: "flex-end" },
  attachButton: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  input: { flex: 1, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, maxHeight: 100 },
  sendButton: { backgroundColor: PRIMARY, width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
});

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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ticketApi, TicketStatus, TicketCommentItem } from "../../src/api/ticket.api";
import { colors, spacing, radius } from "../../src/theme/theme";
import { attachmentUrlFor } from "../../src/utils/staticUrl";

const POLL_INTERVAL_MS = 8000;
const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024;

const STATUS_COLOR: Record<TicketStatus, string> = {
  OPEN: colors.warning,
  IN_PROGRESS: colors.info,
  RESOLVED: colors.success,
  CLOSED: colors.textSecondary,
};

interface PendingFile {
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
}

function AttachmentPreview({ url, type }: { url: string; type?: string | null }) {
  const isImage = type?.startsWith("image/");
  return isImage ? (
    <TouchableOpacity onPress={() => Linking.openURL(attachmentUrlFor(url))}>
      <Image source={{ uri: attachmentUrlFor(url) }} style={styles.attachmentImage} />
    </TouchableOpacity>
  ) : (
    <TouchableOpacity style={styles.fileChip} onPress={() => Linking.openURL(attachmentUrlFor(url))}>
      <Ionicons name="document-attach-outline" size={16} color={colors.primary} />
      <Text style={styles.fileChipText}>File attachment</Text>
    </TouchableOpacity>
  );
}

export default function TicketDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const listRef = useRef<FlatList>(null);
  const insets = useSafeAreaInsets();

  const [replyText, setReplyText] = useState("");
  const [pendingFile, setPendingFile] = useState<PendingFile | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data: ticket, isLoading } = useQuery({
    queryKey: ["ticket", id],
    queryFn: () => ticketApi.getById(id as string),
    refetchInterval: POLL_INTERVAL_MS,
    enabled: !!id,
  });

  useLayoutEffect(() => {
    navigation.setOptions({ title: ticket?.subject || "Ticket" });
  }, [navigation, ticket?.subject]);

  useEffect(() => {
    if (ticket?.comments?.length) setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, [ticket?.comments?.length]);

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Please allow photo library access to attach a screenshot.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    if (asset.fileSize && asset.fileSize > MAX_ATTACHMENT_BYTES) {
      Alert.alert("File too large", "Maximum attachment size is 8MB.");
      return;
    }
    const fileName = asset.uri.split("/").pop() || "screenshot.jpg";
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
      { text: "Photo / Screenshot", onPress: pickImage },
      { text: "Document (PDF)", onPress: pickDocument },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleReply = async () => {
    if ((!replyText.trim() && !pendingFile) || submitting || !id) return;
    const text = replyText;
    const file = pendingFile;
    setReplyText("");
    setPendingFile(null);
    setSubmitting(true);
    try {
      let attachmentUrl: string | undefined;
      let attachmentType: string | undefined;
      if (file) {
        const uploaded = await ticketApi.uploadAttachment(file.uri, file.mimeType, file.name);
        attachmentUrl = uploaded.attachmentUrl;
        attachmentType = uploaded.attachmentType;
      }
      await ticketApi.addComment(id as string, text, attachmentUrl, attachmentType);
      queryClient.invalidateQueries({ queryKey: ["ticket", id] });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message || "Reply failed to send.");
      setReplyText(text);
      setPendingFile(file);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    Alert.alert("Close Ticket", "Are you sure you want to close this ticket?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Close Ticket",
        style: "destructive",
        onPress: async () => {
          try {
            await ticketApi.updateStatus(id as string, "CLOSED");
            queryClient.invalidateQueries({ queryKey: ["ticket", id] });
            queryClient.invalidateQueries({ queryKey: ["tickets"] });
          } catch (err: any) {
            Alert.alert("Error", err?.response?.data?.message || "Could not close ticket.");
          }
        },
      },
    ]);
  };

  if (isLoading || !ticket) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
      <View style={styles.headerRow}>
        <View style={[styles.statusBadge, { backgroundColor: `${STATUS_COLOR[ticket.status]}22` }]}>
          <Text style={[styles.statusText, { color: STATUS_COLOR[ticket.status] }]}>{ticket.status.replace("_", " ")}</Text>
        </View>
        {ticket.status !== "CLOSED" && (
          <TouchableOpacity onPress={handleClose}>
            <Text style={styles.closeLink}>Close Ticket</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        ref={listRef}
        data={ticket.comments}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.descriptionBlock}>
            <Text style={styles.authorLabel}>{ticket.createdBy.fullName} (opened this ticket)</Text>
            {ticket.attachmentUrl && <AttachmentPreview url={ticket.attachmentUrl} type={ticket.attachmentType} />}
            {!!ticket.description && (
              <View style={styles.descriptionBubble}>
                <Text style={styles.messageText}>{ticket.description}</Text>
              </View>
            )}
          </View>
        }
        renderItem={({ item }: { item: TicketCommentItem }) => (
          <View style={styles.commentBlock}>
            <Text style={styles.authorLabel}>{item.author.accountType === "COMPANY" ? "TechnoOne Support" : item.author.fullName}</Text>
            {item.attachmentUrl && <AttachmentPreview url={item.attachmentUrl} type={item.attachmentType} />}
            {!!item.content && (
              <View style={[styles.bubble, item.author.accountType === "COMPANY" ? styles.bubbleSupport : styles.bubbleMine]}>
                <Text style={[styles.messageText, item.author.accountType === "COMPANY" && styles.messageTextSupport]}>{item.content}</Text>
              </View>
            )}
          </View>
        )}
      />

      {ticket.status !== "CLOSED" ? (
        <>
          {pendingFile && (
            <View style={styles.pendingRow}>
              <Ionicons name={pendingFile.mimeType.startsWith("image/") ? "image-outline" : "document-outline"} size={16} color={colors.textSecondary} />
              <Text style={styles.pendingName} numberOfLines={1}>{pendingFile.name}</Text>
              <TouchableOpacity onPress={() => setPendingFile(null)}>
                <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          )}
          <View style={[styles.inputRow, { paddingBottom: spacing.md + insets.bottom }]}>
            <TouchableOpacity onPress={handleAttach} style={styles.attachButton} disabled={submitting}>
              <Ionicons name="attach" size={22} color={colors.primary} />
            </TouchableOpacity>
            <TextInput style={styles.input} placeholder="Reply..." value={replyText} onChangeText={setReplyText} multiline editable={!submitting} />
            <TouchableOpacity style={styles.sendButton} onPress={handleReply} disabled={(!replyText.trim() && !pendingFile) || submitting}>
              {submitting ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={18} color="#fff" />}
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <View style={[styles.closedBanner, { paddingBottom: spacing.md + insets.bottom }]}>
          <Text style={styles.closedBannerText}>This ticket is closed.</Text>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#fff" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusText: { fontSize: 11, fontWeight: "700" },
  closeLink: { fontSize: 13, fontWeight: "700", color: colors.error },
  list: { padding: spacing.md, flexGrow: 1 },
  descriptionBlock: { marginBottom: spacing.md },
  commentBlock: { marginBottom: spacing.md },
  authorLabel: { fontSize: 11, color: colors.textSecondary, marginBottom: 4 },
  descriptionBubble: { backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.sm, alignSelf: "flex-start", maxWidth: "90%" },
  bubble: { borderRadius: radius.md, padding: spacing.sm, alignSelf: "flex-start", maxWidth: "90%" },
  bubbleMine: { backgroundColor: colors.primary },
  bubbleSupport: { backgroundColor: "#F3F4F6" },
  messageText: { fontSize: 14, color: colors.textPrimary, lineHeight: 20 },
  messageTextSupport: { color: colors.textPrimary },
  attachmentImage: { width: 200, height: 150, borderRadius: radius.sm, marginBottom: 6 },
  fileChip: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(0,0,0,0.06)", paddingHorizontal: 8, paddingVertical: 6, borderRadius: radius.sm, marginBottom: 6, alignSelf: "flex-start" },
  fileChipText: { fontSize: 12, color: colors.primary, fontWeight: "600" },
  pendingRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  pendingName: { flex: 1, fontSize: 12, color: colors.textSecondary },
  inputRow: { flexDirection: "row", gap: spacing.sm, padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, alignItems: "flex-end" },
  attachButton: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  input: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, maxHeight: 100 },
  sendButton: { backgroundColor: colors.primary, width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  closedBanner: { padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, alignItems: "center" },
  closedBannerText: { color: colors.textSecondary, fontSize: 13, fontStyle: "italic" },
});

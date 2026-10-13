import sys

# Run this from EACH mobile app's root directory (portal-mobile, client-mobile,
# student-mobile) -- the file is identical in all three.

path = 'app/messages/[id].tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Imports.
old1 = '''import { useLocalSearchParams, useNavigation } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { messagingApi, MessageItem } from "../../src/api/messaging.api";'''

new1 = '''import { useLocalSearchParams, useNavigation } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { messagingApi, MessageItem } from "../../src/api/messaging.api";'''

c1 = content.count(old1)
print(f'imports anchor count = {c1}')
if c1 != 1:
    print('ERROR: aborting (imports).')
    sys.exit(1)
content = content.replace(old1, new1)

# 2. Add insets + deleteMessage mutation.
old2 = '''  const [text, setText] = useState("");
  const [pendingFile, setPendingFile] = useState<PendingFile | null>(null);
  const [sending, setSending] = useState(false);'''

new2 = '''  const insets = useSafeAreaInsets();
  const [text, setText] = useState("");
  const [pendingFile, setPendingFile] = useState<PendingFile | null>(null);
  const [sending, setSending] = useState(false);'''

c2 = content.count(old2)
print(f'insets anchor count = {c2}')
if c2 != 1:
    print('ERROR: aborting (insets).')
    sys.exit(1)
content = content.replace(old2, new2)

old3 = '''  const messages: MessageItem[] = data?.items ?? [];'''

new3 = '''  const messages: MessageItem[] = data?.items ?? [];
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
  };'''

c3 = content.count(old3)
print(f'lastMine anchor count = {c3}')
if c3 != 1:
    print('ERROR: aborting (lastMine).')
    sys.exit(1)
content = content.replace(old3, new3)

# 3. renderItem: wrap bubble in a long-pressable TouchableOpacity (own messages only) + Seen/Delivered caption.
old4 = '''          renderItem={({ item }) => {
            const isMine = item.senderId === currentUserId;
            const isImage = !!item.attachmentType?.startsWith("image/");
            return (
              <View style={[styles.messageRow, isMine && styles.messageRowMine]}>
                <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
                  {item.attachmentUrl && isImage && (
                    <TouchableOpacity onPress={() => Linking.openURL(attachmentUrlFor(item.attachmentUrl!))}>
                      <Image source={{ uri: attachmentUrlFor(item.attachmentUrl) }} style={styles.attachmentImage} />
                    </TouchableOpacity>
                  )}
                  {item.attachmentUrl && !isImage && (
                    <TouchableOpacity style={styles.fileChip} onPress={() => Linking.openURL(attachmentUrlFor(item.attachmentUrl!))}>
                      <Ionicons name="document-attach-outline" size={16} color={isMine ? "#fff" : colors.primary} />
                      <Text style={[styles.fileChipText, isMine && { color: "#fff" }]}>File attachment</Text>
                    </TouchableOpacity>
                  )}
                  {!!item.content && <Text style={[styles.messageText, isMine && styles.messageTextMine]}>{item.content}</Text>}
                </View>
              </View>
            );
          }}'''

new4 = '''          renderItem={({ item, index }) => {
            const isMine = item.senderId === currentUserId;
            const isImage = !!item.attachmentType?.startsWith("image/");
            return (
              <View style={[styles.messageRow, isMine && styles.messageRowMine]}>
                <TouchableOpacity
                  activeOpacity={isMine ? 0.7 : 1}
                  onLongPress={isMine ? () => confirmDelete(item.id) : undefined}
                  style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}
                >
                  {item.attachmentUrl && isImage && (
                    <TouchableOpacity onPress={() => Linking.openURL(attachmentUrlFor(item.attachmentUrl!))}>
                      <Image source={{ uri: attachmentUrlFor(item.attachmentUrl) }} style={styles.attachmentImage} />
                    </TouchableOpacity>
                  )}
                  {item.attachmentUrl && !isImage && (
                    <TouchableOpacity style={styles.fileChip} onPress={() => Linking.openURL(attachmentUrlFor(item.attachmentUrl!))}>
                      <Ionicons name="document-attach-outline" size={16} color={isMine ? "#fff" : colors.primary} />
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
          }}'''

c4 = content.count(old4)
print(f'renderItem anchor count = {c4}')
if c4 != 1:
    print('ERROR: aborting (renderItem).')
    sys.exit(1)
content = content.replace(old4, new4)

# 4. Safe-area bottom padding on the input row.
old5 = '''      <View style={styles.inputRow}>
        <TouchableOpacity onPress={handleAttach} style={styles.attachButton} disabled={sending}>'''

new5 = '''      <View style={[styles.inputRow, { paddingBottom: spacing.sm + insets.bottom }]}>
        <TouchableOpacity onPress={handleAttach} style={styles.attachButton} disabled={sending}>'''

c5 = content.count(old5)
print(f'input-row anchor count = {c5}')
if c5 != 1:
    print('ERROR: aborting (input row).')
    sys.exit(1)
content = content.replace(old5, new5)

# 5. New style for the Seen/Delivered caption.
old6 = '''  messageRow: { marginBottom: spacing.sm, alignItems: "flex-start" },
  messageRowMine: { alignItems: "flex-end" },'''

new6 = '''  messageRow: { marginBottom: spacing.sm, alignItems: "flex-start" },
  messageRowMine: { alignItems: "flex-end" },
  statusText: { fontSize: 10, color: colors.textSecondary, marginTop: 2, marginRight: 2 },'''

c6 = content.count(old6)
print(f'styles anchor count = {c6}')
if c6 != 1:
    print('ERROR: aborting (styles).')
    sys.exit(1)
content = content.replace(old6, new6)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Patched app/messages/[id].tsx')

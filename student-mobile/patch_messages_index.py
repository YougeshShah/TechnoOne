import sys

# Run this from EACH mobile app's root directory (portal-mobile, client-mobile,
# student-mobile) -- the file is identical in all three.

path = 'app/messages/index.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Imports.
old1 = '''import { useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, ActivityIndicator, Image } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { messagingApi } from "../../src/api/messaging.api";'''

new1 = '''import { useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, ActivityIndicator, Image } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { messagingApi, ConversationSummary } from "../../src/api/messaging.api";'''

c1 = content.count(old1)
print(f'imports anchor count = {c1}')
if c1 != 1:
    print('ERROR: aborting (imports).')
    sys.exit(1)
content = content.replace(old1, new1)

# 2. State: insets + popup contact.
old2 = '''export default function MessagesScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [contactsVisible, setContactsVisible] = useState(false);'''

new2 = '''export default function MessagesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [contactsVisible, setContactsVisible] = useState(false);
  const [popupConversation, setPopupConversation] = useState<ConversationSummary | null>(null);'''

c2 = content.count(old2)
print(f'state anchor count = {c2}')
if c2 != 1:
    print('ERROR: aborting (state).')
    sys.exit(1)
content = content.replace(old2, new2)

# 3. Avatar in the conversation row: tapping it opens a small popup instead of the chat.
old3 = '''          <TouchableOpacity onPress={() => router.push({ pathname: "/messages/[id]", params: { id: item.id, name: item.otherUser.fullName } })}>
            <Card style={styles.conversationCard}>
              {item.otherUser.avatarUrl ? (
                <Image source={{ uri: attachmentUrlFor(item.otherUser.avatarUrl) }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person" size={20} color="#fff" />
                </View>
              )}
              <View style={{ flex: 1, marginLeft: spacing.sm }}>'''

new3 = '''          <TouchableOpacity onPress={() => router.push({ pathname: "/messages/[id]", params: { id: item.id, name: item.otherUser.fullName } })}>
            <Card style={styles.conversationCard}>
              <TouchableOpacity onPress={() => setPopupConversation(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                {item.otherUser.avatarUrl ? (
                  <Image source={{ uri: attachmentUrlFor(item.otherUser.avatarUrl) }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Ionicons name="person" size={20} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
              <View style={{ flex: 1, marginLeft: spacing.sm }}>'''

c3 = content.count(old3)
print(f'avatar-row anchor count = {c3}')
if c3 != 1:
    print('ERROR: aborting (avatar row).')
    sys.exit(1)
content = content.replace(old3, new3)

# 4. FAB safe-area bottom padding.
old4 = '''      <TouchableOpacity style={styles.fab} onPress={() => setContactsVisible(true)}>'''
new4 = '''      <TouchableOpacity style={[styles.fab, { bottom: spacing.lg + insets.bottom }]} onPress={() => setContactsVisible(true)}>'''

c4 = content.count(old4)
print(f'fab anchor count = {c4}')
if c4 != 1:
    print('ERROR: aborting (fab).')
    sys.exit(1)
content = content.replace(old4, new4)

# 5. Contact-info popup modal, added right after the "New Message" Modal closes.
old5 = '''          )}
        </View>
      </Modal>
    </View>
  );
}'''

new5 = '''          )}
        </View>
      </Modal>

      <Modal visible={!!popupConversation} transparent animationType="fade" onRequestClose={() => setPopupConversation(null)}>
        <TouchableOpacity style={styles.popupOverlay} activeOpacity={1} onPress={() => setPopupConversation(null)}>
          <View style={styles.popupCard}>
            {popupConversation?.otherUser.avatarUrl ? (
              <Image source={{ uri: attachmentUrlFor(popupConversation.otherUser.avatarUrl) }} style={styles.popupAvatar} />
            ) : (
              <View style={[styles.avatarPlaceholder, styles.popupAvatar]}>
                <Ionicons name="person" size={28} color="#fff" />
              </View>
            )}
            <Text style={styles.popupName}>{popupConversation?.otherUser.fullName}</Text>
            <Text style={styles.popupRole}>{popupConversation?.otherUser.accountType.replace("_", " ")}</Text>
            <TouchableOpacity
              style={styles.popupOpenButton}
              onPress={() => {
                if (!popupConversation) return;
                const conv = popupConversation;
                setPopupConversation(null);
                router.push({ pathname: "/messages/[id]", params: { id: conv.id, name: conv.otherUser.fullName } });
              }}
            >
              <Text style={styles.popupOpenButtonText}>Open Chat</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}'''

c5 = content.count(old5)
print(f'popup-modal anchor count = {c5}')
if c5 != 1:
    print('ERROR: aborting (popup modal).')
    sys.exit(1)
content = content.replace(old5, new5)

# 6. Styles for the popup.
old6 = '''  modalContainer: { flex: 1, backgroundColor: colors.background, paddingTop: 56 },'''

new6 = '''  popupOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center" },
  popupCard: { backgroundColor: "#fff", borderRadius: radius.lg, padding: spacing.lg, alignItems: "center", width: 240 },
  popupAvatar: { width: 64, height: 64, borderRadius: 32, marginBottom: spacing.sm },
  popupName: { fontSize: 16, fontWeight: "700", color: colors.textPrimary },
  popupRole: { fontSize: 12, color: colors.textSecondary, marginTop: 2, marginBottom: spacing.md },
  popupOpenButton: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 10, paddingHorizontal: 24 },
  popupOpenButtonText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  modalContainer: { flex: 1, backgroundColor: colors.background, paddingTop: 56 },'''

c6 = content.count(old6)
print(f'styles anchor count = {c6}')
if c6 != 1:
    print('ERROR: aborting (styles).')
    sys.exit(1)
content = content.replace(old6, new6)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Patched app/messages/index.tsx')

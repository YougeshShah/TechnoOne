import { useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, ActivityIndicator, Image } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { messagingApi, ConversationSummary } from "../../src/api/messaging.api";
import { resolveMediaUrl } from "../../src/api/client";

const POLL_INTERVAL_MS = 5000;
const PRIMARY = "#2563EB";

function formatWhen(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : d.toLocaleDateString();
}

export default function MessagesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [contactsVisible, setContactsVisible] = useState(false);
  const [popupConversation, setPopupConversation] = useState<ConversationSummary | null>(null);

  const { data: conversations, isLoading } = useQuery({
    queryKey: ["conversations"],
    queryFn: () => messagingApi.listConversations(),
    refetchInterval: POLL_INTERVAL_MS,
  });

  const { data: contacts, isLoading: contactsLoading } = useQuery({
    queryKey: ["messaging-contacts"],
    queryFn: () => messagingApi.listContacts(),
    enabled: contactsVisible,
  });

  const startConversation = useMutation({
    mutationFn: (targetUserId: string) => messagingApi.startConversation(targetUserId),
    onSuccess: (conv, targetUserId) => {
      setContactsVisible(false);
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      const contact = contacts?.find((c) => c.id === targetUserId);
      router.push({ pathname: "/messages/[id]", params: { id: conv.id, name: contact?.fullName ?? "" } });
    },
  });

  return (
    <View style={styles.container}>
      <FlatList
        data={conversations ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, flexGrow: 1 }}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => router.push({ pathname: "/messages/[id]", params: { id: item.id, name: item.otherUser.fullName } })}>
            <View style={styles.conversationCard}>
              <TouchableOpacity onPress={() => setPopupConversation(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                {item.otherUser.avatarUrl ? (
                  <Image source={{ uri: resolveMediaUrl(`/uploads/${item.otherUser.avatarUrl}`) ?? undefined }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Ionicons name="person" size={20} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <View style={styles.rowBetween}>
                  <Text style={styles.name} numberOfLines={1}>{item.otherUser.fullName}</Text>
                  <Text style={styles.time}>{formatWhen(item.lastMessageAt)}</Text>
                </View>
                <View style={styles.rowBetween}>
                  <Text style={styles.preview} numberOfLines={1}>{item.lastMessageText ?? "No messages yet"}</Text>
                  {item.unreadCount > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{item.unreadCount > 9 ? "9+" : item.unreadCount}</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          !isLoading ? (
            <Text style={styles.emptyText}>No conversations yet. Tap the button below to message your teacher.</Text>
          ) : (
            <ActivityIndicator style={{ marginTop: 40 }} color={PRIMARY} />
          )
        }
      />

      <TouchableOpacity style={[styles.fab, { bottom: 24 + insets.bottom }]} onPress={() => setContactsVisible(true)}>
        <Ionicons name="create-outline" size={26} color="#fff" />
      </TouchableOpacity>

      <Modal visible={contactsVisible} animationType="slide" onRequestClose={() => setContactsVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Message</Text>
            <TouchableOpacity onPress={() => setContactsVisible(false)}>
              <Ionicons name="close" size={24} color="#111827" />
            </TouchableOpacity>
          </View>
          {contactsLoading ? (
            <ActivityIndicator style={{ marginTop: 40 }} color={PRIMARY} />
          ) : (
            <FlatList
              data={contacts ?? []}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 16 }}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.contactRow} disabled={startConversation.isPending} onPress={() => startConversation.mutate(item.id)}>
                  {item.avatarUrl ? (
                    <Image source={{ uri: resolveMediaUrl(`/uploads/${item.avatarUrl}`) ?? undefined }} style={styles.avatar} />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Ionicons name="person" size={20} color="#fff" />
                    </View>
                  )}
                  <View style={{ marginLeft: 10 }}>
                    <Text style={styles.name}>{item.fullName}</Text>
                    <Text style={styles.contactRole}>{item.accountType.replace("_", " ")}</Text>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={styles.emptyText}>No teachers available to message yet.</Text>}
            />
          )}
        </View>
      </Modal>

      <Modal visible={!!popupConversation} transparent animationType="fade" onRequestClose={() => setPopupConversation(null)}>
        <TouchableOpacity style={styles.popupOverlay} activeOpacity={1} onPress={() => setPopupConversation(null)}>
          <View style={styles.popupCard}>
            {popupConversation?.otherUser.avatarUrl ? (
              <Image source={{ uri: resolveMediaUrl(`/uploads/${popupConversation.otherUser.avatarUrl}`) ?? undefined }} style={styles.popupAvatar} />
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
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F6F8" },
  conversationCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#E5E7EB" },
  avatarPlaceholder: { width: 44, height: 44, borderRadius: 22, backgroundColor: PRIMARY, alignItems: "center", justifyContent: "center" },
  name: { fontSize: 15, fontWeight: "700", color: "#111827", flexShrink: 1 },
  time: { fontSize: 11, color: "#6B7280" },
  preview: { fontSize: 13, color: "#6B7280", flex: 1, marginRight: 8 },
  badge: { backgroundColor: PRIMARY, borderRadius: 10, minWidth: 20, height: 20, alignItems: "center", justifyContent: "center", paddingHorizontal: 5 },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  emptyText: { textAlign: "center", color: "#6B7280", marginTop: 32, paddingHorizontal: 24 },
  fab: {
    position: "absolute",
    right: 16,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  modalContainer: { flex: 1, backgroundColor: "#F4F6F8", paddingTop: 56 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#111827" },
  contactRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  contactRole: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  popupOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center" },
  popupCard: { backgroundColor: "#fff", borderRadius: 16, padding: 20, alignItems: "center", width: 240 },
  popupAvatar: { width: 64, height: 64, borderRadius: 32, marginBottom: 10 },
  popupName: { fontSize: 16, fontWeight: "700", color: "#111827" },
  popupRole: { fontSize: 12, color: "#6B7280", marginTop: 2, marginBottom: 16 },
  popupOpenButton: { backgroundColor: PRIMARY, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 24 },
  popupOpenButtonText: { color: "#fff", fontWeight: "700", fontSize: 13 },
});

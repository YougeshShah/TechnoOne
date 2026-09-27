import { useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, ActivityIndicator, Image } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { messagingApi, ConversationSummary } from "../../src/api/messaging.api";
import { Card } from "../../src/components/Card";
import { colors, spacing, radius } from "../../src/theme/theme";
import { attachmentUrlFor } from "../../src/utils/staticUrl";

const POLL_INTERVAL_MS = 5000;

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
        contentContainerStyle={{ padding: spacing.md, flexGrow: 1 }}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => router.push({ pathname: "/messages/[id]", params: { id: item.id, name: item.otherUser.fullName } })}>
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
              <View style={{ flex: 1, marginLeft: spacing.sm }}>
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
            </Card>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          !isLoading ? (
            <Text style={styles.emptyText}>No conversations yet. Tap the button below to message someone.</Text>
          ) : (
            <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
          )
        }
      />

      <TouchableOpacity style={[styles.fab, { bottom: spacing.lg + insets.bottom }]} onPress={() => setContactsVisible(true)}>
        <Ionicons name="create-outline" size={26} color="#fff" />
      </TouchableOpacity>

      <Modal visible={contactsVisible} animationType="slide" onRequestClose={() => setContactsVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Message</Text>
            <TouchableOpacity onPress={() => setContactsVisible(false)}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
          {contactsLoading ? (
            <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
          ) : (
            <FlatList
              data={contacts ?? []}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: spacing.md }}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.contactRow} disabled={startConversation.isPending} onPress={() => startConversation.mutate(item.id)}>
                  {item.avatarUrl ? (
                    <Image source={{ uri: attachmentUrlFor(item.avatarUrl) }} style={styles.avatar} />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Ionicons name="person" size={20} color="#fff" />
                    </View>
                  )}
                  <View style={{ marginLeft: spacing.sm }}>
                    <Text style={styles.name}>{item.fullName}</Text>
                    <Text style={styles.contactRole}>{item.accountType.replace("_", " ")}</Text>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={styles.emptyText}>No one available to message yet.</Text>}
            />
          )}
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
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  conversationCard: { flexDirection: "row", alignItems: "center", marginBottom: spacing.sm },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#E5E7EB" },
  avatarPlaceholder: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  name: { fontSize: 15, fontWeight: "700", color: colors.textPrimary, flexShrink: 1 },
  time: { fontSize: 11, color: colors.textSecondary },
  preview: { fontSize: 13, color: colors.textSecondary, flex: 1, marginRight: spacing.sm },
  badge: { backgroundColor: colors.primary, borderRadius: 10, minWidth: 20, height: 20, alignItems: "center", justifyContent: "center", paddingHorizontal: 5 },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  emptyText: { textAlign: "center", color: colors.textSecondary, marginTop: spacing.xl, paddingHorizontal: spacing.lg },
  fab: {
    position: "absolute",
    right: spacing.md,
    bottom: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  popupOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center" },
  popupCard: { backgroundColor: "#fff", borderRadius: radius.lg, padding: spacing.lg, alignItems: "center", width: 240 },
  popupAvatar: { width: 64, height: 64, borderRadius: 32, marginBottom: spacing.sm },
  popupName: { fontSize: 16, fontWeight: "700", color: colors.textPrimary },
  popupRole: { fontSize: 12, color: colors.textSecondary, marginTop: 2, marginBottom: spacing.md },
  popupOpenButton: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 10, paddingHorizontal: 24 },
  popupOpenButtonText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  modalContainer: { flex: 1, backgroundColor: colors.background, paddingTop: 56 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: spacing.md, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { fontSize: 18, fontWeight: "800", color: colors.textPrimary },
  contactRow: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  contactRole: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
});

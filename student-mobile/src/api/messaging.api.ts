import { apiClient } from "./client";

export interface MessagingContact {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  accountType: string;
}

export interface ConversationSummary {
  id: string;
  otherUser: MessagingContact;
  lastMessageText: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
}

export interface MessageItem {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  attachmentUrl?: string | null;
  attachmentType?: string | null;
  isRead: boolean;
  createdAt: string;
}

// Real-time-feeling (polling-based) user-to-user messaging: Teacher/Institution
// staff <-> Student. This replaces the AI chatbot widget in the app's UI --
// the chatbot screen/backend/ChatWidget component are left in place but are
// no longer linked or rendered from anywhere in the UI.
export const messagingApi = {
  async listContacts(): Promise<MessagingContact[]> {
    const { data } = await apiClient.get("/messaging/contacts");
    return data.data;
  },

  async listConversations(): Promise<ConversationSummary[]> {
    const { data } = await apiClient.get("/messaging/conversations");
    return data.data;
  },

  async startConversation(targetUserId: string): Promise<{ id: string }> {
    const { data } = await apiClient.post("/messaging/conversations", { targetUserId });
    return data.data;
  },

  async listMessages(conversationId: string): Promise<{ items: MessageItem[] }> {
    const { data } = await apiClient.get(`/messaging/conversations/${conversationId}/messages`, {
      params: { limit: 50 },
    });
    return data.data;
  },

  async sendMessage(
    conversationId: string,
    content: string,
    attachmentUrl?: string,
    attachmentType?: string
  ): Promise<MessageItem> {
    const { data } = await apiClient.post(`/messaging/conversations/${conversationId}/messages`, {
      content,
      attachmentUrl,
      attachmentType,
    });
    return data.data;
  },

  // fileUri is a local device URI from expo-image-picker / expo-document-picker.
  async uploadAttachment(fileUri: string, mimeType: string, fileName: string): Promise<{ attachmentUrl: string; attachmentType: string }> {
    const formData = new FormData();
    formData.append("file", { uri: fileUri, name: fileName, type: mimeType } as any);
    const { data } = await apiClient.post("/messaging/attachments", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data.data;
  },

  async unreadCount(): Promise<number> {
    const { data } = await apiClient.get("/messaging/unread-count");
    return data.data.count;
  },

  async deleteMessage(messageId: string): Promise<void> {
    await apiClient.delete(`/messaging/messages/${messageId}`);
  },
};

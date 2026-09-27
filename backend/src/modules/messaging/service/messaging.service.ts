import { prisma } from "../../../database/prisma";
import { AppError } from "../../../common/errors/AppError";

type AuthUser = { userId: string; accountType: string; lawFirmId: string | null };

// Staff-side account types -- the "professional" side of every messaging
// pair (Lawyer<->Client, Teacher/Institution<->Student). CLIENT and STUDENT
// never message each other or Company directly -- they go through their
// own law firm/institution's staff.
const STAFF_TYPES = ["LAWYER", "LAW_FIRM_ADMIN", "STAFF"];

const contactSelect = {
  id: true,
  fullName: true,
  avatarUrl: true,
  accountType: true,
} as const;

/**
 * Decides whether two account types are allowed to message each other.
 * Covers exactly the three real-world relationships TechnoOne supports:
 *   - Law firm staff <-> their own Clients (same lawFirmId)
 *   - Institution staff ("teachers") <-> their own Students (same lawFirmId)
 *   - Institution/Law firm Admin <-> Company (TechnoOne) support
 * Everything else (Client<->Student, Client<->Company, Student<->Student,
 * etc.) is rejected -- those should always go through the tenant's own staff.
 */
function canMessage(
  a: { accountType: string; lawFirmId: string | null },
  b: { accountType: string; lawFirmId: string | null }
): boolean {
  // Institution/Law firm <-> Company now goes through the Support Ticket
  // system instead of real-time chat -- Company is never a valid
  // messaging counterpart here.
  if (a.accountType === "COMPANY" || b.accountType === "COMPANY") return false;

  if (a.accountType === "CLIENT") {
    return STAFF_TYPES.includes(b.accountType) && !!a.lawFirmId && a.lawFirmId === b.lawFirmId;
  }
  if (b.accountType === "CLIENT") {
    return STAFF_TYPES.includes(a.accountType) && !!b.lawFirmId && a.lawFirmId === b.lawFirmId;
  }

  if (a.accountType === "STUDENT") {
    return STAFF_TYPES.includes(b.accountType) && !!a.lawFirmId && a.lawFirmId === b.lawFirmId;
  }
  if (b.accountType === "STUDENT") {
    return STAFF_TYPES.includes(a.accountType) && !!b.lawFirmId && a.lawFirmId === b.lawFirmId;
  }

  return false;
}

export const messagingService = {
  canMessage,

  // Who the current user is allowed to start a new conversation with.
  async listContacts(auth: AuthUser) {
    const me = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { accountType: true, lawFirmId: true },
    });
    if (!me) throw AppError.unauthorized();

    // Company staff have no real-time messaging counterparts -- they use
    // the Support Ticket inbox instead.
    if (me.accountType === "COMPANY") {
      return [];
    }

    if (me.accountType === "CLIENT" || me.accountType === "STUDENT") {
      if (!me.lawFirmId) return [];
      return prisma.user.findMany({
        where: { lawFirmId: me.lawFirmId, accountType: { in: STAFF_TYPES as any }, status: "ACTIVE" },
        select: contactSelect,
        orderBy: { fullName: "asc" },
      });
    }

    // LAWYER / LAW_FIRM_ADMIN / STAFF -- their own clients & students.
    // Company support is handled by the Support Ticket system, not chat.
    const where: any = {
      status: "ACTIVE",
      OR: [{ lawFirmId: me.lawFirmId, accountType: { in: ["CLIENT", "STUDENT"] } }],
    };
    return prisma.user.findMany({ where, select: contactSelect, orderBy: { fullName: "asc" } });
  },

  async getOrCreateConversation(auth: AuthUser, targetUserId: string) {
    if (targetUserId === auth.userId) throw AppError.badRequest("You can't message yourself.");

    const [me, target] = await Promise.all([
      prisma.user.findUnique({ where: { id: auth.userId }, select: { id: true, accountType: true, lawFirmId: true } }),
      prisma.user.findUnique({
        where: { id: targetUserId },
        select: { id: true, accountType: true, lawFirmId: true, status: true },
      }),
    ]);
    if (!me) throw AppError.unauthorized();
    if (!target || target.status !== "ACTIVE") throw AppError.notFound("User not found.");
    if (!canMessage(me, target)) throw AppError.forbidden("You're not allowed to message this user.");

    const [userAId, userBId] = [me.id, target.id].sort();

    return prisma.conversation.upsert({
      where: { userAId_userBId: { userAId, userBId } },
      update: {},
      create: { userAId, userBId },
    });
  },

  async listConversations(auth: AuthUser) {
    const conversations = await prisma.conversation.findMany({
      where: { OR: [{ userAId: auth.userId }, { userBId: auth.userId }] },
      orderBy: { lastMessageAt: "desc" },
      include: {
        userA: { select: contactSelect },
        userB: { select: contactSelect },
        messages: {
          where: { senderId: { not: auth.userId }, isRead: false },
          select: { id: true },
        },
      },
    });

    return conversations.map((c) => {
      const other = c.userAId === auth.userId ? c.userB : c.userA;
      return {
        id: c.id,
        otherUser: other,
        lastMessageText: c.lastMessageText,
        lastMessageAt: c.lastMessageAt,
        unreadCount: c.messages.length,
      };
    });
  },

  async assertParticipant(conversationId: string, userId: string) {
    const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conversation) throw AppError.notFound("Conversation not found.");
    if (conversation.userAId !== userId && conversation.userBId !== userId) throw AppError.forbidden();
    return conversation;
  },

  async listMessages(auth: AuthUser, conversationId: string, page: number, limit: number) {
    await this.assertParticipant(conversationId, auth.userId);

    const [items, total] = await Promise.all([
      prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.message.count({ where: { conversationId } }),
    ]);

    // Mark whatever the other person sent as read the moment this user
    // fetches the thread (equivalent to opening the chat).
    await prisma.message.updateMany({
      where: { conversationId, senderId: { not: auth.userId }, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });

    return { items: items.reverse(), page, total, totalPages: Math.ceil(total / limit) };
  },

  async sendMessage(
    auth: AuthUser,
    conversationId: string,
    content: string,
    attachmentUrl?: string,
    attachmentType?: string
  ) {
    await this.assertParticipant(conversationId, auth.userId);

    const trimmed = content.trim();
    if (!trimmed && !attachmentUrl) {
      throw AppError.badRequest("Message must have text or an attachment.");
    }

    const previewText = trimmed || (attachmentType?.startsWith("image/") ? "📷 Photo" : "📎 Attachment");

    const [message] = await prisma.$transaction([
      prisma.message.create({ data: { conversationId, senderId: auth.userId, content: trimmed, attachmentUrl, attachmentType } }),
      prisma.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: new Date(), lastMessageText: previewText.slice(0, 200) },
      }),
    ]);

    return message;
  },

  // Sender-only, hard delete -- there's no "edited"/"deleted" placeholder
  // concept here, it simply removes the row. Refreshes the conversation's
  // preview (lastMessageText/lastMessageAt) so the conversation list
  // doesn't keep showing a message that no longer exists.
  async deleteMessage(auth: AuthUser, messageId: string) {
    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message) throw AppError.notFound("Message not found.");
    if (message.senderId !== auth.userId) throw AppError.forbidden("You can only delete your own messages.");

    await prisma.message.delete({ where: { id: messageId } });

    const latest = await prisma.message.findFirst({
      where: { conversationId: message.conversationId },
      orderBy: { createdAt: "desc" },
    });
    await prisma.conversation.update({
      where: { id: message.conversationId },
      data: {
        lastMessageText: latest
          ? latest.content || (latest.attachmentType?.startsWith("image/") ? "📷 Photo" : "📎 Attachment")
          : null,
        lastMessageAt: latest ? latest.createdAt : null,
      },
    });

    return { success: true };
  },

  async unreadCount(auth: AuthUser) {
    const count = await prisma.message.count({
      where: {
        senderId: { not: auth.userId },
        isRead: false,
        conversation: { OR: [{ userAId: auth.userId }, { userBId: auth.userId }] },
      },
    });
    return { count };
  },
};

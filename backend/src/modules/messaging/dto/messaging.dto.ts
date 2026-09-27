import { z } from "zod";

export const createConversationSchema = z.object({
  targetUserId: z.string().uuid(),
});

export const sendMessageSchema = z.object({
  content: z.string().max(4000).optional().default(""),
  attachmentUrl: z.string().optional(),
  attachmentType: z.string().optional(),
});

export const conversationIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const listMessagesQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(30),
});

export const messageIdParamSchema = z.object({
  messageId: z.string().uuid(),
});

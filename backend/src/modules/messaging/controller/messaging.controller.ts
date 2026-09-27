import { Request, Response } from "express";
import { AppError } from "../../../common/errors/AppError";
import { messagingService } from "../service/messaging.service";
import {
  createConversationSchema,
  sendMessageSchema,
  conversationIdParamSchema,
  listMessagesQuerySchema,
  messageIdParamSchema,
} from "../dto/messaging.dto";

export const messagingController = {
  async listContacts(req: Request, res: Response) {
    if (!req.auth) throw AppError.unauthorized();
    const result = await messagingService.listContacts(req.auth);
    res.status(200).json({ success: true, data: result });
  },

  async listConversations(req: Request, res: Response) {
    if (!req.auth) throw AppError.unauthorized();
    const result = await messagingService.listConversations(req.auth);
    res.status(200).json({ success: true, data: result });
  },

  async createConversation(req: Request, res: Response) {
    if (!req.auth) throw AppError.unauthorized();
    const { targetUserId } = createConversationSchema.parse(req.body);
    const result = await messagingService.getOrCreateConversation(req.auth, targetUserId);
    res.status(200).json({ success: true, data: result });
  },

  async listMessages(req: Request, res: Response) {
    if (!req.auth) throw AppError.unauthorized();
    const { id } = conversationIdParamSchema.parse(req.params);
    const { page, limit } = listMessagesQuerySchema.parse(req.query);
    const result = await messagingService.listMessages(req.auth, id, page, limit);
    res.status(200).json({ success: true, data: result });
  },

  async sendMessage(req: Request, res: Response) {
    if (!req.auth) throw AppError.unauthorized();
    const { id } = conversationIdParamSchema.parse(req.params);
    const { content, attachmentUrl, attachmentType } = sendMessageSchema.parse(req.body);
    const result = await messagingService.sendMessage(req.auth, id, content, attachmentUrl, attachmentType);
    res.status(201).json({ success: true, data: result });
  },

  async uploadAttachment(req: Request, res: Response) {
    if (!req.auth) throw AppError.unauthorized();
    if (!req.file) throw AppError.badRequest("No file uploaded.");
    res.status(201).json({
      success: true,
      data: { attachmentUrl: `chat-attachments/${req.file.filename}`, attachmentType: req.file.mimetype },
    });
  },

  async deleteMessage(req: Request, res: Response) {
    if (!req.auth) throw AppError.unauthorized();
    const { messageId } = messageIdParamSchema.parse(req.params);
    await messagingService.deleteMessage(req.auth, messageId);
    res.status(200).json({ success: true, data: null });
  },

  async unreadCount(req: Request, res: Response) {
    if (!req.auth) throw AppError.unauthorized();
    const result = await messagingService.unreadCount(req.auth);
    res.status(200).json({ success: true, data: result });
  },
};

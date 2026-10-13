import sys

# Run this from the backend/ root directory.

# 1. DTO
dto_path = 'src/modules/messaging/dto/messaging.dto.ts'
with open(dto_path, 'r', encoding='utf-8') as f:
    dto = f.read()

old_dto = '''export const listMessagesQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(30),
});'''

new_dto = '''export const listMessagesQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(30),
});

export const messageIdParamSchema = z.object({
  messageId: z.string().uuid(),
});'''

c = dto.count(old_dto)
print(f'dto anchor count = {c}')
if c != 1:
    print('ERROR: aborting (dto).')
    sys.exit(1)
dto = dto.replace(old_dto, new_dto)
with open(dto_path, 'w', encoding='utf-8') as f:
    f.write(dto)

# 2. Service
svc_path = 'src/modules/messaging/service/messaging.service.ts'
with open(svc_path, 'r', encoding='utf-8') as f:
    svc = f.read()

old_svc = '''  async unreadCount(auth: AuthUser) {'''

new_svc = '''  // Sender-only, hard delete -- there's no "edited"/"deleted" placeholder
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

  async unreadCount(auth: AuthUser) {'''

c = svc.count(old_svc)
print(f'service anchor count = {c}')
if c != 1:
    print('ERROR: aborting (service).')
    sys.exit(1)
svc = svc.replace(old_svc, new_svc)
with open(svc_path, 'w', encoding='utf-8') as f:
    f.write(svc)

# 3. Controller
ctrl_path = 'src/modules/messaging/controller/messaging.controller.ts'
with open(ctrl_path, 'r', encoding='utf-8') as f:
    ctrl = f.read()

old_ctrl_import = '''import {
  createConversationSchema,
  sendMessageSchema,
  conversationIdParamSchema,
  listMessagesQuerySchema,
} from "../dto/messaging.dto";'''

new_ctrl_import = '''import {
  createConversationSchema,
  sendMessageSchema,
  conversationIdParamSchema,
  listMessagesQuerySchema,
  messageIdParamSchema,
} from "../dto/messaging.dto";'''

c = ctrl.count(old_ctrl_import)
print(f'controller-import anchor count = {c}')
if c != 1:
    print('ERROR: aborting (controller import).')
    sys.exit(1)
ctrl = ctrl.replace(old_ctrl_import, new_ctrl_import)

old_ctrl_fn = '''  async unreadCount(req: Request, res: Response) {'''

new_ctrl_fn = '''  async deleteMessage(req: Request, res: Response) {
    if (!req.auth) throw AppError.unauthorized();
    const { messageId } = messageIdParamSchema.parse(req.params);
    await messagingService.deleteMessage(req.auth, messageId);
    res.status(200).json({ success: true, data: null });
  },

  async unreadCount(req: Request, res: Response) {'''

c = ctrl.count(old_ctrl_fn)
print(f'controller-fn anchor count = {c}')
if c != 1:
    print('ERROR: aborting (controller fn).')
    sys.exit(1)
ctrl = ctrl.replace(old_ctrl_fn, new_ctrl_fn)
with open(ctrl_path, 'w', encoding='utf-8') as f:
    f.write(ctrl)

# 4. Routes
routes_path = 'src/modules/messaging/routes/messaging.routes.ts'
with open(routes_path, 'r', encoding='utf-8') as f:
    routes = f.read()

old_routes = '''router.post("/conversations/:id/messages", messagingController.sendMessage);
router.get("/unread-count", messagingController.unreadCount);'''

new_routes = '''router.post("/conversations/:id/messages", messagingController.sendMessage);
router.delete("/messages/:messageId", messagingController.deleteMessage);
router.get("/unread-count", messagingController.unreadCount);'''

c = routes.count(old_routes)
print(f'routes anchor count = {c}')
if c != 1:
    print('ERROR: aborting (routes).')
    sys.exit(1)
routes = routes.replace(old_routes, new_routes)
with open(routes_path, 'w', encoding='utf-8') as f:
    f.write(routes)

print('All 4 backend messaging files patched successfully.')

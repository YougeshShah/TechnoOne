import { Router } from "express";
import { authenticate } from "../../../common/middleware/authenticate";
import { chatAttachmentUpload, mapMulterError } from "../../../common/middleware/upload";
import { messagingController } from "../controller/messaging.controller";

const router = Router();
router.use(authenticate);

router.get("/contacts", messagingController.listContacts);
router.get("/conversations", messagingController.listConversations);
router.post("/conversations", messagingController.createConversation);
router.get("/conversations/:id/messages", messagingController.listMessages);
router.post("/conversations/:id/messages", messagingController.sendMessage);
router.delete("/messages/:messageId", messagingController.deleteMessage);
router.get("/unread-count", messagingController.unreadCount);

router.post(
  "/attachments",
  (req, res, next) => {
    chatAttachmentUpload.single("file")(req, res, (err) => {
      if (err) return next(mapMulterError(err));
      next();
    });
  },
  messagingController.uploadAttachment
);

export default router;

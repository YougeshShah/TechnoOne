import { Router } from "express";
import { liveClassController } from "../controller/live-class.controller";
import { authenticate } from "../../../common/middleware/authenticate";
import { authorize } from "../../../common/middleware/authorize";

const router = Router();

router.use(authenticate);

router.get("/", liveClassController.list);
router.get("/:id", liveClassController.getById);

router.post("/", authorize("COMPANY", "LAW_FIRM_ADMIN", "LAWYER", "STAFF", "INSTITUTION"), liveClassController.create);
router.post("/:id/host-join", authorize("COMPANY", "LAW_FIRM_ADMIN", "LAWYER", "STAFF", "INSTITUTION"), liveClassController.joinAsHost);
router.patch("/:id/mark-live", authorize("COMPANY", "LAW_FIRM_ADMIN", "LAWYER", "STAFF", "INSTITUTION"), liveClassController.markLive);
router.patch("/:id/mark-ended", authorize("COMPANY", "LAW_FIRM_ADMIN", "LAWYER", "STAFF", "INSTITUTION"), liveClassController.markEnded);
router.patch("/:id/recording", authorize("COMPANY", "LAW_FIRM_ADMIN", "LAWYER", "STAFF", "INSTITUTION"), liveClassController.uploadRecording);
router.patch("/:id/cancel", authorize("COMPANY", "LAW_FIRM_ADMIN", "LAWYER", "STAFF", "INSTITUTION"), liveClassController.cancel);
router.patch("/:id", authorize("COMPANY", "LAW_FIRM_ADMIN", "LAWYER", "STAFF", "INSTITUTION"), liveClassController.update);
router.delete("/:id", authorize("COMPANY", "LAW_FIRM_ADMIN", "LAWYER", "STAFF", "INSTITUTION"), liveClassController.remove);
router.get("/:id/attendees", authorize("COMPANY", "LAW_FIRM_ADMIN", "LAWYER", "STAFF", "INSTITUTION"), liveClassController.listAttendees);

router.post("/:id/join", authorize("STUDENT"), liveClassController.joinAsStudent);

export default router;

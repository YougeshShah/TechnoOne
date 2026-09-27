import { Router } from "express";
import { mockTestController } from "../controller/mock-test.controller";
import { authenticate } from "../../../common/middleware/authenticate";
import { authorize } from "../../../common/middleware/authorize";
import { proctoringUpload, mapMulterError } from "../../../common/middleware/upload";

const router = Router();

router.use(authenticate);

router.get("/", mockTestController.list);
router.get("/my-attempts", mockTestController.myAttempts);
router.get("/attempts/:attemptId", mockTestController.getAttemptResult);
router.get("/:id", mockTestController.getById);

router.post("/", authorize("COMPANY", "LAW_FIRM_ADMIN"), mockTestController.create);
router.patch("/:id/publish", authorize("COMPANY", "LAW_FIRM_ADMIN"), mockTestController.publish);
router.post("/:id/questions", authorize("COMPANY", "LAW_FIRM_ADMIN"), mockTestController.addQuestion);
router.delete("/:id/questions/:questionId", authorize("COMPANY", "LAW_FIRM_ADMIN"), mockTestController.removeQuestion);

router.post("/:id/start", authorize("STUDENT"), mockTestController.startAttempt);
router.post("/attempts/:attemptId/submit", authorize("STUDENT"), mockTestController.submitAttempt);

// Anti-cheating: periodic low-res snapshot upload + "student left the test
// screen" violation ping, both while an attempt is still in progress.
router.post(
  "/attempts/:attemptId/proctoring-snapshot",
  authorize("STUDENT"),
  (req, res, next) => {
    proctoringUpload.single("snapshot")(req, res, (err) => {
      if (err) return next(mapMulterError(err));
      next();
    });
  },
  mockTestController.uploadProctoringSnapshot
);
router.post("/attempts/:attemptId/violation", authorize("STUDENT"), mockTestController.recordViolation);

export default router;

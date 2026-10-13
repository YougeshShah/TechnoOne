import sys

path = 'src/modules/mock-test/routes/mock-test.routes.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old1 = '''import { Router } from "express";
import { mockTestController } from "../controller/mock-test.controller";
import { authenticate } from "../../../common/middleware/authenticate";
import { authorize } from "../../../common/middleware/authorize";'''

new1 = '''import { Router } from "express";
import { mockTestController } from "../controller/mock-test.controller";
import { authenticate } from "../../../common/middleware/authenticate";
import { authorize } from "../../../common/middleware/authorize";
import { proctoringUpload, mapMulterError } from "../../../common/middleware/upload";'''

c1 = content.count(old1)
print(f'imports anchor count = {c1}')
if c1 != 1:
    print('ERROR: aborting (imports).')
    sys.exit(1)
content = content.replace(old1, new1)

old2 = '''router.post("/:id/start", authorize("STUDENT"), mockTestController.startAttempt);
router.post("/attempts/:attemptId/submit", authorize("STUDENT"), mockTestController.submitAttempt);

export default router;'''

new2 = '''router.post("/:id/start", authorize("STUDENT"), mockTestController.startAttempt);
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

export default router;'''

c2 = content.count(old2)
print(f'routes anchor count = {c2}')
if c2 != 1:
    print('ERROR: aborting (routes).')
    sys.exit(1)
content = content.replace(old2, new2)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Patched src/modules/mock-test/routes/mock-test.routes.ts')

import sys

path = 'src/modules/mock-test/service/mock-test.service.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old1 = '''import { AppError } from "../../../common/errors/AppError";
import { usageLimitService } from "../../usage-limit/service/usage-limit.service";
import { mockTestRepository } from "../repository/mock-test.repository";
import { mcqRepository } from "../../mcq/repository/mcq.repository";
import { courseService } from "../../course/service/course.service";
import { lawFirmRepository } from "../../lawfirm/repository/lawfirm.repository";
import { CreateMockTestInput, ListMockTestsQuery, SubmitAttemptInput } from "../dto/mock-test.dto";'''

new1 = '''import fs from "fs";
import path from "path";
import { AppError } from "../../../common/errors/AppError";
import { env } from "../../../config/env";
import { usageLimitService } from "../../usage-limit/service/usage-limit.service";
import { mockTestRepository } from "../repository/mock-test.repository";
import { mcqRepository } from "../../mcq/repository/mcq.repository";
import { courseService } from "../../course/service/course.service";
import { lawFirmRepository } from "../../lawfirm/repository/lawfirm.repository";
import { CreateMockTestInput, ListMockTestsQuery, SubmitAttemptInput } from "../dto/mock-test.dto";'''

c1 = content.count(old1)
print(f'imports anchor count = {c1}')
if c1 != 1:
    print('ERROR: aborting (imports).')
    sys.exit(1)
content = content.replace(old1, new1)

old2 = '''    await mockTestRepository.saveAnswers(attemptId, gradedAnswers);
    const updated = await mockTestRepository.submitAttempt(attemptId, correctCount);

    return {'''

new2 = '''    await mockTestRepository.saveAnswers(attemptId, gradedAnswers);
    const updated = await mockTestRepository.submitAttempt(attemptId, correctCount);

    // Anti-cheating snapshots only matter for a later staff review of a
    // suspicious (flagged) attempt. For every normal attempt, delete them
    // right away (disk + DB) so they never pile up as dead weight -- they
    // did their job just by existing during the test.
    if (!(attempt as any).flagged && (attempt as any).proctoringSnapshotUrls?.length > 0) {
      for (const relativePath of (attempt as any).proctoringSnapshotUrls as string[]) {
        const absolutePath = path.join(process.cwd(), env.storage.localUploadDir, relativePath);
        fs.unlink(absolutePath, () => {}); // best-effort -- never block submission on cleanup
      }
      await mockTestRepository.clearProctoringSnapshots(attemptId);
    }

    return {'''

c2 = content.count(old2)
print(f'submit-cleanup anchor count = {c2}')
if c2 != 1:
    print('ERROR: aborting (submit cleanup).')
    sys.exit(1)
content = content.replace(old2, new2)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Patched src/modules/mock-test/service/mock-test.service.ts (auto-delete snapshots on normal submit)')

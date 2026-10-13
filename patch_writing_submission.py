import sys

# Run this from backend/ root directory.

path = 'src/modules/writing-submission/writing-submission.routes.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old1 = '''import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../database/prisma";
import { authenticate } from "../../common/middleware/authenticate";
import { authorize } from "../../common/middleware/authorize";
import { AppError } from "../../common/errors/AppError";'''

new1 = '''import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../database/prisma";
import { authenticate } from "../../common/middleware/authenticate";
import { authorize } from "../../common/middleware/authorize";
import { AppError } from "../../common/errors/AppError";
import { gradeWritingEssay } from "../ai-grading/ai-grading.service";'''

c1 = content.count(old1)
print(f'imports anchor count = {c1}')
if c1 != 1:
    print('ERROR: aborting (imports).')
    sys.exit(1)
content = content.replace(old1, new1)

old2 = '''  const wordCount = countWords(input.essayText);

  const submission = await prisma.writingSubmission.create({
    data: {
      sectionId: input.sectionId,
      attemptId: input.attemptId,
      studentId: req.auth.userId,
      essayText: input.essayText,
      wordCount,
    },
  });
  res.status(201).json({ success: true, data: submission });
});'''

new2 = '''  const section = await prisma.testSection.findUnique({ where: { id: input.sectionId } });
  const wordCount = countWords(input.essayText);

  const submission = await prisma.writingSubmission.create({
    data: {
      sectionId: input.sectionId,
      attemptId: input.attemptId,
      studentId: req.auth.userId,
      essayText: input.essayText,
      wordCount,
    },
  });

  // AI-grade immediately (Claude, IELTS Writing band descriptors) so the
  // student sees a band score + feedback right after submitting, instead of
  // waiting for a Company staff member to review it manually. Staff can
  // still see it in /pending (if this fails) or override the AI score via
  // PATCH /:id/grade at any time.
  let graded = submission;
  if (section?.writingPrompt) {
    const result = await gradeWritingEssay({
      writingPrompt: section.writingPrompt,
      minWordCount: section.minWordCount ?? null,
      wordCount,
      essayText: input.essayText,
    });
    if (result) {
      graded = await prisma.writingSubmission.update({
        where: { id: submission.id },
        data: { score: result.score, feedback: result.feedback, reviewedAt: new Date() },
      });
    }
  }

  res.status(201).json({ success: true, data: graded });
});'''

c2 = content.count(old2)
print(f'submit-handler anchor count = {c2}')
if c2 != 1:
    print('ERROR: aborting (submit handler).')
    sys.exit(1)
content = content.replace(old2, new2)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Patched src/modules/writing-submission/writing-submission.routes.ts (instant AI grading on submit)')

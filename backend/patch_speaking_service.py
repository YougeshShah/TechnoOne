import sys

# Run this from backend/ root directory.

path = 'src/modules/speaking/service/speaking.service.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old1 = '''import path from "path";
import { usageLimitService } from "../../usage-limit/service/usage-limit.service";
import { prisma } from "../../../database/prisma";
import { AppError } from "../../../common/errors/AppError";
import { env } from "../../../config/env";
import { CreatePromptInput, UpdatePromptInput, SubmitRecordingInput } from "../dto/speaking.dto";'''

new1 = '''import path from "path";
import { usageLimitService } from "../../usage-limit/service/usage-limit.service";
import { prisma } from "../../../database/prisma";
import { AppError } from "../../../common/errors/AppError";
import { env } from "../../../config/env";
import { CreatePromptInput, UpdatePromptInput, SubmitRecordingInput } from "../dto/speaking.dto";
import { gradeSpeakingRecording } from "../../ai-grading/ai-grading.service";'''

c1 = content.count(old1)
print(f'imports anchor count = {c1}')
if c1 != 1:
    print('ERROR: aborting (imports).')
    sys.exit(1)
content = content.replace(old1, new1)

old2 = '''    const relativePath = path.join("speaking", file.filename);

    return prisma.speakingSubmission.create({
      data: {
        studentId,
        promptId: input.promptId,
        recordingUrl: relativePath,
        recordingType: input.recordingType,
        durationSeconds: input.durationSeconds,
      },
    });
  },'''

new2 = '''    const relativePath = path.join("speaking", file.filename);

    const created = await prisma.speakingSubmission.create({
      data: {
        studentId,
        promptId: input.promptId,
        recordingUrl: relativePath,
        recordingType: input.recordingType,
        durationSeconds: input.durationSeconds,
      },
    });

    // AI-grade immediately (Gemini transcribes + scores the audio/video in
    // one call, IELTS Speaking band descriptors) so the student sees their
    // band scores right after submitting, instead of sitting in
    // PENDING_GRADING forever with no pipeline behind it.
    const absoluteFilePath = path.join(process.cwd(), env.storage.localUploadDir, relativePath);
    const result = await gradeSpeakingRecording({
      absoluteFilePath,
      mimeType: file.mimetype,
      promptText: prompt.promptText,
      part: prompt.part,
    });

    if (result) {
      return prisma.speakingSubmission.update({
        where: { id: created.id },
        data: {
          transcript: result.transcript,
          fluencyScore: result.fluencyScore,
          lexicalScore: result.lexicalScore,
          grammarScore: result.grammarScore,
          pronunciationScore: result.pronunciationScore,
          overallBand: result.overallBand,
          aiFeedback: result.aiFeedback,
          status: "GRADED",
          gradedAt: new Date(),
        },
      });
    }

    return prisma.speakingSubmission.update({
      where: { id: created.id },
      data: { status: "GRADING_FAILED" },
    });
  },'''

c2 = content.count(old2)
print(f'createSubmission anchor count = {c2}')
if c2 != 1:
    print('ERROR: aborting (createSubmission).')
    sys.exit(1)
content = content.replace(old2, new2)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Patched src/modules/speaking/service/speaking.service.ts (instant AI grading on submit)')

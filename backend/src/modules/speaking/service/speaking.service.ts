import path from "path";
import { usageLimitService } from "../../usage-limit/service/usage-limit.service";
import { prisma } from "../../../database/prisma";
import { AppError } from "../../../common/errors/AppError";
import { env } from "../../../config/env";
import { CreatePromptInput, UpdatePromptInput, SubmitRecordingInput } from "../dto/speaking.dto";
import { gradeSpeakingRecording } from "../../ai-grading/ai-grading.service";

export const speakingService = {
  // --- Prompts (Company/Institution manage these) ---
  async createPrompt(input: CreatePromptInput, createdBy: string) {
    return prisma.speakingPrompt.create({ data: { ...input, createdBy } });
  },

  async updatePrompt(id: string, input: UpdatePromptInput) {
    const existing = await prisma.speakingPrompt.findUnique({ where: { id } });
    if (!existing) throw AppError.notFound("Prompt not found");
    return prisma.speakingPrompt.update({ where: { id }, data: input });
  },

  async deletePrompt(id: string) {
    const existing = await prisma.speakingPrompt.findUnique({ where: { id } });
    if (!existing) throw AppError.notFound("Prompt not found");
    await prisma.speakingPrompt.delete({ where: { id } });
  },

  async listPrompts(courseId: string, part?: number) {
    return prisma.speakingPrompt.findMany({
      where: { courseId, isPublished: true, ...(part ? { part } : {}) },
      orderBy: [{ part: "asc" }, { createdAt: "asc" }],
    });
  },

  // --- Submissions (Student records + uploads) ---
  async createSubmission(
    studentId: string,
    input: SubmitRecordingInput,
    file: Express.Multer.File,
    studentLawFirmId: string | null
  ) {
    const prompt = await prisma.speakingPrompt.findUnique({ where: { id: input.promptId } });
    if (!prompt) throw AppError.notFound("Prompt not found");

    await usageLimitService.enforce(studentId, prompt.courseId, studentLawFirmId, "speaking");

    // Stored as a relative path (lawFirmId-less, since this sits under
    // uploads/speaking/ directly) -- streamed back later via the
    // authenticated recording endpoint, never served as a public static URL,
    // since these are personal recordings, not low-sensitivity assets like avatars.
    const relativePath = path.join("speaking", file.filename);

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
  },

  async listMySubmissions(studentId: string, promptId?: string) {
    return prisma.speakingSubmission.findMany({
      where: { studentId, ...(promptId ? { promptId } : {}) },
      include: { prompt: { select: { title: true, part: true, promptText: true } } },
      orderBy: { createdAt: "desc" },
    });
  },

  // Returns the absolute file path + the requester's authorization to view
  // it -- used by the streaming controller. Only the student who submitted
  // it may play it back for now (institution/company review UI is a
  // follow-up, not part of this framework pass).
  async getSubmissionFileForStreaming(submissionId: string, requesterId: string) {
    const submission = await prisma.speakingSubmission.findUnique({ where: { id: submissionId } });
    if (!submission) throw AppError.notFound("Submission not found");
    if (submission.studentId !== requesterId) {
      throw AppError.forbidden("You can only access your own recordings");
    }
    const absolutePath = path.join(process.cwd(), env.storage.localUploadDir, submission.recordingUrl);
    return { absolutePath, recordingType: submission.recordingType };
  },
};

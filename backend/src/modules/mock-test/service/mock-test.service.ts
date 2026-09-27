import fs from "fs";
import path from "path";
import { AppError } from "../../../common/errors/AppError";
import { env } from "../../../config/env";
import { usageLimitService } from "../../usage-limit/service/usage-limit.service";
import { mockTestRepository } from "../repository/mock-test.repository";
import { mcqRepository } from "../../mcq/repository/mcq.repository";
import { courseService } from "../../course/service/course.service";
import { lawFirmRepository } from "../../lawfirm/repository/lawfirm.repository";
import { CreateMockTestInput, ListMockTestsQuery, SubmitAttemptInput } from "../dto/mock-test.dto";

// Same normalization used in mcq.service.ts for Fill Blank / Short Answer
// grading — case-insensitive, whitespace-trimmed comparison.
function normalizeAnswerText(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

export const mockTestService = {
  async list(query: ListMockTestsQuery, opts: { studentLawFirmId?: string | null; forLawFirmId?: string; studentExamType?: string | null } = {}) {
    return mockTestRepository.findMany({
      courseId: query.courseId,
      examType: query.examType as any,
      publishedOnly: query.publishedOnly,
      studentLawFirmId: opts.studentLawFirmId,
      forLawFirmId: opts.forLawFirmId,
      studentExamType: opts.studentExamType,
    });
  },

  async getById(id: string) {
    const test = await mockTestRepository.findById(id);
    if (!test) throw AppError.notFound("Mock test not found");
    return test;
  },

  /**
   * Company creates a mock test by specifying course/exam type + how many
   * questions to pull — the actual questions are randomly sampled from the
   * question bank matching that course/subject, not hand-picked one by one.
   */
  async create(input: CreateMockTestInput, createdBy: string, hostLawFirmId?: string) {
    // Institutions may only build mock tests for courses they've been
    // granted Sector Access to — prevents an IELTS-only institute from
    // quietly creating a Law mock test, for example.
    if (hostLawFirmId) {
      const firm = await lawFirmRepository.findById(hostLawFirmId);
      const allowed = (firm as any)?.allowedCourseIds ?? [];
      if (allowed.length > 0 && !allowed.includes(input.courseId)) {
        throw AppError.forbidden("Your institution doesn't have Sector Access to this course.");
      }
    }

    const subjectId = input.subjectId || undefined; // "" (from "All Subjects") means no filter, not a real subject
    const test = await mockTestRepository.create({
      title: input.title,
      courseId: input.courseId,
      examType: input.examType as any,
      subjectId,
      durationMinutes: input.durationMinutes,
      negativeMarkingPercent: input.negativeMarkingPercent,
      hostLawFirmId,
      createdBy,
    });

    const questionIds = await mcqRepository.findRandom({
      courseId: input.courseId,
      subjectId,
      examType: input.examType as any,
      count: input.questionCount,
    });

    if (questionIds.length === 0) {
      throw AppError.badRequest("No questions found in the question bank for this course/subject — add questions first.");
    }

    await mockTestRepository.addQuestions(test.id, questionIds, input.marksPerQuestion);
    return { ...test, questionCount: questionIds.length };
  },

  async publish(id: string, requesterLawFirmId?: string) {
    const test = await this.getById(id);
    // If the requester is an institution admin, they may only publish their
    // own institution's tests — never Company's or another institution's.
    if (requesterLawFirmId !== undefined && (test as any).hostLawFirmId !== requesterLawFirmId) {
      throw AppError.forbidden("You can only publish your own institution's mock tests.");
    }
    return mockTestRepository.publish(id);
  },

  async addQuestion(mockTestId: string, questionId: string, marks: number, requesterLawFirmId?: string) {
    const test = await this.getById(mockTestId);
    if (requesterLawFirmId !== undefined && (test as any).hostLawFirmId !== requesterLawFirmId) {
      throw AppError.forbidden("You can only edit your own institution's mock tests.");
    }
    const currentOrder = test.questions.length;
    return mockTestRepository.addSingleQuestion(mockTestId, questionId, marks, currentOrder);
  },

  async removeQuestion(mockTestId: string, questionId: string, requesterLawFirmId?: string) {
    const test = await this.getById(mockTestId);
    if (requesterLawFirmId !== undefined && (test as any).hostLawFirmId !== requesterLawFirmId) {
      throw AppError.forbidden("You can only edit your own institution's mock tests.");
    }
    return mockTestRepository.removeQuestion(mockTestId, questionId);
  },

  /**
   * A student starts an attempt — gated the same way as MCQs/LiveClasses:
   * free-demo tests are open to everyone, everything else needs an active
   * course subscription.
   */
  async startAttempt(studentId: string, mockTestId: string, studentLawFirmId: string | null) {
    const test = await this.getById(mockTestId);
    if (!test.isPublished) throw AppError.badRequest("This mock test is not published yet");

    const allowed = await courseService.canAccess(studentId, (test as any).courseId, (test as any).isFreeDemo);
    if (!allowed) throw AppError.forbidden("Subscribe to this course to take this mock test.");

    await usageLimitService.enforce(studentId, (test as any).courseId, studentLawFirmId, "mockTest");

    const attempt = await mockTestRepository.createAttempt(studentId, mockTestId, test.questions.length);
    return { attemptId: attempt.id, totalQuestions: test.questions.length, durationMinutes: test.durationMinutes };
  },

  /**
   * Auto-grades on submit — compares each selected option against the
   * correct answer stored server-side, so a student can never see or tamper
   * with the answer key before submitting.
   */
  async submitAttempt(attemptId: string, studentId: string, input: SubmitAttemptInput) {
    const attempt = await mockTestRepository.findAttemptById(attemptId);
    if (!attempt) throw AppError.notFound("Attempt not found");
    if (attempt.studentId !== studentId) throw AppError.forbidden("This is not your attempt");
    if (attempt.submittedAt) throw AppError.badRequest("This attempt has already been submitted");

    const test = await this.getById(attempt.mockTestId);
    const negativeMarkingPercent = (test as any).negativeMarkingPercent ?? 0;
    const answerKeyMap = new Map<
      string,
      { correctOption: string | null; correctAnswerText: string | null; marks: number }
    >(
      test.questions.map((q: any) => [
        q.questionId,
        { correctOption: q.question.correctOption, correctAnswerText: q.question.correctAnswerText, marks: q.marks ?? 1 },
      ])
    );

    let correctCount = 0;
    let totalMarks = 0;
    let scoredMarks = 0;
    const gradedAnswers = input.answers.map((a) => {
      const key = answerKeyMap.get(a.questionId);
      const marks = key?.marks ?? 1;
      totalMarks += marks;
      const isFreeText = !key?.correctOption && !!key?.correctAnswerText;
      const isCorrect = isFreeText
        ? a.selectedOption !== null && normalizeAnswerText(a.selectedOption) === normalizeAnswerText(key!.correctAnswerText!)
        : a.selectedOption !== null && a.selectedOption === key?.correctOption;

      if (isCorrect) {
        correctCount++;
        scoredMarks += marks;
      } else if (a.selectedOption !== null && negativeMarkingPercent > 0) {
        // Only attempted (non-blank) wrong answers are penalised — an
        // unattempted question never loses marks, matching real negative
        // marking rules (IOE, MECEE-BL).
        scoredMarks -= marks * (negativeMarkingPercent / 100);
      }
      return { questionId: a.questionId, selectedOption: a.selectedOption, isCorrect };
    });

    await mockTestRepository.saveAnswers(attemptId, gradedAnswers);
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

    return {
      score: correctCount,
      totalQuestions: attempt.totalQuestions,
      percentage: Math.round((correctCount / attempt.totalQuestions) * 100),
      marksScored: Math.round(scoredMarks * 100) / 100,
      totalMarks,
      negativeMarkingApplied: negativeMarkingPercent > 0,
      submittedAt: updated.submittedAt,
    };
  },

  async myAttempts(studentId: string) {
    return mockTestRepository.findAttemptsByStudent(studentId);
  },

  async getAttemptResult(attemptId: string, studentId: string) {
    const attempt = await mockTestRepository.findAttemptById(attemptId);
    if (!attempt) throw AppError.notFound("Attempt not found");
    if (attempt.studentId !== studentId) throw AppError.forbidden("This is not your attempt");
    if (!attempt.submittedAt) throw AppError.badRequest("This attempt has not been submitted yet");
    return attempt;
  },

  // --- Anti-cheating (proctoring) ---

  async addProctoringSnapshot(attemptId: string, studentId: string, relativePath: string) {
    const attempt = await mockTestRepository.findAttemptById(attemptId);
    if (!attempt) throw AppError.notFound("Attempt not found");
    if (attempt.studentId !== studentId) throw AppError.forbidden("This is not your attempt");
    if (attempt.submittedAt) throw AppError.badRequest("This attempt has already been submitted");
    return mockTestRepository.addProctoringSnapshot(attemptId, relativePath);
  },

  async recordViolation(attemptId: string, studentId: string) {
    const attempt = await mockTestRepository.findAttemptById(attemptId);
    if (!attempt) throw AppError.notFound("Attempt not found");
    if (attempt.studentId !== studentId) throw AppError.forbidden("This is not your attempt");
    if (attempt.submittedAt) throw AppError.badRequest("This attempt has already been submitted");
    return mockTestRepository.recordViolation(attemptId);
  },
};

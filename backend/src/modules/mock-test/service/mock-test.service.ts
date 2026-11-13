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
import { rawScoreToBand } from "../utils/band-conversion";

// Same normalization used in mcq.service.ts for Fill Blank / Short Answer
// grading — case-insensitive, whitespace-trimmed comparison.
function normalizeAnswerText(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

// Builds the per-section IELTS-style breakdown (Reading/Listening bands via
// the real conversion table, Writing bands from whatever's already been
// graded for this attempt, Speaking marked not-yet-available) plus one
// combined overall band -- the average of whichever section bands exist,
// rounded to the nearest 0.5, matching how the real IELTS overall band is
// calculated from the four skill bands.
function buildSectionBreakdown(
  test: any,
  gradedAnswers: { questionId: string; selectedOption: string | null; isCorrect: boolean | null }[],
  writingSubmissions: { sectionId: string; score: number | null; feedback: string | null }[],
  speakingSubmissions: { sectionId: string | null; overallBand: number | null; aiFeedback: string | null; status: string }[] = []
) {
  const sections = (test?.sections ?? []) as any[];
  if (sections.length === 0) return { sections: [] as any[], overallBand: null as number | null };

  const questionSectionMap = new Map<string, string | null>(
    (test.questions ?? []).map((q: any) => [q.questionId, q.sectionId ?? null])
  );
  const writingBySection = new Map(writingSubmissions.map((w) => [w.sectionId, w]));
  const speakingBySection = new Map(speakingSubmissions.filter((s) => s.sectionId).map((s) => [s.sectionId as string, s]));

  const bandsForOverall: number[] = [];
  const breakdown = sections.map((s: any) => {
    if (s.type === "MCQ") {
      const answersInSection = gradedAnswers.filter((a) => questionSectionMap.get(a.questionId) === s.id);
      const correct = answersInSection.filter((a) => a.isCorrect).length;
      return { sectionId: s.id, title: s.title, type: s.type, correct, total: answersInSection.length };
    }
    if (s.type === "READING" || s.type === "LISTENING") {
      const answersInSection = gradedAnswers.filter((a) => questionSectionMap.get(a.questionId) === s.id);
      const correct = answersInSection.filter((a) => a.isCorrect).length;
      const total = answersInSection.length;
      const band = total > 0 ? rawScoreToBand(s.type, correct, total) : null;
      if (band !== null) bandsForOverall.push(band);
      return { sectionId: s.id, title: s.title, type: s.type, correct, total, band };
    }
    if (s.type === "WRITING") {
      const submission = writingBySection.get(s.id);
      const band = submission?.score ?? null;
      if (band !== null) bandsForOverall.push(band);
      return {
        sectionId: s.id,
        title: s.title,
        type: s.type,
        band,
        feedback: submission?.feedback ?? null,
        status: !submission ? "NOT_SUBMITTED" : band !== null ? "GRADED" : "PENDING",
      };
    }
    // SPEAKING
    const speakingSubmission = speakingBySection.get(s.id);
    const speakingBand = speakingSubmission?.overallBand ?? null;
    if (speakingBand !== null) bandsForOverall.push(speakingBand);
    return {
      sectionId: s.id,
      title: s.title,
      type: s.type,
      band: speakingBand,
      feedback: speakingSubmission?.aiFeedback ?? null,
      status: !speakingSubmission ? "NOT_SUBMITTED" : speakingSubmission.status === "GRADED" ? "GRADED" : "PENDING",
    };
  });

  const overallBand =
    bandsForOverall.length > 0
      ? Math.round((bandsForOverall.reduce((sum, b) => sum + b, 0) / bandsForOverall.length) * 2) / 2
      : null;

  return { sections: breakdown, overallBand };
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

    const writingSubmissions = await mockTestRepository.findWritingSubmissionsByAttempt(attemptId);
    const speakingSubmissions = await mockTestRepository.findSpeakingSubmissionsByAttempt(attemptId);
    const { sections: sectionBreakdown, overallBand } = buildSectionBreakdown(test, gradedAnswers, writingSubmissions, speakingSubmissions);

    // Anti-cheating snapshots only matter for a later staff review of a
    // suspicious (flagged) attempt. For every normal attempt, delete them
    // right away (disk + DB) so they never pile up as dead weight -- they
    // did their job just by existing during the test.
    if (!(attempt as any).flagged && (attempt as any).proctoringSnapshotUrls?.length > 0) {
      for (const relativePath of (attempt as any).proctoringSnapshotUrls as string[]) {
        const cleanRel = relativePath.replace(/^\/+/, "").replace(/^uploads\/+/, "");
        const absolutePath = path.join(process.cwd(), env.storage.localUploadDir, cleanRel);
        fs.unlink(absolutePath, () => {});
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
      sections: sectionBreakdown,
      overallBand,
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

    const test = await this.getById((attempt as any).mockTestId);
    const writingSubmissions = await mockTestRepository.findWritingSubmissionsByAttempt(attemptId);
    const speakingSubmissions = await mockTestRepository.findSpeakingSubmissionsByAttempt(attemptId);
    const gradedAnswers = ((attempt as any).answers ?? []).map((a: any) => ({
      questionId: a.questionId,
      selectedOption: a.selectedOption,
      isCorrect: a.isCorrect,
    }));
    const { sections: sectionBreakdown, overallBand } = buildSectionBreakdown(test, gradedAnswers, writingSubmissions, speakingSubmissions);

    return { ...attempt, sections: sectionBreakdown, overallBand };
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

  async listFlaggedAttempts(opts: { requesterLawFirmId?: string; mockTestId?: string }) {
    return mockTestRepository.findFlaggedAttempts({
      hostLawFirmId: opts.requesterLawFirmId,
      mockTestId: opts.mockTestId,
    });
  },

  async resolveFlaggedAttempt(
    attemptId: string,
    action: "APPROVE" | "DISQUALIFY",
    requesterLawFirmId?: string
  ) {
    const attempt = await mockTestRepository.findAttemptById(attemptId);
    if (!attempt) throw AppError.notFound("Attempt not found");
    if (
      requesterLawFirmId !== undefined &&
      (attempt as any).mockTest?.hostLawFirmId !== requesterLawFirmId
    ) {
      throw AppError.forbidden("You can only review attempts for your own institution.");
    }

    // Delete all captured snapshots from disk immediately after admin decision
    if ((attempt as any).proctoringSnapshotUrls?.length > 0) {
      for (const relativePath of (attempt as any).proctoringSnapshotUrls as string[]) {
        const cleanRel = relativePath.replace(/^\/+/, "").replace(/^uploads\/+/, "");
        const absolutePath = path.join(process.cwd(), env.storage.localUploadDir, cleanRel);
        fs.unlink(absolutePath, () => {});
      }
    }

    return mockTestRepository.resolveFlaggedAttempt(attemptId, action);
  },
};

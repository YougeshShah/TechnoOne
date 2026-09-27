import { AppError } from "../../../common/errors/AppError";
import { mcqRepository } from "../repository/mcq.repository";
import { courseService } from "../../course/service/course.service";
import { CreateMcqInput, UpdateMcqInput, ListMcqQuery } from "../dto/mcq.dto";
import { lawFirmRepository } from "../../lawfirm/repository/lawfirm.repository";

// Case-insensitive, whitespace-trimmed comparison — IELTS itself is
// somewhat lenient on minor formatting, this is the practical baseline.
function normalizeAnswerText(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

// Fields that MUST be stripped before a question ever reaches a student —
// leaking correctOption/explanation before they submit an answer would let
// them just read off the answer key.
function stripAnswerFields<T extends { correctOption?: unknown; explanation?: unknown }>(q: T) {
  const { correctOption, explanation, ...safe } = q as any;
  return safe;
}

export const mcqService = {
  async list(query: ListMcqQuery, studentId: string | null, opts: { studentLawFirmId?: string | null; forLawFirmId?: string; studentExamType?: string | null } = {}) {
    const skip = (query.page - 1) * query.limit;
    const { items, total } = await mcqRepository.findMany({
      courseId: query.courseId,
      subjectId: query.subjectId,
      examType: query.examType as any,
      difficulty: query.difficulty as any,
      studentLawFirmId: opts.studentLawFirmId,
      forLawFirmId: opts.forLawFirmId,
      studentExamType: opts.studentExamType,
      skip,
      take: query.limit,
    });

    // For students, filter out locked (non-subscribed, non-demo) questions
    // entirely rather than showing them greyed-out — and always strip the
    // answer key from whatever remains visible.
    let visibleItems = items;
    if (studentId) {
      const accessChecks = await Promise.all(
        items.map((q: any) => courseService.canAccess(studentId, q.courseId, q.isFreeDemo))
      );
      visibleItems = items.filter((_: any, i: number) => accessChecks[i]).map(stripAnswerFields);
    }

    return {
      items: visibleItems,
      pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
    };
  },

  async getById(id: string, studentId: string | null) {
    const question: any = await mcqRepository.findById(id);
    if (!question) throw AppError.notFound("Question not found");

    if (studentId) {
      const allowed = await courseService.canAccess(studentId, question.courseId, question.isFreeDemo);
      if (!allowed) throw AppError.forbidden("Subscribe to this course to access this question.");
      return stripAnswerFields(question);
    }

    return question;
  },

  async checkAnswer(id: string, selectedOption: string, studentId: string | null) {
    const question: any = await mcqRepository.findById(id);
    if (!question) throw AppError.notFound("Question not found");

    if (studentId) {
      const allowed = await courseService.canAccess(studentId, question.courseId, question.isFreeDemo);
      if (!allowed) throw AppError.forbidden("Subscribe to this course to access this question.");
    }

    const isFreeText = question.answerType === "FILL_BLANK" || question.answerType === "SHORT_ANSWER";
    const isMultiBlank = question.answerType === "MULTI_BLANK";

    let isCorrect: boolean;
    let blankResults: boolean[] | undefined;

    if (isMultiBlank) {
      // selectedOption arrives as the student's answers, pipe-separated in
      // the same order as the blanks appear in the question text.
      const correctBlanks = (question.correctAnswerText ?? "").split("|").map((a: string) => normalizeAnswerText(a));
      const studentBlanks = selectedOption.split("|").map((a: string) => normalizeAnswerText(a));
      const results = correctBlanks.map((correct: string, i: number) => correct === (studentBlanks[i] ?? ""));
      blankResults = results;
      isCorrect = results.every(Boolean);
    } else if (isFreeText) {
      isCorrect = normalizeAnswerText(selectedOption) === normalizeAnswerText(question.correctAnswerText ?? "");
    } else {
      isCorrect = selectedOption === question.correctOption;
    }

    // Track this attempt for the student's progress dashboard — fire this
    // after computing isCorrect but before returning, so practice mode
    // shows up in "My Progress" the same way mock tests do. Errors here
    // are logged but never block the answer response itself.
    if (studentId) {
      await mcqRepository
        .upsertPracticeAttempt(studentId, id, isCorrect, selectedOption ?? null)
        .catch((err: unknown) => console.error("Failed to record practice attempt:", err));
    }

    return {
      isCorrect,
      correctOption: isFreeText || isMultiBlank ? undefined : question.correctOption,
      correctAnswerText: isFreeText || isMultiBlank ? question.correctAnswerText : undefined,
      blankResults,
      explanation: question.explanation,
    };
  },

  async create(input: CreateMcqInput, createdBy: string) {
    const answerType = (input as any).answerType ?? "MCQ";
    const isFreeText = answerType === "FILL_BLANK" || answerType === "SHORT_ANSWER" || answerType === "MULTI_BLANK";

    let optionA = input.optionA;
    let optionB = input.optionB;
    let optionC = input.optionC;
    if (answerType === "TRUE_FALSE_NOT_GIVEN") {
      optionA = "True";
      optionB = "False";
      optionC = "Not Given";
    } else if (answerType === "YES_NO_NOT_GIVEN") {
      optionA = "Yes";
      optionB = "No";
      optionC = "Not Given";
    }

    return mcqRepository.create({
      question: input.question,
      answerType,
      optionA: isFreeText ? undefined : optionA,
      optionB: isFreeText ? undefined : optionB,
      optionC: isFreeText ? undefined : optionC,
      optionD: isFreeText ? undefined : input.optionD,
      correctOption: isFreeText ? undefined : input.correctOption,
      correctAnswerText: isFreeText ? (input as any).correctAnswerText : undefined,
      explanation: input.explanation,
      examType: input.examType as any,
      difficulty: input.difficulty as any,
      isFreeDemo: input.isFreeDemo,
      sectionType: (input as any).sectionType,
      audioUrl: (input as any).audioUrl || undefined,
      subject: { connect: { id: input.subjectId } },
      course: { connect: { id: input.courseId } },
      createdBy,
    } as any);
  },

  async createInstitution(
    input: {
      question: string;
      answerType?: "MCQ" | "TRUE_FALSE_NOT_GIVEN" | "YES_NO_NOT_GIVEN" | "FILL_BLANK" | "SHORT_ANSWER" | "MULTI_BLANK";
      optionA?: string;
      optionB?: string;
      optionC?: string;
      optionD?: string;
      correctOption?: "A" | "B" | "C" | "D";
      correctAnswerText?: string;
      explanation?: string;
      subjectId: string;
      courseId: string;
      isFreeDemo: boolean;
      sectionType?: "LISTENING" | "READING" | "WRITING" | "SPEAKING";
      audioUrl?: string;
    },
    createdBy: string,
    hostLawFirmId: string
  ) {
    const firm = await lawFirmRepository.findById(hostLawFirmId);
    const allowed = (firm as any)?.allowedCourseIds ?? [];
    if (allowed.length > 0 && !allowed.includes(input.courseId)) {
      throw AppError.forbidden("Your institution doesn't have Sector Access to this course.");
    }
    if (input.sectionType === "WRITING" || input.sectionType === "SPEAKING") {
      throw AppError.badRequest(
        input.sectionType === "WRITING"
          ? "Writing prompts aren't multiple-choice questions — publish them from the Notes tab instead."
          : "Speaking is practiced live, not through multiple-choice questions — schedule a Live Class instead."
      );
    }

    const answerType = input.answerType ?? "MCQ";
    const isFreeText = answerType === "FILL_BLANK" || answerType === "SHORT_ANSWER" || answerType === "MULTI_BLANK";

    if (isFreeText && !input.correctAnswerText?.trim()) {
      throw AppError.badRequest("Provide the expected answer text.");
    }
    if (!isFreeText && (!input.optionA || !input.optionB || !input.correctOption)) {
      throw AppError.badRequest("Provide at least two options and mark the correct one.");
    }

    // True/False/Not Given and Yes/No/Not Given reuse the plain MCQ select-one
    // UI — the three fixed labels are filled in here rather than typed by
    // the institution each time, so the labels are always consistent.
    let optionA = input.optionA;
    let optionB = input.optionB;
    let optionC = input.optionC;
    if (answerType === "TRUE_FALSE_NOT_GIVEN") {
      optionA = "True";
      optionB = "False";
      optionC = "Not Given";
    } else if (answerType === "YES_NO_NOT_GIVEN") {
      optionA = "Yes";
      optionB = "No";
      optionC = "Not Given";
    }

    return mcqRepository.create({
      question: input.question,
      answerType,
      optionA: isFreeText ? undefined : optionA,
      optionB: isFreeText ? undefined : optionB,
      optionC: isFreeText ? undefined : optionC,
      optionD: isFreeText ? undefined : input.optionD,
      correctOption: isFreeText ? undefined : input.correctOption,
      correctAnswerText: isFreeText ? input.correctAnswerText : undefined,
      explanation: input.explanation,
      difficulty: "MEDIUM",
      isFreeDemo: input.isFreeDemo,
      sectionType: input.sectionType,
      audioUrl: input.audioUrl || undefined,
      subject: { connect: { id: input.subjectId } },
      course: { connect: { id: input.courseId } },
      createdBy,
      hostLawFirm: { connect: { id: hostLawFirmId } },
    } as any);
  },

  async update(id: string, input: UpdateMcqInput, requesterLawFirmId?: string) {
    const existing = await this.getById(id, null);
    if (requesterLawFirmId !== undefined && (existing as any).hostLawFirmId !== requesterLawFirmId) {
      throw AppError.forbidden("You can only edit your own institution's questions.");
    }
    const { subjectId, courseId, ...rest } = input;
    return mcqRepository.update(id, {
      ...rest,
      ...(subjectId ? { subject: { connect: { id: subjectId } } } : {}),
      ...(courseId ? { course: { connect: { id: courseId } } } : {}),
    } as any);
  },

  async remove(id: string, requesterLawFirmId?: string) {
    const existing = await this.getById(id, null);
    if (requesterLawFirmId !== undefined && (existing as any).hostLawFirmId !== requesterLawFirmId) {
      throw AppError.forbidden("You can only delete your own institution's questions.");
    }
    await mcqRepository.delete(id);
  },

  // Combines wrong answers from both Practice (McqPracticeAttempt) and
  // Mock Tests (TestAnswer) into one deduplicated review list — the most
  // recent result per question decides whether it still counts as a
  // "mistake" (if they've since gotten it right, it drops off the list).
  async myMistakes(studentId: string, courseId?: string) {
    return mcqRepository.findWrongQuestionsForStudent(studentId, courseId);
  },
};

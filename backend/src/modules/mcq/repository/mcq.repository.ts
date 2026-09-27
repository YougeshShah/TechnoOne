import { prisma } from "../../../database/prisma";
import { Prisma, ExamType, Difficulty } from "@prisma/client";

export const mcqRepository = {
  async findMany(params: {
    courseId?: string;
    subjectId?: string;
    examType?: ExamType;
    difficulty?: Difficulty;
    studentLawFirmId?: string | null;
    forLawFirmId?: string;
    studentExamType?: string | null;
    skip: number;
    take: number;
  }) {
    const where: Prisma.McqQuestionWhereInput = {
      ...(params.courseId ? { courseId: params.courseId } : {}),
      ...(params.subjectId ? { subjectId: params.subjectId } : {}),
      ...(params.examType ? { examType: params.examType } : {}),
      ...(params.difficulty ? { difficulty: params.difficulty } : {}),
      // Both scoping rules below can independently need an OR clause — a
      // single where object can only have one top-level "OR" key, so when
      // both apply they're combined via AND to avoid one silently
      // overwriting the other.
      AND: [
        params.forLawFirmId
          ? { hostLawFirmId: params.forLawFirmId } // Institution staff view — only their own questions
          : params.studentLawFirmId !== undefined
          ? { OR: [{ hostLawFirmId: null }, { hostLawFirmId: params.studentLawFirmId }] } // Student view
          : {},
        // A student preparing for a specific level (e.g. Kharidar) should see
        // general questions (no level tag) PLUS their own level's questions —
        // never another level's, even within the same course/subject.
        params.studentExamType ? { OR: [{ examType: null }, { examType: params.studentExamType as any }] } : {},
      ],
    };

    const [items, total] = await Promise.all([
      prisma.mcqQuestion.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { createdAt: "desc" },
        include: { subject: true },
      }),
      prisma.mcqQuestion.count({ where }),
    ]);

    return { items, total };
  },

  findById(id: string) {
    return prisma.mcqQuestion.findUnique({ where: { id }, include: { subject: true } });
  },

  create(data: Prisma.McqQuestionCreateInput) {
    return prisma.mcqQuestion.create({ data });
  },

  update(id: string, data: Prisma.McqQuestionUpdateInput) {
    return prisma.mcqQuestion.update({ where: { id }, data });
  },

  delete(id: string) {
    return prisma.mcqQuestion.delete({ where: { id } });
  },

  /**
   * Random selection of N questions for a mock test — pulls matching
   * question ids and shuffles in JS. Fine at MVP scale (hundreds to low
   * thousands of questions per course); if the question bank grows much
   * larger, this is the one place to revisit for a database-level random
   * sample instead.
   */
  async findRandom(params: { courseId: string; subjectId?: string; examType?: ExamType; count: number }) {
    const where: Prisma.McqQuestionWhereInput = {
      courseId: params.courseId,
      ...(params.subjectId ? { subjectId: params.subjectId } : {}),
      ...(params.examType ? { examType: params.examType } : {}),
    };
    const all = await prisma.mcqQuestion.findMany({ where, select: { id: true } });
    const shuffled = all.sort(() => Math.random() - 0.5).slice(0, params.count);
    return shuffled.map((q: { id: string }) => q.id);
  },

  upsertPracticeAttempt(studentId: string, questionId: string, isCorrect: boolean, selectedOption: string | null) {
    return prisma.mcqPracticeAttempt.upsert({
      where: { studentId_questionId: { studentId, questionId } },
      update: { isCorrect, selectedOption, answeredAt: new Date() },
      create: { studentId, questionId, isCorrect, selectedOption },
    });
  },

  // Returns each wrong question together with the student's own most recent
  // selected answer (from whichever source -- practice or a mock test -- is
  // more recent), so the review screen can show "your answer" alongside the
  // correct one instead of just the answer key.
  async findWrongQuestionsForStudent(studentId: string, courseId?: string) {
    const [practiceMisses, testMisses] = await Promise.all([
      prisma.mcqPracticeAttempt.findMany({
        where: { studentId, isCorrect: false },
        select: { questionId: true, selectedOption: true, answeredAt: true },
      }),
      prisma.testAnswer.findMany({
        where: { isCorrect: false, attempt: { studentId } },
        select: { questionId: true, selectedOption: true, attempt: { select: { submittedAt: true, startedAt: true } } },
      }),
    ]);

    const latestAnswerByQuestion = new Map<string, { selectedOption: string | null; at: Date }>();
    for (const m of practiceMisses) {
      const at = m.answeredAt;
      const existing = latestAnswerByQuestion.get(m.questionId);
      if (!existing || at > existing.at) {
        latestAnswerByQuestion.set(m.questionId, { selectedOption: m.selectedOption, at });
      }
    }
    for (const m of testMisses) {
      const at = m.attempt.submittedAt ?? m.attempt.startedAt;
      const existing = latestAnswerByQuestion.get(m.questionId);
      if (!existing || at > existing.at) {
        latestAnswerByQuestion.set(m.questionId, { selectedOption: m.selectedOption, at });
      }
    }

    const questionIds = Array.from(latestAnswerByQuestion.keys());
    if (questionIds.length === 0) return [];

    const questions = await prisma.mcqQuestion.findMany({
      where: { id: { in: questionIds }, ...(courseId ? { courseId } : {}) },
      include: { subject: true },
      orderBy: { createdAt: "desc" },
    });

    return questions.map((q) => ({ ...q, studentAnswer: latestAnswerByQuestion.get(q.id)?.selectedOption ?? null }));
  },
};

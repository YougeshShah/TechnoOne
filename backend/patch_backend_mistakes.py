import sys, os

# Run this from the backend/ root directory.

# ---------- 1. prisma/schema.prisma ----------
schema_path = 'prisma/schema.prisma'
with open(schema_path, 'r', encoding='utf-8') as f:
    schema = f.read()

old_schema = '''model McqPracticeAttempt {
  id         String   @id @default(uuid())
  studentId  String
  questionId String
  isCorrect  Boolean
  answeredAt DateTime @default(now())

  @@unique([studentId, questionId])
  @@index([studentId])
}'''

new_schema = '''model McqPracticeAttempt {
  id             String   @id @default(uuid())
  studentId      String
  questionId     String
  isCorrect      Boolean
  // The option/text the student actually chose -- lets "Review Mistakes"
  // show what they answered, not just the answer key. Nullable because
  // rows created before this field existed have no value.
  selectedOption String?
  answeredAt     DateTime @default(now())

  @@unique([studentId, questionId])
  @@index([studentId])
}'''

c = schema.count(old_schema)
print(f'schema.prisma anchor count = {c}')
if c != 1:
    print('ERROR: aborting (schema.prisma).')
    sys.exit(1)
schema = schema.replace(old_schema, new_schema)
with open(schema_path, 'w', encoding='utf-8') as f:
    f.write(schema)

# ---------- 2. mcq.repository.ts ----------
repo_path = 'src/modules/mcq/repository/mcq.repository.ts'
with open(repo_path, 'r', encoding='utf-8') as f:
    repo = f.read()

old_repo = '''  upsertPracticeAttempt(studentId: string, questionId: string, isCorrect: boolean) {
    return prisma.mcqPracticeAttempt.upsert({
      where: { studentId_questionId: { studentId, questionId } },
      update: { isCorrect, answeredAt: new Date() },
      create: { studentId, questionId, isCorrect },
    });
  },

  async findWrongQuestionsForStudent(studentId: string, courseId?: string) {
    const [practiceMisses, testMisses] = await Promise.all([
      prisma.mcqPracticeAttempt.findMany({
        where: { studentId, isCorrect: false },
        select: { questionId: true },
      }),
      prisma.testAnswer.findMany({
        where: { isCorrect: false, attempt: { studentId } },
        select: { questionId: true },
      }),
    ]);

    const questionIds = Array.from(new Set([...practiceMisses.map((m) => m.questionId), ...testMisses.map((m) => m.questionId)]));
    if (questionIds.length === 0) return [];

    return prisma.mcqQuestion.findMany({
      where: { id: { in: questionIds }, ...(courseId ? { courseId } : {}) },
      include: { subject: true },
      orderBy: { createdAt: "desc" },
    });
  },
};'''

new_repo = '''  upsertPracticeAttempt(studentId: string, questionId: string, isCorrect: boolean, selectedOption: string | null) {
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
};'''

c = repo.count(old_repo)
print(f'mcq.repository.ts anchor count = {c}')
if c != 1:
    print('ERROR: aborting (mcq.repository.ts).')
    sys.exit(1)
repo = repo.replace(old_repo, new_repo)
with open(repo_path, 'w', encoding='utf-8') as f:
    f.write(repo)

# ---------- 3. mcq.service.ts ----------
svc_path = 'src/modules/mcq/service/mcq.service.ts'
with open(svc_path, 'r', encoding='utf-8') as f:
    svc = f.read()

old_svc = '''    if (studentId) {
      await mcqRepository
        .upsertPracticeAttempt(studentId, id, isCorrect)
        .catch((err: unknown) => console.error("Failed to record practice attempt:", err));
    }'''

new_svc = '''    if (studentId) {
      await mcqRepository
        .upsertPracticeAttempt(studentId, id, isCorrect, selectedOption ?? null)
        .catch((err: unknown) => console.error("Failed to record practice attempt:", err));
    }'''

c = svc.count(old_svc)
print(f'mcq.service.ts anchor count = {c}')
if c != 1:
    print('ERROR: aborting (mcq.service.ts).')
    sys.exit(1)
svc = svc.replace(old_svc, new_svc)
with open(svc_path, 'w', encoding='utf-8') as f:
    f.write(svc)

print('All 3 backend files patched successfully.')

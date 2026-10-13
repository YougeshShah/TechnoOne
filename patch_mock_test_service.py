import sys

path = 'src/modules/mock-test/service/mock-test.service.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old = '''  async getAttemptResult(attemptId: string, studentId: string) {
    const attempt = await mockTestRepository.findAttemptById(attemptId);
    if (!attempt) throw AppError.notFound("Attempt not found");
    if (attempt.studentId !== studentId) throw AppError.forbidden("This is not your attempt");
    if (!attempt.submittedAt) throw AppError.badRequest("This attempt has not been submitted yet");
    return attempt;
  },
};'''

new = '''  async getAttemptResult(attemptId: string, studentId: string) {
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
};'''

c = content.count(old)
print(f'anchor count = {c}')
if c != 1:
    print('ERROR: aborting.')
    sys.exit(1)
content = content.replace(old, new)
with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Patched src/modules/mock-test/service/mock-test.service.ts')

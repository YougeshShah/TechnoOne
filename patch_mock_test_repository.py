import sys

path = 'src/modules/mock-test/repository/mock-test.repository.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old = '''  submitAttempt(attemptId: string, score: number) {
    return prisma.testAttempt.update({
      where: { id: attemptId },
      data: { submittedAt: new Date(), score },
    });
  },
};'''

new = '''  submitAttempt(attemptId: string, score: number) {
    return prisma.testAttempt.update({
      where: { id: attemptId },
      data: { submittedAt: new Date(), score },
    });
  },

  // --- Anti-cheating (proctoring) ---

  addProctoringSnapshot(attemptId: string, relativePath: string) {
    return prisma.testAttempt.update({
      where: { id: attemptId },
      data: { proctoringSnapshotUrls: { push: relativePath } },
    });
  },

  // Auto-flags the attempt once the student has left the test screen (app
  // backgrounded, or navigated away) more than a few times -- a cheap
  // signal for a future staff review queue, without needing to watch every
  // single attempt.
  async recordViolation(attemptId: string) {
    const APP_LEFT_FLAG_THRESHOLD = 3;
    const attempt = await prisma.testAttempt.update({
      where: { id: attemptId },
      data: { appLeftCount: { increment: 1 } },
    });
    if (attempt.appLeftCount >= APP_LEFT_FLAG_THRESHOLD && !attempt.flagged) {
      return prisma.testAttempt.update({ where: { id: attemptId }, data: { flagged: true } });
    }
    return attempt;
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
print('Patched src/modules/mock-test/repository/mock-test.repository.ts')

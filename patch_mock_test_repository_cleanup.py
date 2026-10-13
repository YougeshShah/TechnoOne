import sys

path = 'src/modules/mock-test/repository/mock-test.repository.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old = '''  async recordViolation(attemptId: string) {
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

new = '''  async recordViolation(attemptId: string) {
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

  // Called right after a normal (non-flagged) submit -- the snapshots have
  // served their purpose (periodic check passed, nothing suspicious), so
  // there's no reason to keep the DB references around any longer.
  clearProctoringSnapshots(attemptId: string) {
    return prisma.testAttempt.update({
      where: { id: attemptId },
      data: { proctoringSnapshotUrls: [] },
    });
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
print('Patched src/modules/mock-test/repository/mock-test.repository.ts (added clearProctoringSnapshots)')

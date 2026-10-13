import sys

# Run this from backend/ root directory.

path = 'prisma/schema.prisma'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old1 = '''model TestAttempt {
  id             String    @id @default(uuid())
  studentId      String // User.id (accountType STUDENT)
  student        User      @relation("StudentTestAttempts", fields: [studentId], references: [id])
  mockTestId     String
  mockTest       MockTest  @relation(fields: [mockTestId], references: [id])
  startedAt      DateTime  @default(now())
  submittedAt    DateTime?
  score          Int?
  totalQuestions Int

  answers TestAnswer[]
  writingSubmissions WritingSubmission[]

  @@index([studentId])
  @@index([mockTestId])
}'''

new1 = '''model TestAttempt {
  id             String    @id @default(uuid())
  studentId      String // User.id (accountType STUDENT)
  student        User      @relation("StudentTestAttempts", fields: [studentId], references: [id])
  mockTestId     String
  mockTest       MockTest  @relation(fields: [mockTestId], references: [id])
  startedAt      DateTime  @default(now())
  submittedAt    DateTime?
  score          Int?
  totalQuestions Int

  // Anti-cheating: periodic low-res snapshot paths (never continuous
  // video/audio -- keeps storage tiny) taken every few minutes plus on each
  // app-background/foreground transition, and a running count of how many
  // times the student left the test screen (backgrounded the app) during
  // the attempt. flagged is auto-set once appLeftCount crosses a threshold,
  // for a future staff review queue.
  proctoringSnapshotUrls String[] @default([])
  appLeftCount           Int      @default(0)
  flagged                Boolean  @default(false)

  answers TestAnswer[]
  writingSubmissions WritingSubmission[]

  @@index([studentId])
  @@index([mockTestId])
}'''

c1 = content.count(old1)
print(f'TestAttempt anchor count = {c1}')
if c1 != 1:
    print('ERROR: aborting (TestAttempt).')
    sys.exit(1)
content = content.replace(old1, new1)

old2 = '''  allowedExamTypes String[]     @default([])

  users           User[]'''

new2 = '''  allowedExamTypes String[]     @default([])

  // Whether students at this institution may screenshot/screen-record a
  // Live Class recording during playback. Blocked by default -- an
  // institution must explicitly opt in for their own students.
  allowRecordingScreenshots Boolean @default(false)

  users           User[]'''

c2 = content.count(old2)
print(f'LawFirm anchor count = {c2}')
if c2 != 1:
    print('ERROR: aborting (LawFirm).')
    sys.exit(1)
content = content.replace(old2, new2)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Patched prisma/schema.prisma (proctoring fields + allowRecordingScreenshots)')

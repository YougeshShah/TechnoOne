-- Mock-test proctoring: periodic low-res snapshots + violation counting
-- (student left the test screen / backgrounded the app). Deliberately NOT
-- storing continuous video/audio -- keeps storage tiny (a handful of small
-- JPEGs per attempt instead of hundreds of MB of video).
ALTER TABLE "TestAttempt" ADD COLUMN "proctoringSnapshotUrls" TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE "TestAttempt" ADD COLUMN "appLeftCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "TestAttempt" ADD COLUMN "flagged" BOOLEAN NOT NULL DEFAULT false;

-- Institution-level control for whether students can screenshot/record a
-- Live Class recording during playback. Blocked by default -- an
-- institution must explicitly turn this on for their students.
ALTER TABLE "LawFirm" ADD COLUMN "allowRecordingScreenshots" BOOLEAN NOT NULL DEFAULT false;

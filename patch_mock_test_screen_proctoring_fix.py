import sys

path = "app/mock-test/[id].tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

block = '''

  // --- Anti-cheating (proctoring) ---
  // Blocks screenshots/screen-recording for as long as this screen is
  // mounted. Storage-conscious by design: no video/audio is recorded here,
  // only a periodic low-res snapshot (see below) -- and the backend deletes
  // all of it right after a normal (non-flagged) submit.
  usePreventScreenCapture();
  const [proctoringCameraPermission, requestProctoringCameraPermission] = useCameraPermissions();
  const proctorCameraRef = useRef<CameraView>(null);
  const [writingScores, setWritingScores] = useState<
    { sectionTitle: string; score: number | null; feedback: string | null }[]
  >([]);

  const takeProctoringSnapshot = useCallback(async () => {
    if (!attemptId) return;
    try {
      const photo = await proctorCameraRef.current?.takePictureAsync({ quality: 0.3, skipProcessing: true });
      if (photo?.uri) {
        await mockTestApi.uploadProctoringSnapshot(attemptId, photo.uri);
      }
    } catch {
      // Best-effort only -- a missed snapshot should never block the test.
    }
  }, [attemptId]);

  // Ask for camera permission (silently, no mic needed) once the attempt
  // starts. If the student declines, the test still proceeds normally --
  // proctoring is best-effort and must never block someone from testing.
  useEffect(() => {
    if (attemptId && !proctoringCameraPermission?.granted) {
      requestProctoringCameraPermission();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId]);

  // Periodic snapshot every ~3 minutes while the attempt is in progress.
  useEffect(() => {
    if (!attemptId || result || !proctoringCameraPermission?.granted) return;
    const interval = setInterval(takeProctoringSnapshot, 3 * 60 * 1000);
    return () => clearInterval(interval);
  }, [attemptId, result, proctoringCameraPermission?.granted, takeProctoringSnapshot]);

  // Detect the student leaving the test screen (switching apps, opening
  // another app/tab, locking the phone) -- each one is logged as a
  // violation server-side, and the attempt gets auto-flagged for staff
  // review after 3 of them. Also grabs an extra snapshot on return.
  useEffect(() => {
    if (!attemptId || result) return;
    let lastState: AppStateStatus = AppState.currentState;
    const sub = AppState.addEventListener("change", (nextState) => {
      if (lastState === "active" && nextState !== "active") {
        mockTestApi.recordViolation(attemptId).catch(() => {});
      } else if (lastState !== "active" && nextState === "active") {
        takeProctoringSnapshot();
      }
      lastState = nextState;
    });
    return () => sub.remove();
  }, [attemptId, result, takeProctoringSnapshot]);'''

# 1. Remove the block from its current (too-early) position, right after submitWriting.
old_remove = '''  const submitWriting = useSubmitWriting();''' + block

new_remove = '''  const submitWriting = useSubmitWriting();'''

c1 = content.count(old_remove)
print(f"remove-from-old-spot anchor count = {c1}")
if c1 != 1:
    print("ERROR: aborting (remove step).")
    sys.exit(1)
content = content.replace(old_remove, new_remove)

# 2. Re-insert it right before `const steps = useMemo(...)`, which comes
# after both the attemptId and result useState declarations, so nothing
# inside the block is used before it's declared.
old_insert_anchor = '''  const steps = useMemo(() => (test ? buildSteps(test) : []), [test]);'''

new_insert = block.strip("\n") + '''

  const steps = useMemo(() => (test ? buildSteps(test) : []), [test]);'''

c2 = content.count(old_insert_anchor)
print(f"insert-anchor count = {c2}")
if c2 != 1:
    print("ERROR: aborting (insert step).")
    sys.exit(1)
content = content.replace(old_insert_anchor, new_insert)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("Fixed: moved proctoring block after attemptId/result state declarations")

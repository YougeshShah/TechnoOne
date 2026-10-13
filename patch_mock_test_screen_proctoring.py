import sys

path = "app/mock-test/[id].tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

patches = []

# 1. imports
old1 = '''import { useState, useEffect, useCallback, useMemo } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Alert, Linking } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useMockTestDetail, useStartAttempt, useSubmitAttempt, useSubmitWriting } from "../../src/hooks";
import { resolveMediaUrl } from "../../src/api/client";'''

new1 = '''import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Alert, Linking, AppState, AppStateStatus } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { usePreventScreenCapture } from "expo-screen-capture";
import { useMockTestDetail, useStartAttempt, useSubmitAttempt, useSubmitWriting } from "../../src/hooks";
import { resolveMediaUrl } from "../../src/api/client";
import { mockTestApi } from "../../src/api";'''

patches.append(("imports", old1, new1))

# 2. proctoring hooks/state/effects, right after submitWriting hook is grabbed
old2 = '''  const submitWriting = useSubmitWriting();'''

new2 = '''  const submitWriting = useSubmitWriting();

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

patches.append(("proctoring hooks", old2, new2))

# 3. handleSubmit -- capture writing scores as they come back from the AI grader
old3 = '''  const handleSubmit = useCallback(() => {
    if (!attemptId) return;
    // Submit any pending Writing essays first, then the MCQ-style answers.
    const writingSteps = steps.filter((s): s is Extract<Step, { kind: "writing" }> => s.kind === "writing");
    Promise.all(
      writingSteps
        .filter((s) => essays[s.sectionId]?.trim())
        .map((s) => submitWriting.mutateAsync({ sectionId: s.sectionId, attemptId, essayText: essays[s.sectionId] }))
    ).finally(() => {
      const answerList = steps
        .filter((s): s is Extract<Step, { kind: "question" }> => s.kind === "question")
        .map((s) => ({ questionId: s.questionId, selectedOption: answers[s.questionId] ?? null }));
      submitAttempt.mutate({ attemptId, answers: answerList }, { onSuccess: (data) => setResult(data) });
    });
  }, [attemptId, answers, essays, steps]);'''

new3 = '''  const handleSubmit = useCallback(() => {
    if (!attemptId) return;
    // Submit any pending Writing essays first, then the MCQ-style answers.
    const writingSteps = steps.filter((s): s is Extract<Step, { kind: "writing" }> => s.kind === "writing");
    const pendingWritingSteps = writingSteps.filter((s) => essays[s.sectionId]?.trim());
    Promise.all(
      pendingWritingSteps.map((s) => submitWriting.mutateAsync({ sectionId: s.sectionId, attemptId, essayText: essays[s.sectionId] }))
    )
      .then((submissions) => {
        // The AI grades Writing instantly on submit -- capture whatever
        // score/feedback each submission came back with so the result
        // screen can show it right away.
        setWritingScores(
          submissions.map((sub: any, i: number) => ({
            sectionTitle: pendingWritingSteps[i].sectionTitle,
            score: sub?.score ?? null,
            feedback: sub?.feedback ?? null,
          }))
        );
      })
      .finally(() => {
        const answerList = steps
          .filter((s): s is Extract<Step, { kind: "question" }> => s.kind === "question")
          .map((s) => ({ questionId: s.questionId, selectedOption: answers[s.questionId] ?? null }));
        submitAttempt.mutate({ attemptId, answers: answerList }, { onSuccess: (data) => setResult(data) });
      });
  }, [attemptId, answers, essays, steps]);'''

patches.append(("handleSubmit", old3, new3))

# 4. result screen text -- show real AI writing scores instead of the stale placeholder
old4 = '''        <Text style={styles.resultText}>
          {result.score} / {result.totalQuestions} correct (Writing is graded separately by your instructor)
        </Text>'''

new4 = '''        <Text style={styles.resultText}>
          {result.score} / {result.totalQuestions} correct
        </Text>
        {writingScores.length > 0 && (
          <View style={{ marginTop: 10, width: "100%" }}>
            {writingScores.map((w, i) => (
              <Text key={i} style={styles.resultText}>
                {w.sectionTitle}: {w.score !== null ? `Band ${w.score}` : "Grading unavailable"}
              </Text>
            ))}
          </View>
        )}'''

patches.append(("result screen", old4, new4))

# 5. hidden camera view, mounted right before the timer bar
old5 = '''      <View style={[styles.timerBar, isLowTime && { backgroundColor: "#FEF2F2" }]}>'''

new5 = '''      {proctoringCameraPermission?.granted && (
        <CameraView ref={proctorCameraRef} style={styles.hiddenCamera} facing="front" />
      )}
      <View style={[styles.timerBar, isLowTime && { backgroundColor: "#FEF2F2" }]}>'''

patches.append(("hidden camera", old5, new5))

# 6. hiddenCamera style
old6 = '''const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },'''

new6 = '''const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  hiddenCamera: { position: "absolute", width: 1, height: 1, opacity: 0 },'''

patches.append(("hiddenCamera style", old6, new6))

for name, old, new in patches:
    c = content.count(old)
    print(f"{name} anchor count = {c}")
    if c != 1:
        print(f"ERROR: aborting at '{name}'.")
        sys.exit(1)
    content = content.replace(old, new)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("Patched app/mock-test/[id].tsx (proctoring + AI writing scores on result screen)")

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Alert, Linking, AppState, AppStateStatus } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { usePreventScreenCapture } from "expo-screen-capture";
import { useMockTestDetail, useStartAttempt, useSubmitAttempt, useSubmitWriting } from "../../src/hooks";
import { resolveMediaUrl } from "../../src/api/client";
import { mockTestApi } from "../../src/api";

// Question Bank content embeds the passage/transcript inside each
// question's text (built for the flat Practice screen). When those
// questions get pulled into a sectioned Mock Test, strip that embedded
// passage back out so it isn't shown redundantly inside the question text.
function splitEmbeddedPassage(text: string): { passage: string | null; question: string } {
  const match = text.match(/^(?:Reading Passage|Listening Transcript):\s*"([\s\S]*?)"\s*\n\n([\s\S]*)$/);
  if (match) return { passage: match[1], question: match[2] };
  return { passage: null, question: text };
}

type OptionKey = "A" | "B" | "C" | "D";

// A "step" is one screen the student walks through — either a single
// question (Reading/Listening, any answer type) or a whole Writing/Speaking
// section shown as one step. Falls back to flat MCQ-only steps for older
// mock tests that don't use the sections structure at all.
type Step =
  | { kind: "question"; sectionTitle?: string; questionId: string; question: any }
  | { kind: "writing"; sectionId: string; sectionTitle: string; prompt: string; minWordCount: number | null }
  | { kind: "speaking"; sectionTitle: string; prompt: string };

function buildSteps(test: any): Step[] {
  if (test.sections && test.sections.length > 0) {
    const steps: Step[] = [];
    for (const section of test.sections) {
      if (section.type === "WRITING") {
        steps.push({
          kind: "writing",
          sectionId: section.id,
          sectionTitle: section.title,
          prompt: section.writingPrompt ?? "",
          minWordCount: section.minWordCount ?? null,
        });
      } else if (section.type === "SPEAKING") {
        steps.push({ kind: "speaking", sectionTitle: section.title, prompt: section.writingPrompt ?? "" });
      } else {
        for (const mtq of section.mockTestQuestions ?? []) {
          steps.push({ kind: "question", sectionTitle: section.title, questionId: mtq.questionId, question: mtq.question });
        }
      }
    }
    return steps;
  }
  // Legacy flat mock test — no sections, just a plain question list.
  return (test.questions ?? []).map((q: any) => ({ kind: "question" as const, questionId: q.questionId, question: q.question }));
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export default function MockTestScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: test, isLoading } = useMockTestDetail(id);
  const startAttempt = useStartAttempt();
  const submitAttempt = useSubmitAttempt();
  const submitWriting = useSubmitWriting();

  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<string, string | null>>({});
  const [essays, setEssays] = useState<Record<string, string>>({});
  const [index, setIndex] = useState(0);
  const [result, setResult] = useState<{
    score: number;
    totalQuestions: number;
    percentage: number;
    marksScored?: number;
    totalMarks?: number;
    negativeMarkingApplied?: boolean;
  } | null>(null);

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
  }, [attemptId, result, takeProctoringSnapshot]);

  const steps = useMemo(() => (test ? buildSteps(test) : []), [test]);

  useEffect(() => {
    if (test && !attemptId && !startAttempt.isPending) {
      startAttempt.mutate(id, {
        onSuccess: (data) => {
          setAttemptId(data.attemptId);
          setSecondsLeft(data.durationMinutes * 60);
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [test]);

  const handleSubmit = useCallback(() => {
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
  }, [attemptId, answers, essays, steps]);

  useEffect(() => {
    if (secondsLeft === null || result) return;
    if (secondsLeft <= 0) {
      handleSubmit();
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((s) => (s !== null ? s - 1 : null)), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft, result, handleSubmit]);

  if (isLoading || !test || !attemptId || secondsLeft === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (result) {
    return (
      <View style={styles.center}>
        <Text style={{ fontSize: 32 }}>{result.percentage >= 70 ? "🎉" : "📊"}</Text>
        <Text style={styles.resultTitle}>Test Complete</Text>
        <Text style={styles.resultScore}>{result.percentage}%</Text>
        <Text style={styles.resultText}>
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
        )}
        {result.negativeMarkingApplied && (
          <Text style={[styles.resultText, { marginTop: 4, fontWeight: "700" }]}>
            Marks (with negative marking): {result.marksScored} / {result.totalMarks}
          </Text>
        )}
        <TouchableOpacity style={styles.primaryButton} onPress={() => router.back()}>
          <Text style={styles.primaryButtonText}>Back to Course</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const step = steps[index];
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const isLowTime = secondsLeft < 60;

  const options: { key: OptionKey; text: string }[] =
    step?.kind === "question"
      ? (
          [
            { key: "A" as OptionKey, text: step.question.optionA },
            { key: "B" as OptionKey, text: step.question.optionB },
            { key: "C" as OptionKey, text: step.question.optionC },
            { key: "D" as OptionKey, text: step.question.optionD },
          ] as { key: OptionKey; text: string | null | undefined }[]
        ).filter((o): o is { key: OptionKey; text: string } => !!o.text)
      : [];

  const isFreeTextQuestion = step?.kind === "question" && (step.question.answerType === "FILL_BLANK" || step.question.answerType === "SHORT_ANSWER");
  const isMultiBlankQuestion = step?.kind === "question" && step.question.answerType === "MULTI_BLANK";
  const multiBlankSegments = isMultiBlankQuestion && step?.kind === "question" ? step.question.question.split(/(\{\{\d+\}\})/g) : [];
  const multiBlankCount = multiBlankSegments.filter((s: string) => /^\{\{\d+\}\}$/.test(s)).length;
  const currentMultiBlankAnswers = step?.kind === "question" ? (answers[step.questionId] ?? "").split("|") : [];
  const derivedStepPassage = step?.kind === "question" ? splitEmbeddedPassage(step.question.question).passage : null;

  return (
    <View style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
      {proctoringCameraPermission?.granted && (
        <CameraView ref={proctorCameraRef} style={styles.hiddenCamera} facing="front" />
      )}
      <View style={[styles.timerBar, isLowTime && { backgroundColor: "#FEF2F2" }]}>
        <Text style={styles.timerText}>
          {index + 1} / {steps.length}
          {step && "sectionTitle" in step && step.sectionTitle ? ` — ${step.sectionTitle}` : ""}
        </Text>
        <Text style={[styles.timerText, isLowTime && { color: "#DC2626" }]}>
          {minutes}:{seconds.toString().padStart(2, "0")}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {step?.kind === "question" && (
          <View style={styles.card}>
            {derivedStepPassage && (
              <View style={styles.passagePanel}>
                <Text style={styles.passagePanelLabel}>READING PASSAGE</Text>
                <ScrollView style={{ maxHeight: 180 }} nestedScrollEnabled>
                  <Text style={styles.passagePanelText}>{derivedStepPassage}</Text>
                </ScrollView>
              </View>
            )}
            {step.question.audioUrl && (
              <TouchableOpacity style={styles.audioBar} onPress={() => { const url = resolveMediaUrl(step.question.audioUrl); if (url) Linking.openURL(url); }}>
                <Text style={styles.audioBarText}>🔊 Play Audio</Text>
              </TouchableOpacity>
            )}
            <Text style={styles.questionText}>
              {isMultiBlankQuestion
                ? multiBlankSegments.map((seg: string) => (/^\{\{\d+\}\}$/.test(seg) ? `[__${seg.replace(/\D/g, "")}__]` : seg)).join("")
                : splitEmbeddedPassage(step.question.question).question}
            </Text>

            {isMultiBlankQuestion ? (
              <View>
                {Array.from({ length: multiBlankCount }).map((_, i) => (
                  <View key={i} style={{ marginBottom: 8 }}>
                    <Text style={{ fontSize: 12, color: "#6B7280", marginBottom: 2 }}>Blank {i + 1}</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Your answer..."
                      value={currentMultiBlankAnswers[i] ?? ""}
                      onChangeText={(t) => {
                        const next = [...currentMultiBlankAnswers];
                        while (next.length < multiBlankCount) next.push("");
                        next[i] = t;
                        setAnswers((prev) => ({ ...prev, [step.questionId]: next.join("|") }));
                      }}
                    />
                  </View>
                ))}
              </View>
            ) : isFreeTextQuestion ? (
              <TextInput
                style={styles.textInput}
                placeholder="Type your answer..."
                value={answers[step.questionId] ?? ""}
                onChangeText={(t) => setAnswers((prev) => ({ ...prev, [step.questionId]: t }))}
              />
            ) : (
              options.map((opt) => {
                const isSelected = answers[step.questionId] === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    style={[styles.option, isSelected && styles.optionSelected]}
                    onPress={() => setAnswers((prev) => ({ ...prev, [step.questionId]: opt.key }))}
                  >
                    <View style={[styles.optionCircle, isSelected && { borderColor: "#2563EB" }]}>
                      <Text style={{ fontSize: 12, fontWeight: "700", color: isSelected ? "#2563EB" : "#6B7280" }}>{opt.key}</Text>
                    </View>
                    <Text style={styles.optionText}>{opt.text}</Text>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}

        {step?.kind === "writing" && (
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>WRITING TASK</Text>
            <Text style={styles.questionText}>{step.prompt}</Text>
            {step.minWordCount && (
              <Text style={styles.wordCountHint}>
                Minimum {step.minWordCount} words — you've written {countWords(essays[step.sectionId] ?? "")}
              </Text>
            )}
            <TextInput
              style={styles.essayInput}
              multiline
              textAlignVertical="top"
              placeholder="Write your response here..."
              value={essays[step.sectionId] ?? ""}
              onChangeText={(t) => setEssays((prev) => ({ ...prev, [step.sectionId]: t }))}
            />
          </View>
        )}

        {step?.kind === "speaking" && (
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>SPEAKING — TOPIC CARD</Text>
            <Text style={styles.questionText}>{step.prompt}</Text>
            <Text style={styles.wordCountHint}>
              This is practiced live — check your course's Live Classes for scheduled Speaking sessions.
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          disabled={index === 0}
          onPress={() => setIndex((i) => i - 1)}
          style={[styles.navButton, { opacity: index === 0 ? 0.4 : 1 }]}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={18} color="#2563EB" />
          <Text style={styles.navText}>Previous</Text>
        </TouchableOpacity>
        {index + 1 < steps.length ? (
          <TouchableOpacity style={styles.primaryButtonSmall} onPress={() => setIndex((i) => i + 1)} activeOpacity={0.8}>
            <Text style={styles.primaryButtonText}>Next</Text>
            <Ionicons name="chevron-forward" size={18} color="#fff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.primaryButtonSmall, { backgroundColor: "#F59E0B" }]}
            onPress={() =>
              Alert.alert("Submit Test?", "This can't be undone.", [
                { text: "Cancel", style: "cancel" },
                { text: "Submit", onPress: handleSubmit },
              ])
            }
          >
            <Text style={styles.primaryButtonText}>Submit</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  hiddenCamera: { position: "absolute", width: 1, height: 1, opacity: 0 },
  timerBar: { flexDirection: "row", justifyContent: "space-between", padding: 14, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  timerText: { fontWeight: "700", fontSize: 14, flexShrink: 1 },
  card: { backgroundColor: "#fff", borderRadius: 14, padding: 16, borderWidth: 1, borderColor: "#E5E7EB" },
  sectionLabel: { fontSize: 11, fontWeight: "700", color: "#6B7280", marginBottom: 8, letterSpacing: 0.5 },
  questionText: { fontSize: 16, fontWeight: "600", marginBottom: 14, lineHeight: 22 },
  passagePanel: { backgroundColor: "#F9FAFB", borderRadius: 10, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: "#E5E7EB" },
  passagePanelLabel: { fontSize: 11, fontWeight: "700", color: "#6B7280", marginBottom: 6, letterSpacing: 0.5 },
  passagePanelText: { fontSize: 14, lineHeight: 21, color: "#374151" },
  option: { flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderColor: "#E5E7EB", borderRadius: 10, padding: 12, marginBottom: 8 },
  optionSelected: { borderColor: "#2563EB", backgroundColor: "#EFF6FF" },
  optionCircle: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: "#E5E7EB", justifyContent: "center", alignItems: "center", marginRight: 10 },
  optionText: { flex: 1, fontSize: 14 },
  textInput: { backgroundColor: "#F8FAFC", borderWidth: 1.5, borderColor: "#E5E7EB", borderRadius: 10, padding: 12, fontSize: 15 },
  essayInput: { backgroundColor: "#F8FAFC", borderWidth: 1.5, borderColor: "#E5E7EB", borderRadius: 10, padding: 12, fontSize: 14, minHeight: 220, marginTop: 10 },
  wordCountHint: { fontSize: 12, color: "#6B7280", marginBottom: 4 },
  audioBar: { backgroundColor: "#EFF6FF", borderRadius: 10, padding: 12, marginBottom: 12 },
  audioBarText: { color: "#2563EB", fontWeight: "700" },
  footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderTopWidth: 1, borderTopColor: "#E5E7EB", backgroundColor: "#fff" },
  navButton: { flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, backgroundColor: "#F3F4F6" },
  navText: { color: "#2563EB", fontWeight: "700", marginLeft: 2 },
  primaryButton: { backgroundColor: "#2563EB", borderRadius: 10, paddingVertical: 14, paddingHorizontal: 28, marginTop: 20 },
  primaryButtonSmall: { flexDirection: "row", alignItems: "center", backgroundColor: "#2563EB", borderRadius: 10, paddingVertical: 12, paddingHorizontal: 20, gap: 6 },
  primaryButtonText: { color: "#fff", fontWeight: "700" },
  resultTitle: { fontSize: 20, fontWeight: "700", marginTop: 8 },
  resultScore: { fontSize: 40, fontWeight: "800", color: "#2563EB", marginTop: 8 },
  resultText: { fontSize: 14, color: "#6B7280", marginTop: 4, textAlign: "center", paddingHorizontal: 20 },
});

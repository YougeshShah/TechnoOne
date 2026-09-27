import { useState, useRef, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { CameraView, useCameraPermissions, useMicrophonePermissions } from "expo-camera";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { speakingApi } from "../src/api";

type Phase = "ready" | "requesting-permission" | "prep" | "recording" | "uploading" | "done" | "error";

export default function SpeakingTestScreen() {
  const router = useRouter();
  // Prompt is passed as JSON-stringified params from the list screen --
  // avoids needing a dedicated get-by-id endpoint for this framework pass.
  const params = useLocalSearchParams<{ prompt: string }>();
  const prompt = params.prompt ? JSON.parse(params.prompt) : null;

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();

  const cameraRef = useRef<CameraView>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordSecondsRef = useRef(0);

  const [phase, setPhase] = useState<Phase>("ready");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [gradingResult, setGradingResult] = useState<any>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecordingAndTimer = async (totalSeconds: number) => {
    recordSecondsRef.current = totalSeconds;
    setPhase("recording");
    setSecondsLeft(totalSeconds);

    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          cameraRef.current?.stopRecording();
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    try {
      const video = await cameraRef.current?.recordAsync();
      // recordAsync() resolves once stopRecording() is called (either by
      // the timer above or the manual "End Recording Now" button) -- the
      // moment it resolves, upload immediately, no manual upload step.
      if (video?.uri) {
        setPhase("uploading");
        const submission = await speakingApi.submitRecording(prompt.id, video.uri, recordSecondsRef.current);
        setGradingResult(submission);
        setPhase("done");
      } else {
        throw new Error("No recording produced");
      }
    } catch {
      setErrorMsg("Could not submit your recording. Please try again.");
      setPhase("error");
    }
  };

  const handleStart = async () => {
    if (!prompt) return;
    setPhase("requesting-permission");
    setErrorMsg(null);

    const camResult = cameraPermission?.granted ? cameraPermission : await requestCameraPermission();
    const micResult = micPermission?.granted ? micPermission : await requestMicPermission();

    if (!camResult.granted || !micResult.granted) {
      setErrorMsg("Camera and microphone access are required to take the Speaking test.");
      setPhase("error");
      return;
    }

    // Permission granted -- recording and the timer start together, with
    // no separate manual step, same as the web version.
    if (prompt.prepTimeSeconds && prompt.prepTimeSeconds > 0) {
      setPhase("prep");
      setSecondsLeft(prompt.prepTimeSeconds);
      timerRef.current = setInterval(() => {
        setSecondsLeft((s) => {
          if (s <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            startRecordingAndTimer(prompt.speakTimeSeconds);
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    } else {
      startRecordingAndTimer(prompt.speakTimeSeconds);
    }
  };

  const handleEndEarly = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    cameraRef.current?.stopRecording();
  };

  if (!prompt) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>No question selected. Please go back and choose one.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.promptBox}>
        <Text style={styles.partLabel}>Part {prompt.part}</Text>
        <Text style={styles.title}>{prompt.title}</Text>
        <Text style={styles.promptText}>{prompt.promptText}</Text>
      </View>

      {phase === "ready" && (
        <TouchableOpacity style={styles.startButton} onPress={handleStart}>
          <Ionicons name="mic" size={20} color="#fff" />
          <Text style={styles.startButtonText}>Start Speaking Test</Text>
        </TouchableOpacity>
      )}

      {phase === "requesting-permission" && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.statusText}>Waiting for camera and microphone permission...</Text>
        </View>
      )}

      {(phase === "prep" || phase === "recording") && (
        <View style={{ flex: 1 }}>
          <CameraView ref={cameraRef} style={styles.camera} facing="front" mode="video" />
          <View style={styles.timerBar}>
            <Text style={styles.timerText}>
              {phase === "prep" ? "Preparation time" : "Recording"} — {secondsLeft}s left
            </Text>
          </View>
          {phase === "recording" && (
            <TouchableOpacity style={styles.endButton} onPress={handleEndEarly}>
              <Text style={styles.endButtonText}>End Recording Now</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {phase === "uploading" && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.statusText}>Saving your recording...</Text>
        </View>
      )}

      {phase === "done" && (
        <View style={styles.center}>
          <Ionicons name="checkmark-circle" size={48} color="#16A34A" />
          {gradingResult?.status === "GRADED" ? (
            <>
              <Text style={styles.overallBandText}>Band {gradingResult.overallBand}</Text>
              <View style={styles.scoreRow}>
                <Text style={styles.scoreChip}>Fluency {gradingResult.fluencyScore}</Text>
                <Text style={styles.scoreChip}>Lexical {gradingResult.lexicalScore}</Text>
                <Text style={styles.scoreChip}>Grammar {gradingResult.grammarScore}</Text>
                <Text style={styles.scoreChip}>Pronunciation {gradingResult.pronunciationScore}</Text>
              </View>
              {gradingResult.aiFeedback && <Text style={styles.feedbackText}>{gradingResult.aiFeedback}</Text>}
            </>
          ) : (
            <Text style={styles.statusText}>
              Recording submitted. {gradingResult?.status === "GRADING_FAILED" ? "Automatic grading is unavailable right now -- it'll be reviewed by your instructor." : "It's pending grading."}
            </Text>
          )}
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
      )}

      {phase === "error" && (
        <View style={styles.center}>
          <Text style={styles.errorText}>{errorMsg}</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => setPhase("ready")}>
            <Text style={styles.backButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  promptBox: { backgroundColor: "#fff", margin: 16, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB" },
  partLabel: { fontSize: 12, color: "#2563EB", fontWeight: "700", marginBottom: 4 },
  title: { fontSize: 16, fontWeight: "700", marginBottom: 6 },
  promptText: { fontSize: 14, color: "#374151" },
  startButton: {
    flexDirection: "row",
    backgroundColor: "#2563EB",
    marginHorizontal: 16,
    borderRadius: 10,
    paddingVertical: 14,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  startButtonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  statusText: { marginTop: 12, fontSize: 14, color: "#374151", textAlign: "center" },
  errorText: { fontSize: 14, color: "#DC2626", textAlign: "center", marginBottom: 16 },
  camera: { flex: 1, marginHorizontal: 16, borderRadius: 12, overflow: "hidden" },
  timerBar: { padding: 12, alignItems: "center" },
  timerText: { fontSize: 14, fontWeight: "600", color: "#111827" },
  endButton: { backgroundColor: "#DC2626", marginHorizontal: 16, marginBottom: 16, borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  endButtonText: { color: "#fff", fontWeight: "700" },
  backButton: { backgroundColor: "#2563EB", borderRadius: 10, paddingVertical: 12, paddingHorizontal: 24, marginTop: 8 },
  backButtonText: { color: "#fff", fontWeight: "700" },
  overallBandText: { fontSize: 32, fontWeight: "800", color: "#2563EB", marginTop: 10 },
  scoreRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8, marginTop: 10 },
  scoreChip: { backgroundColor: "#EFF6FF", color: "#1D4ED8", fontWeight: "700", fontSize: 12, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999 },
  feedbackText: { fontSize: 13, color: "#374151", textAlign: "center", marginTop: 14, lineHeight: 19, paddingHorizontal: 8 },
});

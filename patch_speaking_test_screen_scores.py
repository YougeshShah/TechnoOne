import sys

path = "app/speaking-test.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

patches = []

# 1. state for the graded result
old1 = '''  const [phase, setPhase] = useState<Phase>("ready");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);'''

new1 = '''  const [phase, setPhase] = useState<Phase>("ready");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [gradingResult, setGradingResult] = useState<any>(null);'''

patches.append(("state", old1, new1))

# 2. capture the AI-graded result (grading happens synchronously server-side
# during upload, so it's already in the response -- no polling needed)
old2 = '''      if (video?.uri) {
        setPhase("uploading");
        await speakingApi.submitRecording(prompt.id, video.uri, recordSecondsRef.current);
        setPhase("done");
      } else {'''

new2 = '''      if (video?.uri) {
        setPhase("uploading");
        const submission = await speakingApi.submitRecording(prompt.id, video.uri, recordSecondsRef.current);
        setGradingResult(submission);
        setPhase("done");
      } else {'''

patches.append(("capture result", old2, new2))

# 3. "done" screen -- show the real band scores + feedback instead of a
# static "pending grading" message
old3 = '''      {phase === "done" && (
        <View style={styles.center}>
          <Ionicons name="checkmark-circle" size={48} color="#16A34A" />
          <Text style={styles.statusText}>Recording submitted. It's pending grading.</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
      )}'''

new3 = '''      {phase === "done" && (
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
      )}'''

patches.append(("done screen", old3, new3))

# 4. styles for the new score display
old4 = '''  backButton: { backgroundColor: "#2563EB", borderRadius: 10, paddingVertical: 12, paddingHorizontal: 24, marginTop: 8 },
  backButtonText: { color: "#fff", fontWeight: "700" },
});'''

new4 = '''  backButton: { backgroundColor: "#2563EB", borderRadius: 10, paddingVertical: 12, paddingHorizontal: 24, marginTop: 8 },
  backButtonText: { color: "#fff", fontWeight: "700" },
  overallBandText: { fontSize: 32, fontWeight: "800", color: "#2563EB", marginTop: 10 },
  scoreRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8, marginTop: 10 },
  scoreChip: { backgroundColor: "#EFF6FF", color: "#1D4ED8", fontWeight: "700", fontSize: 12, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999 },
  feedbackText: { fontSize: 13, color: "#374151", textAlign: "center", marginTop: 14, lineHeight: 19, paddingHorizontal: 8 },
});'''

patches.append(("styles", old4, new4))

for name, old, new in patches:
    c = content.count(old)
    print(f"{name} anchor count = {c}")
    if c != 1:
        print(f"ERROR: aborting at '{name}'.")
        sys.exit(1)
    content = content.replace(old, new)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("Patched app/speaking-test.tsx (show AI band scores + feedback on done screen)")

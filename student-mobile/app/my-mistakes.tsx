import { useState } from "react";
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMyMistakes, useCourses } from "../src/hooks";

export default function MyMistakesScreen() {
  const [courseId, setCourseId] = useState<string>("");
  const { data: courses } = useCourses();
  const { data: mistakes, isLoading } = useMyMistakes(courseId || undefined);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>Review Mistakes</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
        <TouchableOpacity onPress={() => setCourseId("")} style={[styles.filterChip, !courseId && styles.filterChipActive]}>
          <Text style={[styles.filterChipText, !courseId && styles.filterChipTextActive]}>All Courses</Text>
        </TouchableOpacity>
        {courses?.map((c) => (
          <TouchableOpacity key={c.id} onPress={() => setCourseId(c.id)} style={[styles.filterChip, courseId === c.id && styles.filterChipActive]}>
            <Text style={[styles.filterChipText, courseId === c.id && styles.filterChipTextActive]}>{c.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isLoading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      )}

      {!isLoading && mistakes?.length === 0 && (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No mistakes to review yet — keep practicing!</Text>
        </View>
      )}

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        {mistakes?.map((q) => (
          <View key={q.id} style={styles.card}>
            {q.subject?.name && <Text style={styles.subjectTag}>{q.subject.name}</Text>}
            <Text style={styles.questionText}>{q.question}</Text>

            {q.answerType !== "FILL_BLANK" && q.answerType !== "SHORT_ANSWER" && q.answerType !== "MULTI_BLANK" &&
              (["A", "B", "C", "D"] as const).map((key) => {
                const optionText = (q as any)[`option${key}`];
                if (!optionText) return null;
                const isCorrect = q.correctOption === key;
                const isYourWrongPick = (q as any).studentAnswer === key && !isCorrect;
                return (
                  <View
                    key={key}
                    style={[styles.optionRow, isCorrect && styles.optionRowCorrect, isYourWrongPick && styles.optionRowWrong]}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        isCorrect && styles.optionTextCorrect,
                        isYourWrongPick && styles.optionTextWrong,
                      ]}
                    >
                      {key}. {optionText} {isCorrect ? "✓" : ""} {isYourWrongPick ? "✗ Your answer" : ""}
                    </Text>
                  </View>
                );
              })}

            {(q.answerType === "FILL_BLANK" || q.answerType === "SHORT_ANSWER" || q.answerType === "MULTI_BLANK") &&
              (q as any).studentAnswer && <Text style={styles.yourAnswerText}>Your answer: {(q as any).studentAnswer}</Text>}

            {q.correctAnswerText && <Text style={styles.correctAnswerText}>Correct answer: {q.correctAnswerText}</Text>}

            {q.explanation && (
              <Text style={styles.explanationText}>
                <Text style={{ fontWeight: "700" }}>Why: </Text>
                {q.explanation}
              </Text>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  header: { flexDirection: "row", alignItems: "center", padding: 16, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  backButton: { marginRight: 8 },
  title: { fontSize: 18, fontWeight: "700" },
  filterRow: { maxHeight: 52, backgroundColor: "#fff" },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: "#F3F4F6", justifyContent: "center", marginVertical: 8 },
  filterChipActive: { backgroundColor: "#2563EB" },
  filterChipText: { fontSize: 13, color: "#374151", fontWeight: "600" },
  filterChipTextActive: { color: "#fff" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
  emptyText: { color: "#6B7280", textAlign: "center", fontSize: 15 },
  card: { backgroundColor: "#fff", borderRadius: 12, padding: 16, borderWidth: 1, borderColor: "#E5E7EB" },
  subjectTag: { fontSize: 11, fontWeight: "700", color: "#6B7280", marginBottom: 8, textTransform: "uppercase" },
  questionText: { fontSize: 15, fontWeight: "600", marginBottom: 12, lineHeight: 21 },
  optionRow: { padding: 10, borderRadius: 8, borderWidth: 1, borderColor: "#E5E7EB", marginBottom: 8 },
  optionRowCorrect: { borderColor: "#16A34A", backgroundColor: "#F0FDF4" },
  optionRowWrong: { borderColor: "#DC2626", backgroundColor: "#FEF2F2" },
  optionText: { fontSize: 14 },
  optionTextCorrect: { fontWeight: "700", color: "#166534" },
  optionTextWrong: { fontWeight: "700", color: "#991B1B" },
  yourAnswerText: { fontSize: 14, fontWeight: "700", color: "#DC2626", marginBottom: 4 },
  correctAnswerText: { fontSize: 14, fontWeight: "700", color: "#16A34A", marginTop: 4, marginBottom: 8 },
  explanationText: { fontSize: 13, color: "#6B7280", paddingTop: 10, borderTopWidth: 1, borderTopColor: "#F3F4F6", lineHeight: 19 },
});

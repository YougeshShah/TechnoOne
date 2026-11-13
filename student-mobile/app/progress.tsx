import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { progressApi } from "../src/api";

function scoreColor(percent: number): string {
  if (percent >= 75) return "#059669";
  if (percent >= 50) return "#D97706";
  return "#DC2626";
}

function StatCard({ icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: color + "1A" }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function QuestionReviewItem({ index, question, selectedOption, isCorrect }: { index: number; question: any; selectedOption: string | null; isCorrect: boolean | null }) {
  const options = [
    { key: "A", text: question?.optionA },
    { key: "B", text: question?.optionB },
    { key: "C", text: question?.optionC },
    { key: "D", text: question?.optionD },
  ].filter((o) => !!o.text);

  return (
    <View style={styles.reviewCard}>
      <Text style={styles.reviewQuestion}>{index + 1}. {question?.question}</Text>
      {options.map((opt) => {
        const isUser = selectedOption === opt.key;
        const isRight = question?.correctOption === opt.key;
        let bg = "#fff";
        let border = "#E5E7EB";
        if (isRight) {
          bg = "#ECFDF5";
          border = "#10B981";
        } else if (isUser && !isRight) {
          bg = "#FEF2F2";
          border = "#EF4444";
        }
        return (
          <View key={opt.key} style={[styles.reviewOption, { backgroundColor: bg, borderColor: border }]}>
            <Text style={{ fontSize: 13, fontWeight: isRight || isUser ? "700" : "400", color: "#111827", flex: 1 }}>
              {opt.key}. {opt.text}
            </Text>
            {isUser && (
              <Text style={{ fontSize: 11, fontWeight: "700", color: isRight ? "#059669" : "#DC2626" }}>
                {isRight ? "✓ Your Answer" : "✗ Your Answer"}
              </Text>
            )}
            {!isUser && isRight && (
              <Text style={{ fontSize: 11, fontWeight: "700", color: "#059669" }}>✓ Correct</Text>
            )}
          </View>
        );
      })}
      {question?.explanation ? (
        <View style={styles.explanationBox}>
          <Text style={styles.explanationTitle}>EXPLANATION</Text>
          <Text style={styles.explanationText}>{question.explanation}</Text>
        </View>
      ) : null}
    </View>
  );
}

export default function ProgressScreen() {
  const { data: analytics, isLoading: loadingAnalytics } = useQuery({
    queryKey: ["study-analytics"],
    queryFn: () => progressApi.getAnalytics(),
  });
  const { data: attempts, isLoading: loadingAttempts } = useQuery({
    queryKey: ["my-test-attempts"],
    queryFn: () => progressApi.myAttempts(),
  });
  const { data: practiceItems, isLoading: loadingPractice } = useQuery({
    queryKey: ["practice-history"],
    queryFn: () => progressApi.getPracticeHistory(),
  });

  const [tab, setTab] = useState<"mock" | "practice">("mock");
  const [attemptDetail, setAttemptDetail] = useState<any | null>(null);
  const [selectedPracticeDate, setSelectedPracticeDate] = useState<string | null>(null);

  const practiceByDate = useMemo(() => {
    const groups = new Map<string, any[]>();
    for (const item of practiceItems ?? []) {
      const list = groups.get(item.dateKey) ?? [];
      list.push(item);
      groups.set(item.dateKey, list);
    }
    return Array.from(groups.entries()).map(([dateKey, items]) => {
      const correct = items.filter((i) => i.isCorrect).length;
      return {
        dateKey,
        items,
        total: items.length,
        correct,
        accuracy: items.length > 0 ? Math.round((correct / items.length) * 100) : 0,
      };
    });
  }, [practiceItems]);

  const activePracticeGroup = practiceByDate.find((g) => g.dateKey === selectedPracticeDate) ?? null;

  const openMockReview = async (id: string) => {
    try {
      const detail = await progressApi.getAttemptDetail(id);
      setAttemptDetail(detail);
    } catch {
      // ignore
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.title}>My Progress & History</Text>

      {loadingAnalytics ? (
        <ActivityIndicator color="#2563EB" style={{ marginVertical: 20 }} />
      ) : (
        <View style={styles.statsGrid}>
          <StatCard icon="document-text-outline" label="Tests Taken" value={analytics?.testsTaken ?? 0} color="#2563EB" />
          <StatCard icon="trending-up-outline" label="Avg Score" value={`${analytics?.averageScorePercent ?? 0}%`} color="#059669" />
          <StatCard icon="help-circle-outline" label="Practice Qs" value={analytics?.practiceQuestionsAnswered ?? 0} color="#D97706" />
          <StatCard icon="checkmark-circle-outline" label="Accuracy" value={`${analytics?.practiceAccuracyPercent ?? 0}%`} color="#7C3AED" />
        </View>
      )}

      <View style={styles.tabRow}>
        <TouchableOpacity style={[styles.tabBtn, tab === "mock" && styles.tabBtnActive]} onPress={() => setTab("mock")}>
          <Text style={[styles.tabBtnText, tab === "mock" && styles.tabBtnTextActive]}>Mock Tests ({(attempts ?? []).length})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, tab === "practice" && styles.tabBtnActive]} onPress={() => setTab("practice")}>
          <Text style={[styles.tabBtnText, tab === "practice" && styles.tabBtnTextActive]}>Daily Practice ({practiceByDate.length})</Text>
        </TouchableOpacity>
      </View>

      {tab === "mock" ? (
        loadingAttempts ? (
          <ActivityIndicator color="#2563EB" style={{ marginTop: 20 }} />
        ) : (
          (attempts ?? []).map((item) => {
            const percent = item.submittedAt && item.totalQuestions && item.score != null ? Math.round((item.score / item.totalQuestions) * 100) : null;
            return (
              <TouchableOpacity
                key={item.id}
                style={styles.attemptRow}
                disabled={!item.submittedAt}
                onPress={() => item.submittedAt && openMockReview(item.id)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.attemptTitle}>{item.mockTest.title}</Text>
                  <Text style={styles.attemptDate}>{new Date(item.startedAt).toLocaleString()} • Tap to review answers</Text>
                  {item.flagged && (
                    <Text style={{ fontSize: 10, color: "#DC2626", fontWeight: "700", marginTop: 2 }}>
                      ⚠️ Flagged ({item.appLeftCount ?? 2} warnings)
                    </Text>
                  )}
                </View>
                {item.submittedAt ? (
                  <View style={styles.attemptScoreCol}>
                    <Text style={[styles.attemptScore, { color: percent !== null ? scoreColor(percent) : "#111827" }]}>
                      {item.score}/{item.totalQuestions}
                    </Text>
                    <View style={styles.completedBadge}>
                      <Text style={styles.completedBadgeText}>Review Answers</Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.inProgressBadge}>
                    <Text style={styles.inProgressBadgeText}>Incomplete</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })
        )
      ) : loadingPractice ? (
        <ActivityIndicator color="#2563EB" style={{ marginTop: 20 }} />
      ) : (
        practiceByDate.map((group) => (
          <TouchableOpacity key={group.dateKey} style={styles.attemptRow} onPress={() => setSelectedPracticeDate(group.dateKey)}>
            <View style={{ flex: 1 }}>
              <Text style={styles.attemptTitle}>Practice — {group.dateKey}</Text>
              <Text style={styles.attemptDate}>{group.total} questions answered • Tap to view solutions</Text>
            </View>
            <View style={styles.attemptScoreCol}>
              <Text style={[styles.attemptScore, { color: scoreColor(group.accuracy) }]}>
                {group.correct}/{group.total} ({group.accuracy}%)
              </Text>
              <View style={styles.completedBadge}>
                <Text style={styles.completedBadgeText}>View Questions</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))
      )}

      {/* Mock Test Review Modal */}
      <Modal visible={!!attemptDetail} animationType="slide" onRequestClose={() => setAttemptDetail(null)}>
        <View style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{attemptDetail?.mockTest?.title ?? "Mock Test Review"}</Text>
            <TouchableOpacity onPress={() => setAttemptDetail(null)} style={styles.closeBtn}>
              <Text style={{ color: "#fff", fontWeight: "700" }}>Close</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16 }}>
            {(attemptDetail?.answers ?? []).map((ans: any, idx: number) => (
              <QuestionReviewItem key={ans.id ?? idx} index={idx} question={ans.question} selectedOption={ans.selectedOption} isCorrect={ans.isCorrect} />
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* Practice Date Review Modal */}
      <Modal visible={!!activePracticeGroup} animationType="slide" onRequestClose={() => setSelectedPracticeDate(null)}>
        <View style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Practice History — {activePracticeGroup?.dateKey}</Text>
            <TouchableOpacity onPress={() => setSelectedPracticeDate(null)} style={styles.closeBtn}>
              <Text style={{ color: "#fff", fontWeight: "700" }}>Close</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16 }}>
            {(activePracticeGroup?.items ?? []).map((item: any, idx: number) => (
              <QuestionReviewItem key={item.id} index={idx} question={item.question} selectedOption={item.selectedOption} isCorrect={item.isCorrect} />
            ))}
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  title: { fontSize: 20, fontWeight: "800", color: "#111827", marginBottom: 16 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 },
  statCard: { width: "47%", backgroundColor: "#fff", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "#E5E7EB" },
  statIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center", marginBottom: 8 },
  statValue: { fontSize: 20, fontWeight: "800", color: "#111827" },
  statLabel: { fontSize: 11, color: "#6B7280", marginTop: 2 },
  tabRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  tabBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: "#E5E7EB", alignItems: "center" },
  tabBtnActive: { backgroundColor: "#2563EB" },
  tabBtnText: { fontSize: 12, fontWeight: "700", color: "#374151" },
  tabBtnTextActive: { color: "#fff" },
  attemptRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB", padding: 14, marginBottom: 10 },
  attemptTitle: { fontSize: 14, fontWeight: "700", color: "#111827" },
  attemptDate: { fontSize: 11, color: "#6B7280", marginTop: 2 },
  attemptScoreCol: { alignItems: "flex-end" },
  attemptScore: { fontSize: 15, fontWeight: "800" },
  completedBadge: { backgroundColor: "#EFF6FF", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginTop: 4 },
  completedBadgeText: { fontSize: 10, fontWeight: "700", color: "#2563EB" },
  inProgressBadge: { backgroundColor: "#F3F4F6", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  inProgressBadgeText: { fontSize: 10, fontWeight: "700", color: "#6B7280" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  modalTitle: { fontSize: 16, fontWeight: "800", color: "#111827", flex: 1 },
  closeBtn: { backgroundColor: "#2563EB", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  reviewCard: { backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: "#E5E7EB" },
  reviewQuestion: { fontSize: 14, fontWeight: "700", color: "#111827", marginBottom: 10 },
  reviewOption: { flexDirection: "row", alignItems: "center", padding: 10, borderRadius: 8, borderWidth: 1.5, marginBottom: 6 },
  explanationBox: { marginTop: 8, padding: 10, backgroundColor: "#F8FAFC", borderRadius: 8, borderLeftWidth: 3, borderLeftColor: "#2563EB" },
  explanationTitle: { fontSize: 10, fontWeight: "800", color: "#2563EB", marginBottom: 2 },
  explanationText: { fontSize: 12, color: "#4B5563" },
});

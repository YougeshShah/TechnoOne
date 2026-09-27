import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Linking, Alert } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSubjects, useMySubscriptions, useMockTests, useLiveClasses, useJoinLiveClass, useCourses, useAmountDue } from "../../src/hooks";

export default function CourseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: subjects, isLoading } = useSubjects(id);
  const { data: subscriptions } = useMySubscriptions();
  const { data: mockTests } = useMockTests(id);
  const { data: liveClasses } = useLiveClasses(id);
  const joinLiveClass = useJoinLiveClass();
  const { data: courses } = useCourses();
  const course = courses?.find((c) => c.id === id);
  const { data: amountDueData } = useAmountDue(id);

  const handleJoinClass = (classId: string) => {
    joinLiveClass.mutate(classId, {
      onSuccess: (data) => Linking.openURL(data.meetingUrl),
    });
  };

  const isSubscribed = (subscriptions ?? []).some((s) => s.courseId === id && (s.status === "ACTIVE" || s.status === "TRIAL"));
  const isLanguageCourse = (subscriptions ?? []).some((s: any) => s.courseId === id && s.course?.category === "LANGUAGE");

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
      {!isSubscribed && (
        <TouchableOpacity
          style={styles.banner}
          onPress={() => {
            if (!amountDueData?.amountDue) {
              Alert.alert("Fee not set", "This course's fee has not been configured yet. Please contact your institution/admin.");
              return;
            }
            router.push({
              pathname: "/payment/course",
              params: { courseId: id, amount: String(amountDueData.amountDue), courseName: course?.name ?? "" },
            });
          }}
        >
          <Text style={styles.bannerText}>🔓 Free demo content — tap here to subscribe for full access.</Text>
        </TouchableOpacity>
      )}

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* Quick actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickAction} onPress={() => router.push(`/library/${id}`)}>
            <Ionicons name="library-outline" size={22} color="#2563EB" />
            <Text style={styles.quickActionLabel}>Library</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickAction} onPress={() => router.push(`/course-content/${id}`)}>
            <Ionicons name="document-text-outline" size={22} color="#2563EB" />
            <Text style={styles.quickActionLabel}>Content</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickAction} onPress={() => router.push("/my-notes")}>
            <Ionicons name="create-outline" size={22} color="#2563EB" />
            <Text style={styles.quickActionLabel}>My Notes</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickAction} onPress={() => router.push(`/flashcards?courseId=${id}`)}>
            <Ionicons name="albums-outline" size={22} color="#2563EB" />
            <Text style={styles.quickActionLabel}>Flashcards</Text>
          </TouchableOpacity>
          {isLanguageCourse && (
            <TouchableOpacity style={styles.quickAction} onPress={() => router.push(`/speaking/${id}`)}>
              <Ionicons name="mic-outline" size={22} color="#2563EB" />
              <Text style={styles.quickActionLabel}>Speaking</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.sectionTitle}>Practice by Subject</Text>
        {(subjects ?? []).map((item) => (
          <TouchableOpacity key={item.id} style={styles.subjectCard} onPress={() => router.push(`/practice/${id}?subjectId=${item.id}`)}>
            <Text style={styles.subjectName}>{item.name}</Text>
            <Text style={styles.subjectCta}>Practice →</Text>
          </TouchableOpacity>
        ))}
        {(subjects ?? []).length === 0 && <Text style={{ color: "#6B7280", marginBottom: 8 }}>No subjects added yet.</Text>}

        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Mock Tests</Text>
        {(mockTests ?? []).map((test) => {
          const locked = !isSubscribed && !test.isFreeDemo;
          return (
            <TouchableOpacity
              key={test.id}
              style={styles.subjectCard}
              disabled={locked}
              onPress={() => router.push(`/mock-test/${test.id}`)}
            >
              <View>
                <Text style={styles.subjectName}>{test.title}</Text>
                <Text style={styles.metaText}>
                  {test.durationMinutes} min · {test._count?.questions ?? 0} questions
                  {!!test.negativeMarkingPercent && ` · ⚠️ ${test.negativeMarkingPercent}% negative marking`}
                </Text>
              </View>
              {locked ? <Ionicons name="lock-closed-outline" size={18} color="#9CA3AF" /> : <Text style={styles.subjectCta}>Start →</Text>}
            </TouchableOpacity>
          );
        })}
        {(mockTests ?? []).length === 0 && <Text style={{ color: "#6B7280", marginBottom: 8 }}>No mock tests published yet.</Text>}

        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Live Classes</Text>
        {(liveClasses ?? []).map((cls) => (
          <TouchableOpacity key={cls.id} style={styles.subjectCard} onPress={() => handleJoinClass(cls.id)}>
            <View>
              <Text style={styles.subjectName}>{cls.title}</Text>
              <Text style={styles.metaText}>{new Date(cls.scheduledAt).toLocaleString()}</Text>
            </View>
            <Text style={styles.subjectCta}>Join →</Text>
          </TouchableOpacity>
        ))}
        {(liveClasses ?? []).length === 0 && <Text style={{ color: "#6B7280" }}>No live classes scheduled.</Text>}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  banner: { backgroundColor: "#FFFBEB", padding: 12, borderBottomWidth: 1, borderBottomColor: "#FDE68A" },
  bannerText: { fontSize: 12, color: "#92400E" },
  quickActions: { flexDirection: "row", marginBottom: 20 },
  quickAction: { alignItems: "center", backgroundColor: "#fff", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "#E5E7EB", width: 90 },
  quickActionLabel: { fontSize: 12, fontWeight: "600", marginTop: 6 },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 12 },
  subjectCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  subjectName: { fontSize: 15, fontWeight: "600" },
  subjectCta: { color: "#2563EB", fontWeight: "700", fontSize: 13 },
  metaText: { fontSize: 12, color: "#6B7280", marginTop: 2 },
});

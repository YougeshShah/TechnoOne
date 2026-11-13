import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCases, useTodayHearings, useUpcomingHearings } from "../../src/hooks/useDomainData";
import { institutionStudentApi } from "../../src/api/institutionStudent.api";
import { liveClassApi } from "../../src/api/liveClass.api";
import { proctoringReviewApi } from "../../src/api/proctoringReview.api";
import { useTranslation } from "../../src/i18n/LanguageContext";
import { useAuthStore } from "../../src/store/authStore";
import { Card } from "../../src/components/Card";
import { StatusBadge } from "../../src/components/StatusBadge";
import { colors, spacing } from "../../src/theme/theme";

export default function DashboardScreen() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const isEducation = user?.tenantType === "EDUCATION";

  return isEducation ? <InstitutionDashboard /> : <LawFirmDashboard />;
}

// ---------------------------------------------------------------------
// Institution (EDUCATION tenant) dashboard -- students & live classes,
// not cases/hearings which don't apply to this tenant type at all.
// ---------------------------------------------------------------------
function InstitutionDashboard() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const { data: allStudents } = useQuery({ queryKey: ["dash-students-all"], queryFn: () => institutionStudentApi.list() });
  const { data: pendingStudents } = useQuery({
    queryKey: ["dash-students-pending"],
    queryFn: () => institutionStudentApi.list("PENDING_VERIFICATION"),
  });
  const { data: liveClasses } = useQuery({ queryKey: ["dash-live-classes"], queryFn: () => liveClassApi.myClasses() });
  const { data: flaggedAttempts } = useQuery({ queryKey: ["mobile-flagged-attempts"], queryFn: () => proctoringReviewApi.listFlaggedAttempts() });

  const todayClasses = (liveClasses ?? []).filter((c) => {
    const d = new Date(c.scheduledAt);
    const now = new Date();
    return d.toDateString() === now.toDateString() && c.status !== "CANCELLED";
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries();
    setRefreshing(false);
  }, [queryClient]);

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <Text style={styles.greeting}>{t("welcomeBack")}</Text>
      <Text style={styles.name}>{user?.fullName}</Text>
      {user?.tenantName && (
        <View style={styles.firmBadge}>
          <Text style={styles.firmBadgeText}>{user.tenantName}</Text>
        </View>
      )}

      <View style={styles.statsRow}>
        <TouchableOpacity style={{ flex: 1 }} onPress={() => router.push("/students")}>
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>{allStudents?.length ?? "—"}</Text>
            <Text style={styles.statLabel}>Total Students</Text>
          </Card>
        </TouchableOpacity>
        <TouchableOpacity style={{ flex: 1 }} onPress={() => router.push("/students")}>
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>{pendingStudents?.length ?? "—"}</Text>
            <Text style={styles.statLabel}>Pending Approval</Text>
          </Card>
        </TouchableOpacity>
        <TouchableOpacity style={{ flex: 1 }} onPress={() => router.push("/live-classes")}>
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>{todayClasses.length}</Text>
            <Text style={styles.statLabel}>Today</Text>
          </Card>
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={() => router.push("/flagged-attempts" as any)} style={{ marginBottom: spacing.md }}>
        <Card style={{ borderColor: (flaggedAttempts?.length ?? 0) > 0 ? "#FECACA" : "#E5E7EB", borderWidth: 1, backgroundColor: (flaggedAttempts?.length ?? 0) > 0 ? "#FEF2F2" : "#fff" }}>
          <View style={styles.hearingRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.hearingTitle, { color: (flaggedAttempts?.length ?? 0) > 0 ? "#DC2626" : colors.textPrimary }]}>
                ⚠️ Flagged Mock Test Attempts ({flaggedAttempts?.length ?? 0})
              </Text>
              <Text style={styles.hearingSub}>
                Tap to inspect proctoring camera snapshots & approve or disqualify
              </Text>
            </View>
          </View>
        </Card>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Today's Live Classes</Text>
      {todayClasses.length === 0 && (
        <Card style={{ marginBottom: spacing.md }}>
          <Text style={styles.emptyText}>No live classes scheduled today.</Text>
        </Card>
      )}
      {todayClasses.map((c) => (
        <TouchableOpacity key={c.id} onPress={() => router.push("/live-classes")}>
          <Card style={{ marginBottom: spacing.sm }}>
            <View style={styles.hearingRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.hearingTitle}>{c.title}</Text>
                <Text style={styles.hearingSub}>
                  {c.course?.name ?? "—"} — {new Date(c.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </Text>
              </View>
              <StatusBadge status={c.status} />
            </View>
          </Card>
        </TouchableOpacity>
      ))}

      <Text style={styles.sectionTitle}>Pending Student Approvals</Text>
      {(!pendingStudents || pendingStudents.length === 0) && (
        <Card style={{ marginBottom: spacing.md }}>
          <Text style={styles.emptyText}>No students waiting for approval.</Text>
        </Card>
      )}
      {pendingStudents?.slice(0, 5).map((s) => (
        <TouchableOpacity key={s.id} onPress={() => router.push("/students")}>
          <Card style={{ marginBottom: spacing.sm }}>
            <View style={styles.hearingRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.hearingTitle}>{s.fullName}</Text>
                <Text style={styles.hearingSub}>{s.email}</Text>
              </View>
              <StatusBadge status={s.status} />
            </View>
          </Card>
        </TouchableOpacity>
      ))}

      <View style={{ height: spacing.xl }} />
    </ScrollView>
  );
}

// ---------------------------------------------------------------------
// Law firm dashboard -- unchanged behavior from before this fix.
// ---------------------------------------------------------------------
function LawFirmDashboard() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const { data: allCases } = useCases();
  const { data: openCases } = useCases({ status: "OPEN" });
  const { data: todayHearings } = useTodayHearings();
  const { data: upcomingHearings } = useUpcomingHearings();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries();
    setRefreshing(false);
  }, [queryClient]);

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <Text style={styles.greeting}>{t('welcomeBack')}</Text>
      <Text style={styles.name}>{user?.fullName}</Text>
      {user?.tenantName && (
        <View style={styles.firmBadge}>
          <Text style={styles.firmBadgeText}>{user.tenantName}</Text>
        </View>
      )}

      <View style={styles.statsRow}>
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>{allCases?.pagination.total ?? "—"}</Text>
          <Text style={styles.statLabel}>{t("totalCases")}</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>{openCases?.pagination.total ?? "—"}</Text>
          <Text style={styles.statLabel}>{t("openCases")}</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>{todayHearings?.length ?? "—"}</Text>
          <Text style={styles.statLabel}>Today</Text>
        </Card>
      </View>

      <Text style={styles.sectionTitle}>{t("todaysHearings")}</Text>
      {(!todayHearings || todayHearings.length === 0) && (
        <Card style={{ marginBottom: spacing.md }}>
          <Text style={styles.emptyText}>{t("noHearingsToday")}</Text>
        </Card>
      )}
      {todayHearings?.map((h) => (
        <TouchableOpacity key={h.id} onPress={() => router.push(`/case/${h.case.id}`)}>
          <Card style={{ marginBottom: spacing.sm }}>
            <View style={styles.hearingRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.hearingTitle}>{h.case.caseTitle}</Text>
                <Text style={styles.hearingSub}>
                  {h.case.caseNumber} — {new Date(h.hearingDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </Text>
              </View>
              <StatusBadge status={h.status} />
            </View>
          </Card>
        </TouchableOpacity>
      ))}

      <Text style={styles.sectionTitle}>{t("upcomingHearings")}</Text>
      {(!upcomingHearings || upcomingHearings.length === 0) && (
        <Card style={{ marginBottom: spacing.md }}>
          <Text style={styles.emptyText}>{t("noUpcomingHearings")}</Text>
        </Card>
      )}
      {upcomingHearings?.slice(0, 5).map((h) => (
        <TouchableOpacity key={h.id} onPress={() => router.push(`/case/${h.case.id}`)}>
          <Card style={{ marginBottom: spacing.sm }}>
            <View style={styles.hearingRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.hearingTitle}>{h.case.caseTitle}</Text>
                <Text style={styles.hearingSub}>
                  {h.case.caseNumber} — {new Date(h.hearingDate).toLocaleDateString()}
                </Text>
              </View>
              <StatusBadge status={h.status} />
            </View>
          </Card>
        </TouchableOpacity>
      ))}

      <View style={{ height: spacing.xl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.md },
  greeting: { fontSize: 14, color: colors.textSecondary },
  name: { fontSize: 22, fontWeight: "800", color: colors.textPrimary },
  firmBadge: { alignSelf: "flex-start", backgroundColor: colors.surface, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginTop: 6, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  firmBadgeText: { fontSize: 12, fontWeight: "600", color: colors.primary },
  statsRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.lg },
  statCard: { flex: 1, alignItems: "center", paddingVertical: spacing.md },
  statValue: { fontSize: 22, fontWeight: "800", color: colors.primary },
  statLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: spacing.sm, marginTop: spacing.sm },
  hearingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  hearingTitle: { fontSize: 14, fontWeight: "700", color: colors.textPrimary },
  hearingSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  emptyText: { fontSize: 13, color: colors.textSecondary },
});

import { useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Switch, Modal, FlatList, Alert, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DateTimePicker from "@react-native-community/datetimepicker";
import { liveClassApi, CourseOption } from "../src/api/liveClass.api";
import { colors, spacing, radius } from "../src/theme/theme";

export default function ScheduleLiveClassScreen() {
  const qc = useQueryClient();
  const { data: courses } = useQuery({ queryKey: ["institution-courses"], queryFn: () => liveClassApi.courses() });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [course, setCourse] = useState<CourseOption | null>(null);
  const [coursePickerOpen, setCoursePickerOpen] = useState(false);
  const [scheduledAt, setScheduledAt] = useState<Date>(new Date(Date.now() + 60 * 60 * 1000));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [durationMinutes, setDurationMinutes] = useState("60");
  const [isFreeDemo, setIsFreeDemo] = useState(false);

  const create = useMutation({
    mutationFn: () =>
      liveClassApi.create({
        title: title.trim(),
        description: description.trim() || undefined,
        courseId: course!.id,
        scheduledAt: scheduledAt.toISOString(),
        durationMinutes: Number(durationMinutes) || 60,
        isFreeDemo,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-live-classes"] });
      router.back();
    },
    onError: (err: any) => {
      Alert.alert("Error", err?.response?.data?.message || "Could not schedule this class.");
    },
  });

  const handleSubmit = () => {
    if (!title.trim()) {
      Alert.alert("Title required", "Please enter a title for this class.");
      return;
    }
    if (!course) {
      Alert.alert("Course required", "Please select which course this class is for.");
      return;
    }
    create.mutate();
  };

  const onDateChange = (_: any, selected?: Date) => {
    setShowDatePicker(Platform.OS === "ios");
    if (selected) {
      const next = new Date(scheduledAt);
      next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
      setScheduledAt(next);
    }
  };

  const onTimeChange = (_: any, selected?: Date) => {
    setShowTimePicker(Platform.OS === "ios");
    if (selected) {
      const next = new Date(scheduledAt);
      next.setHours(selected.getHours(), selected.getMinutes());
      setScheduledAt(next);
    }
  };

  return (
    <>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Schedule Live Class</Text>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Title</Text>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="e.g. IELTS Writing Task 2 — Live Session" />

        <Text style={styles.label}>Description (optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="What will this class cover?"
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />

        <Text style={styles.label}>Course</Text>
        <TouchableOpacity style={styles.dropdown} onPress={() => setCoursePickerOpen(true)}>
          <Text style={course ? styles.dropdownText : styles.dropdownPlaceholder}>{course ? course.name : "Select a course"}</Text>
          <Ionicons name="chevron-down" size={18} color="#6B7280" />
        </TouchableOpacity>

        <Text style={styles.label}>Date</Text>
        <TouchableOpacity style={styles.dropdown} onPress={() => setShowDatePicker(true)}>
          <Text style={styles.dropdownText}>{scheduledAt.toLocaleDateString()}</Text>
          <Ionicons name="calendar-outline" size={18} color="#6B7280" />
        </TouchableOpacity>

        <Text style={styles.label}>Time</Text>
        <TouchableOpacity style={styles.dropdown} onPress={() => setShowTimePicker(true)}>
          <Text style={styles.dropdownText}>
            {scheduledAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </Text>
          <Ionicons name="time-outline" size={18} color="#6B7280" />
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker value={scheduledAt} mode="date" display="default" onChange={onDateChange} minimumDate={new Date()} />
        )}
        {showTimePicker && <DateTimePicker value={scheduledAt} mode="time" display="default" onChange={onTimeChange} />}

        <Text style={styles.label}>Duration (minutes)</Text>
        <TextInput style={styles.input} value={durationMinutes} onChangeText={setDurationMinutes} keyboardType="number-pad" />

        <View style={styles.switchRow}>
          <Text style={styles.label}>Free demo class (open to non-subscribers)</Text>
          <Switch value={isFreeDemo} onValueChange={setIsFreeDemo} trackColor={{ true: colors.primary }} />
        </View>

        <TouchableOpacity
          style={[styles.submitButton, create.isPending && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={create.isPending}
        >
          <Text style={styles.submitButtonText}>{create.isPending ? "Scheduling..." : "Schedule Class"}</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={coursePickerOpen} transparent animationType="slide" onRequestClose={() => setCoursePickerOpen(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setCoursePickerOpen(false)}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Select Course</Text>
            <FlatList
              data={courses ?? []}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    setCourse(item);
                    setCoursePickerOpen(false);
                  }}
                >
                  <Text style={styles.modalItemText}>{item.name}</Text>
                  {course?.id === item.id && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={styles.emptyText}>No courses available.</Text>}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", padding: spacing.md, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  backButton: { marginRight: 8 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  container: { flex: 1, backgroundColor: "#fff" },
  label: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: spacing.xs, marginTop: spacing.sm },
  input: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: radius.md, padding: spacing.sm, fontSize: 14 },
  textArea: { minHeight: 80 },
  dropdown: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  dropdownText: { fontSize: 14, color: "#111827" },
  dropdownPlaceholder: { fontSize: 14, color: "#9CA3AF" },
  switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: spacing.lg, gap: spacing.sm },
  submitButton: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 14, alignItems: "center", marginTop: spacing.xl },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: "#fff", borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, maxHeight: "70%" },
  modalTitle: { fontSize: 16, fontWeight: "700", marginBottom: spacing.md },
  modalItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  modalItemText: { fontSize: 15, color: "#111827" },
  emptyText: { textAlign: "center", color: "#6B7280", paddingVertical: 20 },
});

import sys

# Run this from the portal-mobile/ root directory.

path = 'app/live-classes.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old1 = '''import { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation } from "@tanstack/react-query";
import { liveClassApi } from "../src/api/liveClass.api";
import { colors, spacing, radius } from "../src/theme/theme";

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: "#2563EB",
  LIVE: "#DC2626",
  ENDED: "#6B7280",
  CANCELLED: "#9CA3AF",
};

export default function LiveClassesScreen() {
  const { data: classes, isLoading } = useQuery({ queryKey: ["my-live-classes"], queryFn: () => liveClassApi.myClasses() });

  const joinAsHost = useMutation({
    mutationFn: (id: string) => liveClassApi.joinAsHost(id),
    onSuccess: (data) => Linking.openURL(data.meetingUrl),
    onError: () => Alert.alert("Error", "Could not join this class. It may not be assigned to you."),
  });

  return (
    <View style={styles.container}>
      {isLoading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}'''

new1 = '''import { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { liveClassApi } from "../src/api/liveClass.api";
import { useAuthStore } from "../src/store/authStore";
import { colors, spacing, radius } from "../src/theme/theme";

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: "#2563EB",
  LIVE: "#DC2626",
  ENDED: "#6B7280",
  CANCELLED: "#9CA3AF",
};

export default function LiveClassesScreen() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  // Scheduling is Company/institution-admin only on the backend
  // (authorize("COMPANY", "LAW_FIRM_ADMIN") on POST /live-classes) --
  // lawyers/staff/teachers can only view and host classes assigned to them.
  const canManage = user?.accountType === "LAW_FIRM_ADMIN";
  const { data: classes, isLoading } = useQuery({ queryKey: ["my-live-classes"], queryFn: () => liveClassApi.myClasses() });

  const joinAsHost = useMutation({
    mutationFn: (id: string) => liveClassApi.joinAsHost(id),
    onSuccess: (data) => Linking.openURL(data.meetingUrl),
    onError: () => Alert.alert("Error", "Could not join this class. It may not be assigned to you."),
  });

  const cancelClass = useMutation({
    mutationFn: (id: string) => liveClassApi.cancel(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-live-classes"] }),
    onError: () => Alert.alert("Error", "Could not cancel this class."),
  });

  return (
    <View style={styles.container}>
      {canManage && (
        <TouchableOpacity style={styles.scheduleButton} onPress={() => router.push("/schedule-live-class")}>
          <Ionicons name="add-circle" size={18} color="#fff" />
          <Text style={styles.scheduleButtonText}>Schedule Class</Text>
        </TouchableOpacity>
      )}

      {isLoading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}'''

c1 = content.count(old1)
print(f'header/imports anchor count = {c1}')
if c1 != 1:
    print('ERROR: aborting (header/imports block).')
    sys.exit(1)
content = content.replace(old1, new1)

old2 = '''            {(item.status === "SCHEDULED" || item.status === "LIVE") && (
              <TouchableOpacity
                style={styles.joinButton}
                onPress={() => joinAsHost.mutate(item.id)}
                disabled={joinAsHost.isPending}
              >
                <Ionicons name="videocam" size={16} color="#fff" />
                <Text style={styles.joinButtonText}>{joinAsHost.isPending ? "Joining..." : "Start / Join"}</Text>
              </TouchableOpacity>
            )}'''

new2 = '''            {(item.status === "SCHEDULED" || item.status === "LIVE") && (
              <TouchableOpacity
                style={styles.joinButton}
                onPress={() => joinAsHost.mutate(item.id)}
                disabled={joinAsHost.isPending}
              >
                <Ionicons name="videocam" size={16} color="#fff" />
                <Text style={styles.joinButtonText}>{joinAsHost.isPending ? "Joining..." : "Start / Join"}</Text>
              </TouchableOpacity>
            )}

            {canManage && item.status === "SCHEDULED" && (
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() =>
                  Alert.alert("Cancel class?", "Students will no longer be able to join this class.", [
                    { text: "No", style: "cancel" },
                    { text: "Yes, cancel", style: "destructive", onPress: () => cancelClass.mutate(item.id) },
                  ])
                }
              >
                <Text style={styles.cancelButtonText}>Cancel Class</Text>
              </TouchableOpacity>
            )}'''

c2 = content.count(old2)
print(f'join-button anchor count = {c2}')
if c2 != 1:
    print('ERROR: aborting (join-button block).')
    sys.exit(1)
content = content.replace(old2, new2)

old3 = '''const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },'''

new3 = '''const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scheduleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.primary,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: radius.md,
    paddingVertical: 12,
  },
  scheduleButtonText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  cancelButton: { alignItems: "center", marginTop: 8 },
  cancelButtonText: { color: "#DC2626", fontWeight: "600", fontSize: 13 },'''

c3 = content.count(old3)
print(f'styles anchor count = {c3}')
if c3 != 1:
    print('ERROR: aborting (styles block).')
    sys.exit(1)
content = content.replace(old3, new3)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Patched app/live-classes.tsx')

import sys

path = "app/live-classes.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

patches = []

old1 = '''import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueries } from "@tanstack/react-query";
import { liveClassApi, LiveClassItem } from "../src/api/liveClass.api";
import { useMySubscriptions } from "../src/hooks";'''

new1 = '''import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueries } from "@tanstack/react-query";
import { liveClassApi, LiveClassItem } from "../src/api/liveClass.api";
import { useMySubscriptions } from "../src/hooks";'''

patches.append(("imports", old1, new1))

old2 = '''export default function LiveClassesScreen() {
  const { data: subscriptions, isLoading: loadingSubs } = useMySubscriptions();'''

new2 = '''export default function LiveClassesScreen() {
  const router = useRouter();
  const { data: subscriptions, isLoading: loadingSubs } = useMySubscriptions();'''

patches.append(("router hook", old2, new2))

# Play recordings inside the app (not via Linking.openURL, which hands the
# video off to an external browser/player where our screenshot block can't
# reach) so the anti-cheat screenshot block on the recording actually works.
old3 = '''            {item.status === "ENDED" && item.recordingUrl && (
              <TouchableOpacity style={styles.recordingButton} onPress={() => Linking.openURL(item.recordingUrl as string)}>
                <Ionicons name="play-circle-outline" size={16} color="#2563EB" />
                <Text style={styles.recordingButtonText}>Watch Recording</Text>
              </TouchableOpacity>
            )}'''

new3 = '''            {item.status === "ENDED" && item.recordingUrl && (
              <TouchableOpacity
                style={styles.recordingButton}
                onPress={() =>
                  router.push({ pathname: "/recording-player", params: { url: item.recordingUrl as string, title: item.title } })
                }
              >
                <Ionicons name="play-circle-outline" size={16} color="#2563EB" />
                <Text style={styles.recordingButtonText}>Watch Recording</Text>
              </TouchableOpacity>
            )}'''

patches.append(("recording button", old3, new3))

for name, old, new in patches:
    c = content.count(old)
    print(f"{name} anchor count = {c}")
    if c != 1:
        print(f"ERROR: aborting at '{name}'.")
        sys.exit(1)
    content = content.replace(old, new)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("Patched app/live-classes.tsx (recordings now open in-app for screenshot blocking)")

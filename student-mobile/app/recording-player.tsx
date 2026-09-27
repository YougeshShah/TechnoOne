import { useEffect } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import * as ScreenCapture from "expo-screen-capture";
import { useMyProfile } from "../src/hooks";
import { resolveMediaUrl } from "../src/api/client";

// Class recordings are played inside the app (not handed off to an
// external browser/player) specifically so screenshot/screen-recording can
// be blocked while watching -- that protection only works for screens
// rendered inside this app, not for content opened in another app.
export default function RecordingPlayerScreen() {
  const { url, title } = useLocalSearchParams<{ url: string; title?: string }>();
  const resolvedUrl = resolveMediaUrl(url) ?? url;

  const { data: profile, isLoading: loadingProfile } = useMyProfile();
  // Default to blocked while the institution's setting is still loading,
  // and for students with no institution (self-registered) -- screenshots
  // are only allowed when a law firm/institution has explicitly turned
  // this on for their students.
  const screenshotsAllowed = (profile as any)?.lawFirm?.allowRecordingScreenshots === true;

  useEffect(() => {
    if (screenshotsAllowed) return;
    ScreenCapture.preventScreenCaptureAsync();
    return () => {
      ScreenCapture.allowScreenCaptureAsync();
    };
  }, [screenshotsAllowed]);

  const player = useVideoPlayer(resolvedUrl, (p) => {
    p.play();
  });

  if (loadingProfile) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      <VideoView player={player} style={styles.video} allowsPictureInPicture nativeControls />
      {!screenshotsAllowed && (
        <Text style={styles.notice}>Screenshots and screen recording are disabled for this class recording.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#000" },
  title: { color: "#fff", fontSize: 15, fontWeight: "700", padding: 16 },
  video: { flex: 1, backgroundColor: "#000" },
  notice: { color: "#9CA3AF", fontSize: 11, textAlign: "center", padding: 10 },
});

import sys

# Run this from the portal-mobile/ root directory.

path = 'app/_layout.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old1 = '''import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { useAuthStore } from "../src/store/authStore";
import { registerForPushNotifications } from "../src/utils/pushNotifications";
import { LanguageProvider } from "../src/i18n/LanguageContext";'''

new1 = '''import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useAuthStore } from "../src/store/authStore";
import { registerForPushNotifications } from "../src/utils/pushNotifications";
import { LanguageProvider } from "../src/i18n/LanguageContext";'''

c1 = content.count(old1)
print(f'imports anchor count = {c1}')
if c1 != 1:
    print('ERROR: aborting (imports).')
    sys.exit(1)
content = content.replace(old1, new1)

old2 = '''export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <AuthGate>
          <StatusBar style="light" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="case/[id]" options={{ headerShown: true, title: "Case Details" }} />
            <Stack.Screen name="case/create" options={{ headerShown: true, title: "New Case", presentation: "modal" }} />
            <Stack.Screen name="hearing/create" options={{ headerShown: true, title: "Schedule Hearing", presentation: "modal" }} />
            <Stack.Screen name="edit-profile" options={{ headerShown: true, title: "Edit Profile", presentation: "modal" }} />
            <Stack.Screen name="client/create" options={{ headerShown: true, title: "Add Client", presentation: "modal" }} />
            <Stack.Screen name="library" options={{ headerShown: true, title: "Legal Library" }} />
            <Stack.Screen name="live-classes" options={{ headerShown: true, title: "Live Classes" }} />
            <Stack.Screen name="document/generate" options={{ headerShown: true, title: "Generate Document", presentation: "modal" }} />
          </Stack>
        </AuthGate>
      </LanguageProvider>
    </QueryClientProvider>
  );
}'''

new2 = '''export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <AuthGate>
            <StatusBar style="light" />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="case/[id]" options={{ headerShown: true, title: "Case Details" }} />
              <Stack.Screen name="case/create" options={{ headerShown: true, title: "New Case", presentation: "modal" }} />
              <Stack.Screen name="hearing/create" options={{ headerShown: true, title: "Schedule Hearing", presentation: "modal" }} />
              <Stack.Screen name="edit-profile" options={{ headerShown: true, title: "Edit Profile", presentation: "modal" }} />
              <Stack.Screen name="client/create" options={{ headerShown: true, title: "Add Client", presentation: "modal" }} />
              <Stack.Screen name="library" options={{ headerShown: true, title: "Legal Library" }} />
              <Stack.Screen name="live-classes" options={{ headerShown: true, title: "Live Classes" }} />
              <Stack.Screen name="document/generate" options={{ headerShown: true, title: "Generate Document", presentation: "modal" }} />
            </Stack>
          </AuthGate>
        </LanguageProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}'''

c2 = content.count(old2)
print(f'RootLayout anchor count = {c2}')
if c2 != 1:
    print('ERROR: aborting (RootLayout).')
    sys.exit(1)
content = content.replace(old2, new2)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Patched app/_layout.tsx (added SafeAreaProvider)')

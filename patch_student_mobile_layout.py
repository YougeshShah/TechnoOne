import sys

# Run this from the student-mobile/ root directory.

path = 'app/_layout.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old1 = '''import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { useAuthStore } from "../src/store/authStore";'''

new1 = '''import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useAuthStore } from "../src/store/authStore";'''

c1 = content.count(old1)
print(f'imports anchor count = {c1}')
if c1 != 1:
    print('ERROR: aborting (imports).')
    sys.exit(1)
content = content.replace(old1, new1)

old2 = '''export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthGate>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="course/[id]" options={{ headerShown: true, title: "Course" }} />
          <Stack.Screen name="practice/[courseId]" options={{ headerShown: true, title: "Practice" }} />
          <Stack.Screen name="mock-test/[id]" options={{ headerShown: true, title: "Mock Test" }} />
          <Stack.Screen name="library/[courseId]" options={{ headerShown: true, title: "Library" }} />
          <Stack.Screen name="precedents" options={{ headerShown: true, title: "नजिर खोज" }} />
          <Stack.Screen name="speaking-test" options={{ headerShown: true, title: "Speaking Test" }} />
          <Stack.Screen name="speaking/[courseId]" options={{ headerShown: true, title: "Speaking Practice" }} />
        </Stack>
      </AuthGate>
    </QueryClientProvider>
  );
}'''

new2 = '''export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthGate>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="course/[id]" options={{ headerShown: true, title: "Course" }} />
            <Stack.Screen name="practice/[courseId]" options={{ headerShown: true, title: "Practice" }} />
            <Stack.Screen name="mock-test/[id]" options={{ headerShown: true, title: "Mock Test" }} />
            <Stack.Screen name="library/[courseId]" options={{ headerShown: true, title: "Library" }} />
            <Stack.Screen name="precedents" options={{ headerShown: true, title: "नजिर खोज" }} />
            <Stack.Screen name="speaking-test" options={{ headerShown: true, title: "Speaking Test" }} />
            <Stack.Screen name="speaking/[courseId]" options={{ headerShown: true, title: "Speaking Practice" }} />
          </Stack>
        </AuthGate>
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
print('Patched app/_layout.tsx (student-mobile, added SafeAreaProvider)')

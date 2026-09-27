import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useAuthStore } from "../src/store/authStore";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, hasHydrated } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!hasHydrated) return;
    const inAuthGroup = segments[0] === "(auth)";
    if (!isAuthenticated && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (isAuthenticated && (inAuthGroup || !segments[0])) {
      router.replace("/(tabs)");
    }
  }, [isAuthenticated, hasHydrated, segments]);

  return <>{children}</>;
}

export default function RootLayout() {
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
}

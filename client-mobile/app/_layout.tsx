import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useAuthStore } from "../src/store/authStore";
import { registerForPushNotifications } from "../src/utils/pushNotifications";
import { LanguageProvider } from "../src/i18n/LanguageContext";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

/**
 * Redirects based on auth state once the persisted store has rehydrated
 * from SecureStore. Runs on every route change (segments dependency).
 */
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
      router.replace("/(tabs)/dashboard");
    }
  }, [isAuthenticated, hasHydrated, segments]);

  // Also re-register on app reopen (e.g. after a device restart / token refresh),
  // not just right after login — covers the case where the session was already persisted.
  useEffect(() => {
    if (hasHydrated && isAuthenticated) {
      registerForPushNotifications().catch(() => {});
    }
  }, [hasHydrated, isAuthenticated]);

  return <>{children}</>;
}

export default function RootLayout() {
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
              <Stack.Screen name="edit-profile" options={{ headerShown: true, title: "Edit Profile", presentation: "modal" }} />
            </Stack>
          </AuthGate>
        </LanguageProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

import { useQuery } from "@tanstack/react-query";
import { progressApi } from "../api/progress.api";

export function useStudyAnalytics() {
  return useQuery({ queryKey: ["study-analytics"], queryFn: () => progressApi.getAnalytics() });
}

export function useMyTestAttempts() {
  return useQuery({ queryKey: ["my-test-attempts"], queryFn: () => progressApi.myAttempts() });
}

export function usePracticeHistory() {
  return useQuery({ queryKey: ["practice-history"], queryFn: () => progressApi.getPracticeHistory() });
}

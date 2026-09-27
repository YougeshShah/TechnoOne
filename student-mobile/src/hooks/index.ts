import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authApi, courseApi, subjectApi, mcqApi, mockTestApi, liveClassApi, libraryApi, bookmarkApi, chatbotApi, profileApi, notificationApi, flashcardApi, precedentApi} from "../api";
import { useAuthStore } from "../store/authStore";
import { ChatMessage } from "../types";

export function useLogin() {
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation({
    mutationFn: ({ rememberMe, ...credentials }: { email: string; password: string; rememberMe?: boolean }) =>
      authApi.login(credentials),
    onSuccess: (data, variables) => setSession({ ...data, rememberMe: variables.rememberMe }),
  });
}

export function useRequestPasswordReset() {
  return useMutation({ mutationFn: (email: string) => authApi.requestPasswordReset(email) });
}

export function useRegister() {
  return useMutation({ mutationFn: authApi.register });
}

export function useCourses() {
  return useQuery({ queryKey: ["courses"], queryFn: courseApi.list });
}

export function usePublicCourses() {
  return useQuery({ queryKey: ["public-courses"], queryFn: courseApi.listPublic });
}

export function useMySubscriptions() {
  return useQuery({ queryKey: ["my-subscriptions"], queryFn: courseApi.mySubscriptions });
}

export function useAmountDue(courseId: string) {
  return useQuery({ queryKey: ["amount-due", courseId], queryFn: () => courseApi.amountDue(courseId), enabled: !!courseId });
}

export function useSubjects(courseId: string) {
  return useQuery({ queryKey: ["subjects", courseId], queryFn: () => subjectApi.list(courseId), enabled: !!courseId });
}

export function useMcqList(courseId: string, subjectId?: string) {
  return useQuery({ queryKey: ["mcq", courseId, subjectId], queryFn: () => mcqApi.list(courseId, subjectId), enabled: !!courseId });
}

export function useMyMistakes(courseId?: string) {
  return useQuery({ queryKey: ["my-mistakes", courseId], queryFn: () => mcqApi.myMistakes(courseId) });
}

export function useCheckAnswer() {
  return useMutation({
    mutationFn: ({ id, selectedOption }: { id: string; selectedOption: string }) => mcqApi.checkAnswer(id, selectedOption),
  });
}

export function useMockTests(courseId: string) {
  return useQuery({ queryKey: ["mock-tests", courseId], queryFn: () => mockTestApi.list(courseId), enabled: !!courseId });
}

export function useMockTestDetail(id: string) {
  return useQuery({ queryKey: ["mock-test", id], queryFn: () => mockTestApi.getById(id), enabled: !!id });
}

export function useStartAttempt() {
  return useMutation({ mutationFn: (mockTestId: string) => mockTestApi.start(mockTestId) });
}

export function useSubmitAttempt() {
  return useMutation({
    mutationFn: ({ attemptId, answers }: { attemptId: string; answers: { questionId: string; selectedOption: string | null }[] }) =>
      mockTestApi.submit(attemptId, answers),
  });
}

export function useSubmitWriting() {
  return useMutation({
    mutationFn: ({ sectionId, attemptId, essayText }: { sectionId: string; attemptId: string; essayText: string }) =>
      mockTestApi.submitWriting(sectionId, attemptId, essayText),
  });
}

export function useLiveClasses(courseId: string) {
  return useQuery({ queryKey: ["live-classes", courseId], queryFn: () => liveClassApi.list(courseId), enabled: !!courseId });
}

export function useJoinLiveClass() {
  return useMutation({ mutationFn: (id: string) => liveClassApi.join(id) });
}

export function useLibrary(courseId: string, search?: string) {
  return useQuery({ queryKey: ["library", courseId, search], queryFn: () => libraryApi.list(courseId, search), enabled: !!courseId });
}

export function useBookmarks() {
  return useQuery({ queryKey: ["bookmarks"], queryFn: () => bookmarkApi.list() });
}

export function useToggleBookmark() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ resourceType, resourceId }: { resourceType: "LIBRARY" | "MCQ"; resourceId: string }) =>
      bookmarkApi.toggle(resourceType, resourceId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bookmarks"] }),
  });
}

export function useSendChatMessage() {
  return useMutation({
    mutationFn: ({ message, history, courseId }: { message: string; history: ChatMessage[]; courseId?: string }) =>
      chatbotApi.sendMessage(message, history, courseId),
  });
}

export function useMyProfile() {
  return useQuery({ queryKey: ["my-profile"], queryFn: () => profileApi.getMe() });
}

export function useUpdateProfile() {
  const updateUser = useAuthStore((s) => s.updateUser);
  return useMutation({
    mutationFn: (payload: { fullName?: string; phone?: string; bio?: string; email?: string; currentPassword?: string }) => profileApi.update(payload),
    onSuccess: (data) => updateUser(data),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) =>
      profileApi.changePassword(currentPassword, newPassword),
  });
}

export function useMyNotifications() {
  return useQuery({
    queryKey: ["my-notifications"],
    queryFn: () => notificationApi.myNotifications(),
    refetchInterval: 60000,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationApi.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-notifications"] }),
  });
}

export function useFlashcards(courseId: string) {
  return useQuery({ queryKey: ["flashcards", courseId], queryFn: () => flashcardApi.list(courseId), enabled: !!courseId });
}

export function useSubmitFamiliarity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, familiarity }: { id: string; familiarity: "AGAIN" | "GOOD" | "EASY" }) => flashcardApi.submitFamiliarity(id, familiarity),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["flashcards"] }),
  });
}


export function usePrecedentSearch(params: { search?: string; category?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ["precedents", params],
    queryFn: () => precedentApi.search(params),
  });
}

export function usePrecedentDetail(id: string | undefined) {
  return useQuery({
    queryKey: ["precedent-detail", id],
    queryFn: () => precedentApi.getById(id as string),
    enabled: !!id,
  });
}

export function usePrecedentCategories() {
  return useQuery({ queryKey: ["precedent-categories"], queryFn: () => precedentApi.listCategories() });
}

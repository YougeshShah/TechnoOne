import { apiClient } from "./client";
import { AuthUser, Course, CourseSubscription, McqQuestion, Subject, MockTest, LiveClass, LibraryResource, Bookmark, ChatMessage } from "../types";

interface ApiSuccess<T> {
  success: true;
  data: T;
}

export const authApi = {
  async register(payload: { fullName: string; email: string; phone?: string; password: string; interestedCourseId?: string; institutionSlug?: string }) {
    const { data } = await apiClient.post<ApiSuccess<any>>("/auth/register/student", payload);
    return data.data;
  },
  async login(payload: { email: string; password: string }) {
    const { data } = await apiClient.post<ApiSuccess<{ accessToken: string; refreshToken: string; user: AuthUser }>>(
      "/auth/login",
      payload
    );
    return data.data;
  },
  async requestPasswordReset(email: string) {
    const { data } = await apiClient.post<{ success: boolean; message: string }>("/auth/request-password-reset", { email });
    return data;
  },
};

export const courseApi = {
  async list() {
    const { data } = await apiClient.get<ApiSuccess<Course[]>>("/courses");
    return data.data;
  },
  async listPublic() {
    const { data } = await apiClient.get<ApiSuccess<{ id: string; name: string; category: string }[]>>("/courses/public");
    return data.data;
  },
  async mySubscriptions() {
    const { data } = await apiClient.get<ApiSuccess<CourseSubscription[]>>("/courses/my-subscriptions");
    return data.data;
  },
  async amountDue(courseId: string) {
    const { data } = await apiClient.get<ApiSuccess<{ fee: number | null; discount: number | null; amountDue: number | null }>>(
      `/institution-fee/my-amount-due/${courseId}`
    );
    return data.data;
  },
};

export const subjectApi = {
  async list(courseId: string) {
    const { data } = await apiClient.get<ApiSuccess<Subject[]>>("/subjects", { params: { courseId } });
    return data.data;
  },
};

export const mcqApi = {
  async list(courseId: string, subjectId?: string) {
    const { data } = await apiClient.get<ApiSuccess<{ items: McqQuestion[] }>>("/mcq", { params: { courseId, subjectId } });
    return data.data.items;
  },
  async myMistakes(courseId?: string) {
    const { data } = await apiClient.get<ApiSuccess<McqQuestion[]>>("/mcq/my-mistakes", { params: { courseId } });
    return data.data;
  },
  async checkAnswer(id: string, selectedOption: string) {
    const { data } = await apiClient.post<
      ApiSuccess<{ isCorrect: boolean; correctOption?: string; correctAnswerText?: string; blankResults?: boolean[]; explanation: string | null }>
    >(`/mcq/${id}/check-answer`, { selectedOption });
    return data.data;
  },
};

export const mockTestApi = {
  async list(courseId: string): Promise<MockTest[]> {
    const { data } = await apiClient.get<ApiSuccess<MockTest[]>>("/mock-tests", { params: { courseId } });
    return data.data;
  },
  async getById(id: string) {
    const { data } = await apiClient.get<ApiSuccess<any>>(`/mock-tests/${id}`);
    return data.data;
  },
  async start(mockTestId: string) {
    const { data } = await apiClient.post<ApiSuccess<{ attemptId: string; totalQuestions: number; durationMinutes: number }>>(
      `/mock-tests/${mockTestId}/start`
    );
    return data.data;
  },
  async submit(attemptId: string, answers: { questionId: string; selectedOption: string | null }[]) {
    const { data } = await apiClient.post<
      ApiSuccess<{
        score: number;
        totalQuestions: number;
        percentage: number;
        marksScored?: number;
        totalMarks?: number;
        negativeMarkingApplied?: boolean;
      }>
    >(`/mock-tests/attempts/${attemptId}/submit`, { answers });
    return data.data;
  },
  async submitWriting(sectionId: string, attemptId: string, essayText: string) {
    const { data } = await apiClient.post<ApiSuccess<any>>("/writing-submissions", { sectionId, attemptId, essayText });
    return data.data;
  },
};

export const liveClassApi = {
  async list(courseId: string): Promise<LiveClass[]> {
    const { data } = await apiClient.get<ApiSuccess<LiveClass[]>>("/live-classes", { params: { courseId, upcomingOnly: true } });
    return data.data;
  },
  async join(id: string) {
    const { data } = await apiClient.post<ApiSuccess<{ meetingUrl: string }>>(`/live-classes/${id}/join`);
    return data.data;
  },
};

export const libraryApi = {
  async list(courseId: string, search?: string): Promise<{ items: LibraryResource[] }> {
    const { data } = await apiClient.get<ApiSuccess<{ items: LibraryResource[] }>>("/library", { params: { courseId, search } });
    return data.data;
  },
};

export const bookmarkApi = {
  async list(): Promise<Bookmark[]> {
    const { data } = await apiClient.get<ApiSuccess<Bookmark[]>>("/bookmarks");
    return data.data;
  },
  async toggle(resourceType: "LIBRARY" | "MCQ", resourceId: string) {
    const { data } = await apiClient.post<ApiSuccess<{ bookmarked: boolean }>>("/bookmarks/toggle", { resourceType, resourceId });
    return data.data;
  },
};

export const chatbotApi = {
  async sendMessage(message: string, history: ChatMessage[], courseId?: string): Promise<string> {
    const { data } = await apiClient.post<ApiSuccess<{ reply: string }>>("/chatbot/message", { message, history, courseId });
    return data.data.reply;
  },
};

export const profileApi = {
  async getMe(): Promise<AuthUser & { bio?: string | null; lastLoginAt?: string | null; createdAt?: string }> {
    const { data } = await apiClient.get<ApiSuccess<any>>("/auth/me");
    return data.data;
  },
  async update(payload: { fullName?: string; phone?: string; bio?: string; email?: string; currentPassword?: string }): Promise<AuthUser> {
    const { data } = await apiClient.patch<ApiSuccess<AuthUser>>("/auth/me", payload);
    return data.data;
  },
  async changePassword(currentPassword: string, newPassword: string) {
    const { data } = await apiClient.patch<ApiSuccess<{ message: string }>>("/auth/change-password", { currentPassword, newPassword });
    return data.data;
  },
  async uploadAvatar(localUri: string): Promise<{ id: string; avatarUrl: string }> {
    const formData = new FormData();
    formData.append("avatar", { uri: localUri, name: "avatar.jpg", type: "image/jpeg" } as any);
    const { data } = await apiClient.post<ApiSuccess<{ id: string; avatarUrl: string }>>("/auth/me/avatar", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data.data;
  },
  async toggleNotifications(enabled: boolean) {
    const { data } = await apiClient.patch<ApiSuccess<{ notificationsEnabled: boolean }>>("/auth/me/notifications", { enabled });
    return data.data;
  },
  async deleteAccount(password: string) {
    const { data } = await apiClient.delete<ApiSuccess<{ message: string }>>("/auth/me", { data: { password } });
    return data.data;
  },
};

export interface StudyAnalytics {
  testsTaken: number;
  averageScorePercent: number;
  overallCompletionPercent: number;
  subjectsInProgress: number;
  practiceQuestionsAnswered: number;
  practiceAccuracyPercent: number;
}
export interface TestAttemptSummary {
  id: string;
  score: number | null;
  totalQuestions: number;
  startedAt: string;
  submittedAt: string | null;
  mockTest: { title: string };
}
export const progressApi = {
  async getAnalytics(): Promise<StudyAnalytics> {
    const { data } = await apiClient.get<ApiSuccess<StudyAnalytics>>("/study-progress/analytics");
    return data.data;
  },
  async myAttempts(): Promise<TestAttemptSummary[]> {
    const { data } = await apiClient.get<ApiSuccess<TestAttemptSummary[]>>("/mock-tests/my-attempts");
    return data.data;
  },
};
export const notificationApi = {
  async myNotifications(page = 1, limit = 30) {
    const { data } = await apiClient.get<
      ApiSuccess<{ items: any[]; total: number; unreadCount: number }>
    >("/notifications/my", { params: { page, limit } });
    return data.data;
  },
  async markRead(id: string) {
    const { data } = await apiClient.patch<ApiSuccess<{ message: string }>>(`/notifications/my/${id}/read`);
    return data.data;
  },
};

export const flashcardApi = {
  async list(courseId: string, subjectId?: string) {
    const { data } = await apiClient.get<ApiSuccess<any[]>>("/flashcards", { params: { courseId, subjectId } });
    return data.data;
  },
  async submitFamiliarity(id: string, familiarity: "AGAIN" | "GOOD" | "EASY") {
    const { data } = await apiClient.post<ApiSuccess<any>>(`/flashcards/${id}/familiarity`, { familiarity });
    return data.data;
  },
};


export const precedentApi = {
  async search(params: { search?: string; category?: string; page?: number; limit?: number }) {
    const { data } = await apiClient.get<
      ApiSuccess<{ items: any[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>
    >("/precedents", { params });
    return data.data;
  },
  async getById(id: string) {
    const { data } = await apiClient.get<ApiSuccess<any>>(`/precedents/${id}`);
    return data.data;
  },
  async listCategories() {
    const { data } = await apiClient.get<ApiSuccess<string[]>>("/precedents/categories");
    return data.data;
  },
};

export const speakingApi = {
  async listPrompts(courseId: string, part?: number) {
    const { data } = await apiClient.get<ApiSuccess<any[]>>("/speaking/prompts", { params: { courseId, part } });
    return data.data;
  },

  async submitRecording(promptId: string, fileUri: string, durationSeconds: number) {
    const formData = new FormData();
    formData.append("recording", { uri: fileUri, name: "recording.mp4", type: "video/mp4" } as any);
    formData.append("promptId", promptId);
    formData.append("recordingType", "video");
    formData.append("durationSeconds", String(durationSeconds));
    const { data } = await apiClient.post<ApiSuccess<any>>("/speaking/submissions", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data.data;
  },

  async listMySubmissions(promptId?: string) {
    const { data } = await apiClient.get<ApiSuccess<any[]>>("/speaking/submissions/my", { params: { promptId } });
    return data.data;
  },
};

export const emailVerificationApi = {
  async sendCode(email: string, purpose: "REGISTRATION" | "PASSWORD_RESET") {
    const { data } = await apiClient.post<ApiSuccess<void>>("/email-verification/send-code", { email, purpose });
    return data;
  },
  async verifyEmail(email: string, code: string) {
    const { data } = await apiClient.post<ApiSuccess<void>>("/email-verification/verify-email", { email, code });
    return data;
  },
  async resetPassword(email: string, code: string, newPassword: string, institutionSlug?: string) {
    const { data } = await apiClient.post<ApiSuccess<void>>("/email-verification/reset-password", { email, code, newPassword, institutionSlug });
    return data;
  },
};

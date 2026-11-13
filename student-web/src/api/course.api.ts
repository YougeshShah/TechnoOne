import { apiClient } from "./client";
import { ApiSuccessResponse, PaginatedResult } from "../types/api.types";
import {
  Course,
  CourseSubscription,
  Subject,
  McqQuestion,
  MockTest,
  TestAttemptStart,
  TestAttemptResult,
} from "../types/course.types";

export const courseApi = {
  async list(): Promise<Course[]> {
    const { data } = await apiClient.get<ApiSuccessResponse<Course[]>>("/courses");
    return data.data;
  },

  async getById(id: string): Promise<Course> {
    const { data } = await apiClient.get<ApiSuccessResponse<Course>>(`/courses/${id}`);
    return data.data;
  },

  async mySubscriptions(): Promise<CourseSubscription[]> {
    const { data } = await apiClient.get<ApiSuccessResponse<CourseSubscription[]>>("/courses/my-subscriptions");
    return data.data;
  },
};

export const subjectApi = {
  async list(courseId?: string): Promise<Subject[]> {
    const { data } = await apiClient.get<ApiSuccessResponse<Subject[]>>("/subjects", { params: { courseId } });
    return data.data;
  },
};

export const mcqApi = {
  async list(params: { courseId?: string; subjectId?: string; page?: number; limit?: number }) {
    const { data } = await apiClient.get<ApiSuccessResponse<PaginatedResult<McqQuestion>>>("/mcq", { params });
    return data.data;
  },

  async myMistakes(courseId?: string): Promise<McqQuestion[]> {
    const { data } = await apiClient.get<ApiSuccessResponse<McqQuestion[]>>("/mcq/my-mistakes", { params: { courseId } });
    return data.data;
  },

  async checkAnswer(
    id: string,
    selectedOption: string
  ): Promise<{ isCorrect: boolean; correctOption?: string; correctAnswerText?: string; blankResults?: boolean[]; explanation: string | null }> {
    const { data } = await apiClient.post<
      ApiSuccessResponse<{ isCorrect: boolean; correctOption?: string; correctAnswerText?: string; blankResults?: boolean[]; explanation: string | null }>
    >(`/mcq/${id}/check-answer`, { selectedOption });
    return data.data;
  },
};

export const mockTestApi = {
  async list(params: { courseId?: string }): Promise<MockTest[]> {
    const { data } = await apiClient.get<ApiSuccessResponse<MockTest[]>>("/mock-tests", { params });
    return data.data;
  },

  async getById(id: string) {
    const { data } = await apiClient.get<ApiSuccessResponse<any>>(`/mock-tests/${id}`);
    return data.data;
  },

  async startAttempt(mockTestId: string): Promise<TestAttemptStart> {
    const { data } = await apiClient.post<ApiSuccessResponse<TestAttemptStart>>(`/mock-tests/${mockTestId}/start`);
    return data.data;
  },

  async submitAttempt(attemptId: string, answers: { questionId: string; selectedOption: string | null }[]): Promise<TestAttemptResult> {
    const { data } = await apiClient.post<ApiSuccessResponse<TestAttemptResult>>(`/mock-tests/attempts/${attemptId}/submit`, {
      answers,
    });
    return data.data;
  },

  async myAttempts() {
    const { data } = await apiClient.get<ApiSuccessResponse<any[]>>("/mock-tests/my-attempts");
    return data.data;
  },

  async uploadProctoringSnapshot(attemptId: string, blob: Blob): Promise<void> {
    const formData = new FormData();
    formData.append("snapshot", blob, "snapshot.jpg");
    await apiClient.post(`/mock-tests/attempts/${attemptId}/proctoring-snapshot`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  async recordViolation(attemptId: string): Promise<{ appLeftCount: number; flagged: boolean }> {
    const { data } = await apiClient.post<ApiSuccessResponse<{ appLeftCount: number; flagged: boolean }>>(
      `/mock-tests/attempts/${attemptId}/violation`
    );
    return data.data;
  },
};

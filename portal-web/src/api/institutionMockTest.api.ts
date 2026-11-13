import { apiClient } from "./client";
import { ApiSuccessResponse } from "../types/api.types";

export interface MockTestAdmin {
  id: string;
  title: string;
  courseId: string;
  subjectId: string | null;
  durationMinutes: number;
  isPublished: boolean;
  isFreeDemo: boolean;
  subject?: { name: string } | null;
  _count?: { questions: number };
}

export interface CreateMockTestPayload {
  title: string;
  courseId: string;
  subjectId?: string;
  examType?: string;
  durationMinutes: number;
  questionCount: number;
  marksPerQuestion?: number;
  negativeMarkingPercent?: number;
}

export interface FlaggedAttemptItem {
  id: string;
  mockTestId: string;
  studentId: string;
  score: number | null;
  totalQuestions: number;
  startedAt: string;
  submittedAt: string | null;
  appLeftCount: number;
  flagged: boolean;
  proctoringSnapshotUrls: string[];
  student?: { id: string; fullName: string; email: string; phone?: string | null };
  mockTest?: { id: string; title: string };
}

export const institutionMockTestApi = {
  async list(courseId?: string): Promise<MockTestAdmin[]> {
    const { data } = await apiClient.get<ApiSuccessResponse<MockTestAdmin[]>>("/mock-tests", {
      params: { courseId, publishedOnly: false },
    });
    return data.data;
  },

  async create(payload: CreateMockTestPayload) {
    const { data } = await apiClient.post<ApiSuccessResponse<MockTestAdmin>>("/mock-tests", payload);
    return data.data;
  },

  async publish(id: string) {
    const { data } = await apiClient.patch<ApiSuccessResponse<MockTestAdmin>>(`/mock-tests/${id}/publish`);
    return data.data;
  },

  async listFlaggedAttempts(mockTestId?: string): Promise<FlaggedAttemptItem[]> {
    const { data } = await apiClient.get<ApiSuccessResponse<FlaggedAttemptItem[]>>("/mock-tests/flagged-attempts", {
      params: mockTestId ? { mockTestId } : {},
    });
    return data.data;
  },

  async resolveFlaggedAttempt(attemptId: string, action: "APPROVE" | "DISQUALIFY") {
    const { data } = await apiClient.post<ApiSuccessResponse<any>>(`/mock-tests/attempts/${attemptId}/resolve-flag`, {
      action,
    });
    return data.data;
  },
};

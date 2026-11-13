import { apiClient } from "./client";

export interface FlaggedAttemptMobile {
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

export const proctoringReviewApi = {
  async listFlaggedAttempts(mockTestId?: string): Promise<FlaggedAttemptMobile[]> {
    const { data } = await apiClient.get<{ success: true; data: FlaggedAttemptMobile[] }>("/mock-tests/flagged-attempts", {
      params: mockTestId ? { mockTestId } : {},
    });
    return data.data;
  },

  async resolveFlaggedAttempt(attemptId: string, action: "APPROVE" | "DISQUALIFY") {
    const { data } = await apiClient.post<{ success: true; data: any }>(`/mock-tests/attempts/${attemptId}/resolve-flag`, {
      action,
    });
    return data.data;
  },
};

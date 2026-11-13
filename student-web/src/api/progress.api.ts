import { apiClient } from "./client";
import { ApiSuccessResponse } from "../types/api.types";

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
  flagged?: boolean;
  appLeftCount?: number;
  mockTest: { title: string };
}

export interface PracticeHistoryItem {
  id: string;
  questionId: string;
  selectedOption: string | null;
  isCorrect: boolean;
  answeredAt: string;
  dateKey: string;
  question: {
    id: string;
    question: string;
    answerType?: string;
    optionA: string | null;
    optionB: string | null;
    optionC: string | null;
    optionD: string | null;
    correctOption: string | null;
    correctAnswerText: string | null;
    explanation: string | null;
    subjectName: string | null;
    courseName: string | null;
  };
}

export const progressApi = {
  async getAnalytics(): Promise<StudyAnalytics> {
    const { data } = await apiClient.get<ApiSuccessResponse<StudyAnalytics>>("/study-progress/analytics");
    return data.data;
  },

  async myAttempts(): Promise<TestAttemptSummary[]> {
    const { data } = await apiClient.get<ApiSuccessResponse<TestAttemptSummary[]>>("/mock-tests/my-attempts");
    return data.data;
  },

  async getAttemptDetail(attemptId: string): Promise<any> {
    const { data } = await apiClient.get<ApiSuccessResponse<any>>(`/mock-tests/attempts/${attemptId}`);
    return data.data;
  },

  async getPracticeHistory(): Promise<PracticeHistoryItem[]> {
    const { data } = await apiClient.get<ApiSuccessResponse<PracticeHistoryItem[]>>("/study-progress/practice-history");
    return data.data;
  },
};

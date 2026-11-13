import { apiClient } from "./client";
import { ApiSuccessResponse } from "../types/api.types";

export interface SpeakingPrompt {
  id: string;
  courseId: string;
  part: number;
  title: string;
  promptText: string;
  prepTimeSeconds: number | null;
  speakTimeSeconds: number;
}

export interface SpeakingSubmission {
  id: string;
  promptId?: string | null;
  attemptId?: string | null;
  sectionId?: string | null;
  recordingType: string;
  status: "PENDING_GRADING" | "GRADED" | "GRADING_FAILED";
  overallBand: number | null;
  aiFeedback?: string | null;
  createdAt: string;
  prompt?: { title: string; part: number; promptText: string };
}

export const speakingApi = {
  async listPrompts(courseId: string, part?: number): Promise<SpeakingPrompt[]> {
    const { data } = await apiClient.get<ApiSuccessResponse<SpeakingPrompt[]>>("/speaking/prompts", {
      params: { courseId, part },
    });
    return data.data;
  },

  async submitRecording(promptId: string, blob: Blob, recordingType: "video" | "audio", durationSeconds: number) {
    const formData = new FormData();
    formData.append("recording", blob, recordingType === "video" ? "recording.webm" : "recording.mp3");
    formData.append("promptId", promptId);
    formData.append("recordingType", recordingType);
    formData.append("durationSeconds", String(durationSeconds));
    const { data } = await apiClient.post<ApiSuccessResponse<SpeakingSubmission>>("/speaking/submissions", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data.data;
  },

  async submitMockTestRecording(
    attemptId: string,
    sectionId: string,
    blob: Blob,
    recordingType: "video" | "audio",
    durationSeconds: number
  ): Promise<SpeakingSubmission> {
    const formData = new FormData();
    formData.append("recording", blob, recordingType === "video" ? "recording.webm" : "recording.mp3");
    formData.append("attemptId", attemptId);
    formData.append("sectionId", sectionId);
    formData.append("recordingType", recordingType);
    formData.append("durationSeconds", String(durationSeconds));
    const { data } = await apiClient.post<ApiSuccessResponse<SpeakingSubmission>>("/speaking/submissions", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data.data;
  },

  async listMySubmissions(promptId?: string): Promise<SpeakingSubmission[]> {
    const { data } = await apiClient.get<ApiSuccessResponse<SpeakingSubmission[]>>("/speaking/submissions/my", {
      params: { promptId },
    });
    return data.data;
  },
};

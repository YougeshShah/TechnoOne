import { apiClient } from "./client";

export interface AiAssistantSource {
  id: string;
  jurisdiction?: "NEPAL" | "UK";
  title: string;
  caseType: string | null;
  decisionDate: string | null;
  citation?: string | null;
  url?: string | null;
}

export interface AiHistoryMessage {
  role: "user" | "assistant";
  text: string;
}

export interface AiAssistantResponse {
  answer: string;
  sources: AiAssistantSource[];
}

export const aiAssistantApi = {
  async ask(question: string, history: AiHistoryMessage[] = []): Promise<AiAssistantResponse> {
    const { data } = await apiClient.post("/ai-assistant/ask", { question, history });
    return data.data;
  },
};

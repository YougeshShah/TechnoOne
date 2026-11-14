import { z } from "zod";

export const historyMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  text: z.string().min(1).max(12000),
});

export const askAssistantSchema = z.object({
  question: z.string().min(2).max(4000),
  history: z.array(historyMessageSchema).max(30).optional().default([]),
});

export type AskAssistantInput = z.infer<typeof askAssistantSchema>;
export type HistoryMessage = z.infer<typeof historyMessageSchema>;

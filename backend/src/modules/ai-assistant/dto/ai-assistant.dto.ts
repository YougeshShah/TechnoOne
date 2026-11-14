import { z } from "zod";

export const historyMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  text: z.string(),
});

export const askAssistantSchema = z.object({
  question: z.string().min(1),
  history: z.array(historyMessageSchema).optional().default([]),
});

export type AskAssistantInput = z.infer<typeof askAssistantSchema>;
export type HistoryMessage = z.infer<typeof historyMessageSchema>;

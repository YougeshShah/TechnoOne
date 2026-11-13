import { z } from "zod";

export const createPromptSchema = z.object({
  courseId: z.string().uuid(),
  part: z.coerce.number().int().min(1).max(3),
  title: z.string().min(2),
  promptText: z.string().min(5),
  prepTimeSeconds: z.coerce.number().int().min(0).optional(),
  speakTimeSeconds: z.coerce.number().int().min(10),
});
export type CreatePromptInput = z.infer<typeof createPromptSchema>;

export const updatePromptSchema = createPromptSchema.partial().extend({
  isPublished: z.boolean().optional(),
});
export type UpdatePromptInput = z.infer<typeof updatePromptSchema>;

export const listPromptsQuerySchema = z.object({
  courseId: z.string().uuid(),
  part: z.coerce.number().int().min(1).max(3).optional(),
});

export const submitRecordingSchema = z
  .object({
    // Either promptId (dedicated Speaking practice) OR both attemptId and
    // sectionId (recording submitted from inside a Mock Test's own
    // SPEAKING section) must be provided -- never both, never neither.
    promptId: z.string().uuid().optional(),
    attemptId: z.string().uuid().optional(),
    sectionId: z.string().uuid().optional(),
    recordingType: z.enum(["video", "audio"]),
    durationSeconds: z.coerce.number().int().min(1).optional(),
  })
  .refine((data) => !!data.promptId !== !!(data.attemptId && data.sectionId), {
    message: "Provide either promptId, or both attemptId and sectionId, but not both.",
  });
export type SubmitRecordingInput = z.infer<typeof submitRecordingSchema>;

export const idParamSchema = z.object({ id: z.string().uuid() });

import { z } from "zod";

const examTypes = [
  "LLB",
  "BALLB",
  "BAR_COUNCIL",
  "JUDICIAL_SERVICE",
  "PUBLIC_SERVICE_COMMISSION",
  "KHARIDAR",
  "NAYAB_SUBBA",
  "SECTION_OFFICER",
] as const;

export const createMockTestSchema = z.object({
  title: z.string().min(2, "Title is required"),
  courseId: z.string().uuid("Course is required"),
  examType: z.enum(examTypes).optional(),
  subjectId: z.string().uuid().optional().or(z.literal("")),
  durationMinutes: z.coerce.number().int().positive().default(60),
  questionCount: z.coerce.number().int().positive().max(200).default(25), // how many random questions to pull in
  // 0 = no negative marking (Law/IELTS practice style). Set to match a real
  // exam's rule — e.g. 10 for IOE, 25 for Medical (MECEE-BL).
  negativeMarkingPercent: z.coerce.number().int().min(0).max(100).default(0),
  marksPerQuestion: z.coerce.number().int().positive().default(1), // applied to every randomly-pulled question
});
export type CreateMockTestInput = z.infer<typeof createMockTestSchema>;

export const listMockTestsQuerySchema = z.object({
  courseId: z.string().uuid().optional(),
  examType: z.enum(examTypes).optional(),
  publishedOnly: z.coerce.boolean().default(true),
});
export type ListMockTestsQuery = z.infer<typeof listMockTestsQuerySchema>;

export const mockTestIdParamSchema = z.object({
  id: z.string().uuid("Invalid mock test id"),
});

export const submitAttemptSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.string().uuid(),
      selectedOption: z.enum(["A", "B", "C", "D"]).nullable(),
    })
  ),
});
export type SubmitAttemptInput = z.infer<typeof submitAttemptSchema>;

export const attemptIdParamSchema = z.object({
  attemptId: z.string().uuid("Invalid attempt id"),
});

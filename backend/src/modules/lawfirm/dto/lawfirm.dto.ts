import { z } from "zod";

export const listLawFirmsQuerySchema = z.object({
  status: z.enum(["PENDING", "ACTIVE", "SUSPENDED", "REJECTED"]).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
export type ListLawFirmsQuery = z.infer<typeof listLawFirmsQuerySchema>;

export const lawFirmIdParamSchema = z.object({
  id: z.string().uuid("Invalid law firm id"),
});

export const suspendLawFirmSchema = z.object({
  reason: z.string().min(3, "Please provide a reason for suspension").optional(),
});
export type SuspendLawFirmInput = z.infer<typeof suspendLawFirmSchema>;

// Self-service settings an institution's own staff (admin, teacher, or
// general staff) can change for their own institution -- distinct from
// updateModulesSchema, which only Company (platform) staff may touch.
export const updateMySettingsSchema = z.object({
  allowRecordingScreenshots: z.boolean(),
});
export type UpdateMySettingsInput = z.infer<typeof updateMySettingsSchema>;

export const tenantTypes = ["LAW_FIRM", "EDUCATION", "OTHER"] as const;
export const availableModules = [
  "case_management",
  "student_platform",
  "live_classes",
  "document_templates",
  "precedent_search",
  "ai_legal_assistant",
  "speaking_prompts",
] as const;

export const updateModulesSchema = z.object({
  modulesEnabled: z.array(z.enum(availableModules)).min(1, "At least one module must stay enabled"),
  allowedCourseIds: z.array(z.string().uuid()).optional(),
  allowedExamTypes: z.array(z.string()).optional(),
});
export type UpdateModulesInput = z.infer<typeof updateModulesSchema>;

export const createLawFirmSchema = z.object({
  lawFirmName: z.string().min(2, "Organization name is required"),
  lawFirmEmail: z.string().email(),
  adminFullName: z.string().min(2, "Admin name is required"),
  adminEmail: z.string().email(),
  adminPhone: z.string().optional(),
  password: z.string().min(8, "Password must be at least 8 characters").optional(), // no longer needed -- a temporary password is auto-generated server-side
  tenantType: z.enum(tenantTypes).default("LAW_FIRM"),
  modulesEnabled: z.array(z.enum(availableModules)).default(["case_management"]),
  allowedCourseIds: z.array(z.string().uuid()).default([]),
  allowedExamTypes: z.array(z.string()).default([]),
});
export type CreateLawFirmInput = z.infer<typeof createLawFirmSchema>;

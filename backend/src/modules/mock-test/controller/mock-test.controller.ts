import { Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../../../common/errors/AppError";
import { mockTestService } from "../service/mock-test.service";
import { createMockTestSchema, listMockTestsQuerySchema, mockTestIdParamSchema, submitAttemptSchema, attemptIdParamSchema } from "../dto/mock-test.dto";

export const mockTestController = {
  async list(req: Request, res: Response) {
    const query = listMockTestsQuerySchema.parse(req.query);
    if (req.auth?.accountType === "STUDENT" && !query.courseId) {
      throw AppError.badRequest("courseId is required");
    }
    const result = await mockTestService.list(query, {
      studentLawFirmId: req.auth?.accountType === "STUDENT" ? req.auth.lawFirmId ?? null : undefined,
      forLawFirmId: req.auth?.accountType === "LAW_FIRM_ADMIN" ? req.auth.lawFirmId ?? undefined : undefined,
      studentExamType: req.auth?.accountType === "STUDENT" ? req.auth.preferredExamType ?? null : undefined,
    });
    res.status(200).json({ success: true, data: result });
  },

  async getById(req: Request, res: Response) {
    const { id } = mockTestIdParamSchema.parse(req.params);
    const result = await mockTestService.getById(id);
    res.status(200).json({ success: true, data: result });
  },

  async create(req: Request, res: Response) {
    if (!req.auth) throw AppError.unauthorized();
    const input = createMockTestSchema.parse(req.body);
    const hostLawFirmId = req.auth.accountType === "LAW_FIRM_ADMIN" ? req.auth.lawFirmId ?? undefined : undefined;
    const result = await mockTestService.create(input, req.auth.userId, hostLawFirmId);
    res.status(201).json({ success: true, data: result });
  },

  async publish(req: Request, res: Response) {
    const { id } = mockTestIdParamSchema.parse(req.params);
    const requesterLawFirmId = req.auth?.accountType === "LAW_FIRM_ADMIN" ? req.auth.lawFirmId ?? undefined : undefined;
    const result = await mockTestService.publish(id, requesterLawFirmId);
    res.status(200).json({ success: true, data: result });
  },

  async addQuestion(req: Request, res: Response) {
    const { id } = mockTestIdParamSchema.parse(req.params);
    const { questionId, marks } = z.object({ questionId: z.string().uuid(), marks: z.coerce.number().int().positive().default(1) }).parse(req.body);
    const requesterLawFirmId = req.auth?.accountType === "LAW_FIRM_ADMIN" ? req.auth.lawFirmId ?? undefined : undefined;
    const result = await mockTestService.addQuestion(id, questionId, marks, requesterLawFirmId);
    res.status(200).json({ success: true, data: result });
  },

  async removeQuestion(req: Request, res: Response) {
    const { id, questionId } = z.object({ id: z.string().uuid(), questionId: z.string().uuid() }).parse(req.params);
    const requesterLawFirmId = req.auth?.accountType === "LAW_FIRM_ADMIN" ? req.auth.lawFirmId ?? undefined : undefined;
    await mockTestService.removeQuestion(id, questionId, requesterLawFirmId);
    res.status(200).json({ success: true, message: "Question removed from test" });
  },

  async startAttempt(req: Request, res: Response) {
    if (!req.auth) throw AppError.unauthorized();
    const { id } = mockTestIdParamSchema.parse(req.params);
    const result = await mockTestService.startAttempt(req.auth.userId, id, req.auth.lawFirmId ?? null);
    res.status(201).json({ success: true, data: result });
  },

  async submitAttempt(req: Request, res: Response) {
    if (!req.auth) throw AppError.unauthorized();
    const { id: attemptId } = mockTestIdParamSchema.parse({ id: req.params.attemptId });
    const input = submitAttemptSchema.parse(req.body);
    const result = await mockTestService.submitAttempt(attemptId, req.auth.userId, input);
    res.status(200).json({ success: true, data: result });
  },

  async myAttempts(req: Request, res: Response) {
    if (!req.auth) throw AppError.unauthorized();
    const result = await mockTestService.myAttempts(req.auth.userId);
    res.status(200).json({ success: true, data: result });
  },

  async getAttemptResult(req: Request, res: Response) {
    if (!req.auth) throw AppError.unauthorized();
    const { id: attemptId } = mockTestIdParamSchema.parse({ id: req.params.attemptId });
    const result = await mockTestService.getAttemptResult(attemptId, req.auth.userId);
    res.status(200).json({ success: true, data: result });
  },

  async uploadProctoringSnapshot(req: Request, res: Response) {
    if (!req.auth) throw AppError.unauthorized();
    if (!req.file) throw AppError.badRequest("No snapshot file was uploaded");
    const { attemptId } = attemptIdParamSchema.parse(req.params);
    const relativePath = `proctoring/${req.file.filename}`;
    const result = await mockTestService.addProctoringSnapshot(attemptId, req.auth.userId, relativePath);
    res.status(201).json({ success: true, data: result });
  },

  async recordViolation(req: Request, res: Response) {
    if (!req.auth) throw AppError.unauthorized();
    const { attemptId } = attemptIdParamSchema.parse(req.params);
    const result = await mockTestService.recordViolation(attemptId, req.auth.userId);
    res.status(200).json({ success: true, data: { appLeftCount: result.appLeftCount, flagged: result.flagged } });
  },
};

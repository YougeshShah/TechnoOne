import { Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../../../common/errors/AppError";
import { liveClassService } from "../service/live-class.service";
import { createLiveClassSchema, listLiveClassesQuerySchema, liveClassIdParamSchema, updateLiveClassSchema } from "../dto/live-class.dto";

export const liveClassController = {
  async list(req: Request, res: Response) {
    const query = listLiveClassesQuerySchema.parse(req.query);
    if (req.auth?.accountType === "STUDENT" && !query.courseId) {
      throw AppError.badRequest("courseId is required");
    }
    const isInstitutionStaff = req.auth?.accountType === "LAW_FIRM_ADMIN" || req.auth?.accountType === "LAWYER" || req.auth?.accountType === "STAFF";
    // Institution admin sees every class their institution scheduled (for
    // oversight); a regular teacher/staff member (LAWYER/STAFF, not the
    // admin) only sees classes specifically assigned to them.
    const isRegularStaff = req.auth?.accountType === "LAWYER" || req.auth?.accountType === "STAFF";
    const result = await liveClassService.list(query, {
      studentLawFirmId: req.auth?.accountType === "STUDENT" ? req.auth.lawFirmId : undefined,
      forLawFirmId: isInstitutionStaff ? req.auth?.lawFirmId ?? undefined : undefined,
      onlyHostId: isRegularStaff ? req.auth?.userId : undefined,
    });
    res.status(200).json({ success: true, data: result });
  },

  async getById(req: Request, res: Response) {
    const { id } = liveClassIdParamSchema.parse(req.params);
    const studentId = req.auth?.accountType === "STUDENT" ? req.auth.userId : null;
    const result = await liveClassService.getById(id, studentId);
    res.status(200).json({ success: true, data: result });
  },

  async create(req: Request, res: Response) {
    if (!req.auth) throw AppError.unauthorized();
    const input = createLiveClassSchema.parse(req.body);
    // Company-hosted classes are platform-wide (hostLawFirmId null); any
    // institution staff member's (admin, teacher, or general staff) classes
    // are scoped to their own tenant.
    const isInstitutionStaff = ["LAW_FIRM_ADMIN", "LAWYER", "STAFF"].includes(req.auth.accountType);
    const hostLawFirmId = isInstitutionStaff ? req.auth.lawFirmId ?? undefined : undefined;
    const result = await liveClassService.create(input, req.auth.userId, hostLawFirmId);
    res.status(201).json({ success: true, data: result });
  },

  async joinAsStudent(req: Request, res: Response) {
    if (!req.auth) throw AppError.unauthorized();
    const { id } = liveClassIdParamSchema.parse(req.params);
    const result = await liveClassService.joinAsStudent(id, req.auth.userId, req.auth.lawFirmId);
    res.status(200).json({ success: true, data: result });
  },

  async joinAsHost(req: Request, res: Response) {
    if (!req.auth) throw AppError.unauthorized();
    const { id } = liveClassIdParamSchema.parse(req.params);
    const result = await liveClassService.joinAsHost(id, req.auth.userId, req.auth.accountType);
    res.status(200).json({ success: true, data: result });
  },

  async remove(req: Request, res: Response) {
    if (!req.auth) throw AppError.unauthorized();
    const { id } = liveClassIdParamSchema.parse(req.params);
    await liveClassService.remove(id, req.auth);
    res.status(200).json({ success: true, message: "Live class deleted" });
  },

  async listAttendees(req: Request, res: Response) {
    const { id } = liveClassIdParamSchema.parse(req.params);
    const result = await liveClassService.listAttendees(id);
    res.status(200).json({ success: true, data: result });
  },

  async markLive(req: Request, res: Response) {
    if (!req.auth) throw AppError.unauthorized();
    const { id } = liveClassIdParamSchema.parse(req.params);
    const result = await liveClassService.markLive(id, req.auth);
    res.status(200).json({ success: true, data: result });
  },

  async markEnded(req: Request, res: Response) {
    if (!req.auth) throw AppError.unauthorized();
    const { id } = liveClassIdParamSchema.parse(req.params);
    const result = await liveClassService.markEnded(id, req.auth);
    res.status(200).json({ success: true, data: result });
  },

  async uploadRecording(req: Request, res: Response) {
    if (!req.auth) throw AppError.unauthorized();
    const { id } = liveClassIdParamSchema.parse(req.params);
    const { recordingUrl } = z.object({ recordingUrl: z.string().min(5) }).parse(req.body);
    const result = await liveClassService.uploadRecording(id, recordingUrl, req.auth);
    res.status(200).json({ success: true, data: result });
  },

  async cancel(req: Request, res: Response) {
    if (!req.auth) throw AppError.unauthorized();
    const { id } = liveClassIdParamSchema.parse(req.params);
    const result = await liveClassService.cancel(id, req.auth);
    res.status(200).json({ success: true, data: result });
  },

  async update(req: Request, res: Response) {
    if (!req.auth) throw AppError.unauthorized();
    const { id } = liveClassIdParamSchema.parse(req.params);
    const input = updateLiveClassSchema.parse(req.body);
    const result = await liveClassService.update(id, input, req.auth);
    res.status(200).json({ success: true, message: "Live class updated", data: result });
  },
};

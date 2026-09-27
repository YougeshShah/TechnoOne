import { Request, Response } from "express";
import { lawFirmService } from "../service/lawfirm.service";
import { listLawFirmsQuerySchema, lawFirmIdParamSchema, suspendLawFirmSchema, createLawFirmSchema, updateModulesSchema, updateMySettingsSchema } from "../dto/lawfirm.dto";
import { AppError } from "../../../common/errors/AppError";
import { prisma } from "../../../database/prisma";

export const lawFirmController = {
  async listPublic(req: Request, res: Response) {
    const result = await lawFirmService.listPublicInstitutions();
    res.status(200).json({ success: true, data: result });
  },
  async create(req: Request, res: Response) {
    if (!req.auth) throw AppError.unauthorized();
    const input = createLawFirmSchema.parse(req.body);
    const result = await lawFirmService.create(input, req.auth.userId);
    res.status(201).json({ success: true, message: "Law firm created and activated", data: result });
  },

  async list(req: Request, res: Response) {
    const query = listLawFirmsQuerySchema.parse(req.query);
    const result = await lawFirmService.list(query);
    res.status(200).json({ success: true, data: result });
  },

  async getById(req: Request, res: Response) {
    const { id } = lawFirmIdParamSchema.parse(req.params);
    const result = await lawFirmService.getById(id);
    res.status(200).json({ success: true, data: result });
  },

  async approve(req: Request, res: Response) {
    const { id } = lawFirmIdParamSchema.parse(req.params);
    if (!req.auth) throw AppError.unauthorized();
    const result = await lawFirmService.approve(id, req.auth.userId);
    res.status(200).json({ success: true, message: "Law firm approved successfully", data: result });
  },

  async suspend(req: Request, res: Response) {
    const { id } = lawFirmIdParamSchema.parse(req.params);
    const { reason } = suspendLawFirmSchema.parse(req.body);
    if (!req.auth) throw AppError.unauthorized();
    const result = await lawFirmService.suspend(id, req.auth.userId, reason);
    res.status(200).json({ success: true, message: "Law firm suspended", data: result });
  },

  async activate(req: Request, res: Response) {
    const { id } = lawFirmIdParamSchema.parse(req.params);
    if (!req.auth) throw AppError.unauthorized();
    const result = await lawFirmService.activate(id, req.auth.userId);
    res.status(200).json({ success: true, message: "Law firm reactivated", data: result });
  },

  async reject(req: Request, res: Response) {
    const { id } = lawFirmIdParamSchema.parse(req.params);
    const { reason } = suspendLawFirmSchema.parse(req.body);
    if (!req.auth) throw AppError.unauthorized();
    const result = await lawFirmService.reject(id, req.auth.userId, reason);
    res.status(200).json({ success: true, message: "Law firm registration rejected", data: result });
  },

  async updateModules(req: Request, res: Response) {
    const { id } = lawFirmIdParamSchema.parse(req.params);
    const { modulesEnabled, allowedCourseIds, allowedExamTypes } = updateModulesSchema.parse(req.body);
    if (!req.auth) throw AppError.unauthorized();
    const result = await lawFirmService.updateModules(id, modulesEnabled, req.auth.userId, allowedCourseIds, allowedExamTypes);
    res.status(200).json({ success: true, message: "Modules updated successfully", data: result });
  },

  async remove(req: Request, res: Response) {
    const { id } = lawFirmIdParamSchema.parse(req.params);
    await lawFirmService.remove(id);
    res.status(200).json({ success: true, message: "Organization permanently deleted" });
  },
  async monthlyGrowth(req: Request, res: Response) {
    const months = req.query.months ? parseInt(req.query.months as string, 10) : 6;
    const result = await lawFirmService.monthlyGrowth(months);
    res.status(200).json({ success: true, data: result });
  },
  async getWebsiteByHost(req: Request, res: Response) {
    // Extracts the institution's slug from the request's own subdomain
    // (e.g. "sitalawfirm.portal.technocraftx.com" -> "sitalawfirm") --
    // used when Nginx proxies /site on the wildcard subdomain straight
    // here, without needing per-slug Nginx config.
    const host = req.headers.host || "";
    const slug = host.split(".")[0];
    const firm = await prisma.lawFirm.findUnique({ where: { slug }, select: { websiteHtml: true, status: true } });
    if (!firm || !firm.websiteHtml || firm.status !== "ACTIVE") {
      res.status(404).send("<html><body>No website published for this organization.</body></html>");
      return;
    }
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(firm.websiteHtml);
  },

  async getWebsite(req: Request, res: Response) {
    const { slug } = req.params;
    const firm = await prisma.lawFirm.findUnique({ where: { slug }, select: { websiteHtml: true, status: true } });
    if (!firm || !firm.websiteHtml || firm.status !== "ACTIVE") {
      res.status(404).send("<html><body>No website published for this organization.</body></html>");
      return;
    }
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(firm.websiteHtml);
  },

  async updateWebsite(req: Request, res: Response) {
    const { id } = req.params;
    const { websiteHtml } = req.body;
    const firm = await prisma.lawFirm.update({ where: { id }, data: { websiteHtml } });
    res.status(200).json({ success: true, data: { id: firm.id, slug: firm.slug } });
  },

  // Self-service for an institution's own staff (admin/teacher/general
  // staff) -- scoped to req.auth.lawFirmId, never an arbitrary :id, so one
  // institution can never read or change another institution's settings.
  async getMySettings(req: Request, res: Response) {
    if (!req.auth?.lawFirmId) throw AppError.badRequest("No institution associated with this account");
    const result = await lawFirmService.getMySettings(req.auth.lawFirmId);
    res.status(200).json({ success: true, data: result });
  },

  async updateMySettings(req: Request, res: Response) {
    if (!req.auth?.lawFirmId) throw AppError.badRequest("No institution associated with this account");
    const input = updateMySettingsSchema.parse(req.body);
    const result = await lawFirmService.updateMySettings(req.auth.lawFirmId, input);
    res.status(200).json({ success: true, data: result });
  },
};

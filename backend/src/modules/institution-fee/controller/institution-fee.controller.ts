import { Request, Response } from "express";
import { AppError } from "../../../common/errors/AppError";
import { institutionFeeService } from "../service/institution-fee.service";
import { setFeeSchema, grantDiscountSchema, recordManualPaymentSchema, courseIdParamSchema, idParamSchema } from "../dto/institution-fee.dto";

function getScopeLawFirmId(req: Request, forInstitution: boolean): string | null {
  if (forInstitution) {
    if (!req.auth?.lawFirmId) throw AppError.forbidden("This action requires an institution account");
    return req.auth.lawFirmId;
  }
  return null; // Company scope
}

export const institutionFeeController = {
  async searchStudents(req: Request, res: Response) {
    const lawFirmId = getScopeLawFirmId(req, true);
    const query = (req.query.q as string) || "";
    const result = await institutionFeeService.searchStudents(lawFirmId, query);
    res.status(200).json({ success: true, data: result });
  },

  // --- Fee (Company: lawFirmId=null default; Institution: their own) ---
  async setFeeAsCompany(req: Request, res: Response) {
    if (!req.auth) throw AppError.unauthorized();
    const input = setFeeSchema.parse(req.body);
    const result = await institutionFeeService.setFee(input, null, req.auth.userId);
    res.status(200).json({ success: true, message: "Default fee saved", data: result });
  },
  async getFeeAsCompany(req: Request, res: Response) {
    const { courseId } = courseIdParamSchema.parse(req.params);
    const result = await institutionFeeService.getFee(courseId, null);
    res.status(200).json({ success: true, data: result });
  },
  async setFeeAsInstitution(req: Request, res: Response) {
    if (!req.auth) throw AppError.unauthorized();
    const lawFirmId = getScopeLawFirmId(req, true);
    const input = setFeeSchema.parse(req.body);
    const result = await institutionFeeService.setFee(input, lawFirmId, req.auth.userId);
    res.status(200).json({ success: true, message: "Institution fee saved", data: result });
  },
  async getFeeAsInstitution(req: Request, res: Response) {
    const lawFirmId = getScopeLawFirmId(req, true);
    const { courseId } = courseIdParamSchema.parse(req.params);
    const result = await institutionFeeService.getFee(courseId, lawFirmId);
    res.status(200).json({ success: true, data: result });
  },

  // --- Discounts (Company or Institution can grant, scoped to their own students by frontend choice) ---
  async grantDiscount(req: Request, res: Response) {
    if (!req.auth) throw AppError.unauthorized();
    const input = grantDiscountSchema.parse(req.body);
    const result = await institutionFeeService.grantDiscount(input, req.auth.userId);
    res.status(200).json({ success: true, message: "Discount granted", data: result });
  },
  async removeDiscount(req: Request, res: Response) {
    const studentId = req.params.studentId;
    const courseId = req.params.courseId;
    await institutionFeeService.removeDiscount(studentId, courseId);
    res.status(200).json({ success: true, message: "Discount removed" });
  },
  async listDiscounts(req: Request, res: Response) {
    const { courseId } = courseIdParamSchema.parse(req.params);
    const result = await institutionFeeService.listDiscounts(courseId);
    res.status(200).json({ success: true, data: result });
  },

  // --- Amount due for the current logged-in student ---
  async myAmountDue(req: Request, res: Response) {
    if (!req.auth) throw AppError.unauthorized();
    const { courseId } = courseIdParamSchema.parse(req.params);
    const result = await institutionFeeService.calculateAmountDue(req.auth.userId, courseId, req.auth.lawFirmId ?? null);
    res.status(200).json({ success: true, data: result });
  },

  // --- Manual payment recording (institution staff or Company) ---
  async recordManualPayment(req: Request, res: Response) {
    if (!req.auth) throw AppError.unauthorized();
    const input = recordManualPaymentSchema.parse(req.body);
    const result = await institutionFeeService.recordManualPayment(input, req.auth.userId, req.auth.lawFirmId ?? null);
    res.status(201).json({ success: true, message: "Payment recorded", data: result });
  },

  // --- QR code ---
  async uploadQrCode(req: Request, res: Response) {
    if (!req.auth?.lawFirmId) throw AppError.forbidden("This action requires an institution account");
    if (!req.file) throw AppError.badRequest("No QR code image was uploaded");
    const path = require("path");
    const relativePath = path.join("payment-qr", req.file.filename);
    const result = await institutionFeeService.setPaymentQrCode(req.auth.lawFirmId, relativePath);
    res.status(200).json({ success: true, message: "Payment QR code updated", data: result });
  },
  async getMyQrCode(req: Request, res: Response) {
    if (!req.auth?.lawFirmId) throw AppError.forbidden("This action requires an institution account");
    const result = await institutionFeeService.getPaymentQrCode(req.auth.lawFirmId);
    res.status(200).json({ success: true, data: { paymentQrCodeUrl: result ? `/uploads/${result}` : null } });
  },

  // --- Company's own QR code ---
  async uploadCompanyQrCode(req: Request, res: Response) {
    if (!req.file) throw AppError.badRequest("No QR code image was uploaded");
    const path = require("path");
    const relativePath = path.join("payment-qr", req.file.filename);
    const result = await institutionFeeService.setCompanyQrCode(relativePath);
    res.status(200).json({ success: true, message: "Company payment QR code updated", data: result });
  },
  async getCompanyQrCode(req: Request, res: Response) {
    const result = await institutionFeeService.getCompanyQrCode();
    res.status(200).json({ success: true, data: { paymentQrCodeUrl: result ? `/uploads/${result}` : null } });
  },

  // --- Student-facing: whichever QR they should scan (institution's, or Company's if a direct student) ---
  async getQrCodeForStudent(req: Request, res: Response) {
    if (!req.auth) throw AppError.unauthorized();
    const result = await institutionFeeService.resolveQrCodeForStudent(req.auth.lawFirmId ?? null);
    res.status(200).json({ success: true, data: { paymentQrCodeUrl: result ? `/uploads/${result}` : null } });
  },

  // --- Transactions + Excel export ---
  async getSummaryAsInstitution(req: Request, res: Response) {
    const lawFirmId = getScopeLawFirmId(req, true);
    const result = await institutionFeeService.getSummary(lawFirmId as string);
    res.status(200).json({ success: true, data: result });
  },

  async listTransactionsAsCompany(req: Request, res: Response) {
    const search = req.query.search as string | undefined;
    const result = await institutionFeeService.listTransactions(null, search);
    res.status(200).json({ success: true, data: result });
  },
  async exportTransactionsAsCompany(req: Request, res: Response) {
    const search = req.query.search as string | undefined;
    const buffer = await institutionFeeService.exportTransactionsExcel(null, search);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", 'attachment; filename="payments-report.xlsx"');
    res.send(buffer);
  },
  async listTransactionsAsInstitution(req: Request, res: Response) {
    const lawFirmId = getScopeLawFirmId(req, true);
    const search = req.query.search as string | undefined;
    const result = await institutionFeeService.listTransactions(lawFirmId, search);
    res.status(200).json({ success: true, data: result });
  },
  async exportTransactionsAsInstitution(req: Request, res: Response) {
    const lawFirmId = getScopeLawFirmId(req, true);
    const search = req.query.search as string | undefined;
    const buffer = await institutionFeeService.exportTransactionsExcel(lawFirmId, search);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", 'attachment; filename="payments-report.xlsx"');
    res.send(buffer);
  },
};

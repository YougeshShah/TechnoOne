import { Router } from "express";
import { institutionFeeController } from "../controller/institution-fee.controller";
import { authenticate } from "../../../common/middleware/authenticate";
import { authorize } from "../../../common/middleware/authorize";
import { requireTenantPermission } from "../../../common/middleware/requireTenantPermission";
import { qrCodeUpload, mapMulterError } from "../../../common/middleware/upload";

const router = Router();
router.use(authenticate);

// Search students for autocomplete (institution's own students only).
router.get("/search-students", authorize("LAW_FIRM_ADMIN", "LAWYER", "STAFF"), requireTenantPermission("accounting.manage"), institutionFeeController.searchStudents);

// Fee -- Company default vs Institution's own.
router.put("/fee/company", authorize("COMPANY"), institutionFeeController.setFeeAsCompany);
router.get("/fee/company/:courseId", authorize("COMPANY"), institutionFeeController.getFeeAsCompany);
router.put("/fee/institution", authorize("LAW_FIRM_ADMIN", "LAWYER", "STAFF"), requireTenantPermission("accounting.manage"), institutionFeeController.setFeeAsInstitution);
router.get("/fee/institution/:courseId", authorize("LAW_FIRM_ADMIN", "LAWYER", "STAFF"), requireTenantPermission("accounting.manage"), institutionFeeController.getFeeAsInstitution);

// Discounts.
router.put("/discounts", authorize("COMPANY", "LAW_FIRM_ADMIN", "LAWYER", "STAFF"), requireTenantPermission("accounting.manage"), institutionFeeController.grantDiscount);
router.delete("/discounts/:studentId/:courseId", authorize("COMPANY", "LAW_FIRM_ADMIN", "LAWYER", "STAFF"), requireTenantPermission("accounting.manage"), institutionFeeController.removeDiscount);
router.get("/discounts/:courseId", authorize("COMPANY", "LAW_FIRM_ADMIN", "LAWYER", "STAFF"), requireTenantPermission("accounting.manage"), institutionFeeController.listDiscounts);

// Student-facing "what do I owe" check.
router.get("/my-amount-due/:courseId", authorize("STUDENT"), institutionFeeController.myAmountDue);

// Manual payment recording.
router.post("/manual-payment", authorize("COMPANY", "LAW_FIRM_ADMIN", "LAWYER", "STAFF"), requireTenantPermission("accounting.manage"), institutionFeeController.recordManualPayment);

// QR code.
router.post(
  "/qr-code",
  authorize("LAW_FIRM_ADMIN", "LAWYER", "STAFF"),
  requireTenantPermission("accounting.manage"),
  (req, res, next) => {
    qrCodeUpload.single("qrCode")(req, res, (err) => {
      if (err) return next(mapMulterError(err));
      next();
    });
  },
  institutionFeeController.uploadQrCode
);
router.get("/qr-code/my", authorize("LAW_FIRM_ADMIN", "LAWYER", "STAFF"), requireTenantPermission("accounting.manage"), institutionFeeController.getMyQrCode);

// Company's own QR code (for direct students with no institution).
router.post(
  "/qr-code/company",
  authorize("COMPANY"),
  (req, res, next) => {
    qrCodeUpload.single("qrCode")(req, res, (err) => {
      if (err) return next(mapMulterError(err));
      next();
    });
  },
  institutionFeeController.uploadCompanyQrCode
);
router.get("/qr-code/company", authorize("COMPANY"), institutionFeeController.getCompanyQrCode);

// Student-facing: resolves to their institution's QR, or the Company's if they're a direct student.
router.get("/qr-code/student", authorize("STUDENT"), institutionFeeController.getQrCodeForStudent);

// Dashboard summary (total collected, pending count, this-month collected).
router.get("/summary/institution", authorize("LAW_FIRM_ADMIN", "LAWYER", "STAFF"), requireTenantPermission("accounting.manage"), institutionFeeController.getSummaryAsInstitution);

// Transactions + Excel export.
router.get("/transactions/company", authorize("COMPANY"), institutionFeeController.listTransactionsAsCompany);
router.get("/transactions/company/export", authorize("COMPANY"), institutionFeeController.exportTransactionsAsCompany);
router.get("/transactions/institution", authorize("LAW_FIRM_ADMIN", "LAWYER", "STAFF"), requireTenantPermission("accounting.manage"), institutionFeeController.listTransactionsAsInstitution);
router.get("/transactions/institution/export", authorize("LAW_FIRM_ADMIN", "LAWYER", "STAFF"), requireTenantPermission("accounting.manage"), institutionFeeController.exportTransactionsAsInstitution);

export default router;

import ExcelJS from "exceljs";
import { prisma } from "../../../database/prisma";
import { AppError } from "../../../common/errors/AppError";
import { courseService } from "../../course/service/course.service";
import { SetFeeInput, GrantDiscountInput, RecordManualPaymentInput } from "../dto/institution-fee.dto";

export const institutionFeeService = {
  // --- Lightweight search for autocomplete dropdowns (institution's own students only) ---
  async searchStudents(lawFirmId: string | null, query: string) {
    return prisma.user.findMany({
      where: {
        accountType: "STUDENT",
        ...(lawFirmId ? { lawFirmId } : {}),
        OR: [
          { fullName: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
          { phone: { contains: query } },
        ],
      },
      select: { id: true, fullName: true, email: true, phone: true },
      take: 10,
    });
  },

  // --- Fee resolution (same pattern as UsageLimit -- institution's own
  // price for their students if set, otherwise Company's default). ---
  async resolveFee(courseId: string, studentLawFirmId: string | null) {
    if (studentLawFirmId) {
      const institutionFee = await prisma.courseFee.findFirst({ where: { courseId, lawFirmId: studentLawFirmId } });
      if (institutionFee) return institutionFee;
    }
    return prisma.courseFee.findFirst({ where: { courseId, lawFirmId: null } });
  },

  async setFee(input: SetFeeInput, lawFirmId: string | null, updatedBy: string) {
    const existing = await prisma.courseFee.findFirst({ where: { courseId: input.courseId, lawFirmId } });
    if (existing) {
      return prisma.courseFee.update({ where: { id: existing.id }, data: { amount: input.amount, updatedBy } });
    }
    return prisma.courseFee.create({ data: { courseId: input.courseId, lawFirmId, amount: input.amount, updatedBy } });
  },

  async getFee(courseId: string, lawFirmId: string | null) {
    return prisma.courseFee.findFirst({ where: { courseId, lawFirmId } });
  },

  // --- Discounts ---
  async grantDiscount(input: GrantDiscountInput, grantedBy: string) {
    const existing = await prisma.studentDiscount.findFirst({ where: { studentId: input.studentId, courseId: input.courseId } });
    if (existing) {
      return prisma.studentDiscount.update({
        where: { id: existing.id },
        data: { type: input.type, value: input.value, reason: input.reason, grantedBy },
      });
    }
    return prisma.studentDiscount.create({
      data: { studentId: input.studentId, courseId: input.courseId, type: input.type, value: input.value, reason: input.reason, grantedBy },
    });
  },

  async removeDiscount(studentId: string, courseId: string) {
    await prisma.studentDiscount.deleteMany({ where: { studentId, courseId } });
  },

  async listDiscounts(courseId: string) {
    return prisma.studentDiscount.findMany({
      where: { courseId },
      include: { student: { select: { fullName: true, email: true } } },
      orderBy: { createdAt: "desc" },
    });
  },

  // Computes what a specific student actually owes for a course: the
  // resolved fee minus their discount (if any), floored at 0.
  async calculateAmountDue(studentId: string, courseId: string, studentLawFirmId: string | null) {
    const fee = await this.resolveFee(courseId, studentLawFirmId);
    if (!fee) return { fee: null, discount: null, amountDue: null };

    const discount = await prisma.studentDiscount.findFirst({ where: { studentId, courseId } });
    let amountDue = fee.amount;
    let discountAmount = 0;

    if (discount) {
      discountAmount = discount.type === "PERCENTAGE" ? (fee.amount * discount.value) / 100 : discount.value;
      amountDue = Math.max(0, fee.amount - discountAmount);
    }

    return { fee: fee.amount, discount: discountAmount, amountDue };
  },

  // --- Manual payment recording (cash / bank transfer / QR scan) ---
  async recordManualPayment(input: RecordManualPaymentInput, recordedBy: string, lawFirmId: string | null) {
    const { discount } = await this.calculateAmountDue(input.studentId, input.courseId, lawFirmId);

    const transaction = await prisma.paymentTransaction.create({
      data: {
        studentId: input.studentId,
        courseId: input.courseId,
        gateway: "MANUAL",
        transactionUuid: `manual-${Date.now()}-${input.studentId.slice(0, 8)}`,
        amount: input.amount,
        discountAmount: discount || undefined,
        status: "COMPLETED",
        paymentMethod: input.paymentMethod,
        receiptNumber: input.receiptNumber,
        recordedBy,
      },
    });

    await courseService.grantSubscription(input.studentId, input.courseId);
    return transaction;
  },

  // --- QR code ---
  async setPaymentQrCode(lawFirmId: string, relativePath: string) {
    return prisma.lawFirm.update({ where: { id: lawFirmId }, data: { paymentQrCodeUrl: relativePath } });
  },

  async getPaymentQrCode(lawFirmId: string) {
    const firm = await prisma.lawFirm.findUnique({ where: { id: lawFirmId }, select: { paymentQrCodeUrl: true } });
    return firm?.paymentQrCodeUrl ?? null;
  },

  // --- Company's own QR code (for direct students -- no institution) ---
  async getOrCreateCompanySettings() {
    let settings = await prisma.companySettings.findFirst();
    if (!settings) settings = await prisma.companySettings.create({ data: {} });
    return settings;
  },

  async setCompanyQrCode(relativePath: string) {
    const settings = await this.getOrCreateCompanySettings();
    return prisma.companySettings.update({ where: { id: settings.id }, data: { paymentQrCodeUrl: relativePath } });
  },

  async getCompanyQrCode() {
    const settings = await prisma.companySettings.findFirst();
    return settings?.paymentQrCodeUrl ?? null;
  },

  // Which QR should a student see -- their institution's if it has one set,
  // otherwise the Company's own (covers direct students with no institution).
  async resolveQrCodeForStudent(lawFirmId: string | null) {
    if (lawFirmId) {
      const institutionQr = await this.getPaymentQrCode(lawFirmId);
      if (institutionQr) return institutionQr;
    }
    return this.getCompanyQrCode();
  },

  // --- Transactions list + Excel export ---
  // search matches against the student's name, email, or phone number --
  // real-world need: staff looking up "did this specific student pay"
  // rather than scrolling a long list.
  async getSummary(lawFirmId: string) {
    const [totalResult, pendingCount, thisMonthResult] = await Promise.all([
      prisma.paymentTransaction.aggregate({
        where: { student: { lawFirmId }, status: "COMPLETED" },
        _sum: { amount: true },
      }),
      prisma.paymentTransaction.count({ where: { student: { lawFirmId }, status: "PENDING" } }),
      prisma.paymentTransaction.aggregate({
        where: {
          student: { lawFirmId },
          status: "COMPLETED",
          createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
        },
        _sum: { amount: true },
      }),
    ]);
    return {
      totalCollected: totalResult._sum.amount ?? 0,
      pendingCount,
      thisMonthCollected: thisMonthResult._sum.amount ?? 0,
    };
  },

  async listTransactions(lawFirmId: string | null, search?: string) {
    const where: any = lawFirmId ? { student: { lawFirmId } } : {};
    if (search) {
      where.student = {
        ...where.student,
        OR: [
          { fullName: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { phone: { contains: search } },
        ],
      };
    }
    return prisma.paymentTransaction.findMany({
      where,
      include: { student: { select: { fullName: true, email: true, phone: true } }, course: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 1000,
    });
  },

  async exportTransactionsExcel(lawFirmId: string | null, search?: string): Promise<Buffer> {
    const transactions = await this.listTransactions(lawFirmId, search);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "TechnoOne";
    const sheet = workbook.addWorksheet("Payments");

    sheet.columns = [
      { header: "Date", key: "date", width: 14 },
      { header: "Student", key: "student", width: 24 },
      { header: "Email", key: "email", width: 26 },
      { header: "Phone", key: "phone", width: 16 },
      { header: "Course", key: "course", width: 20 },
      { header: "Amount (NPR)", key: "amount", width: 14 },
      { header: "Discount (NPR)", key: "discount", width: 14 },
      { header: "Gateway", key: "gateway", width: 12 },
      { header: "Method", key: "method", width: 14 },
      { header: "Receipt No.", key: "receipt", width: 16 },
      { header: "Status", key: "status", width: 12 },
    ];
    sheet.getRow(1).font = { bold: true };

    for (const t of transactions) {
      sheet.addRow({
        date: t.createdAt.toISOString().slice(0, 10),
        student: (t as any).student?.fullName ?? "",
        email: (t as any).student?.email ?? "",
        phone: (t as any).student?.phone ?? "",
        course: (t as any).course?.name ?? "",
        amount: t.amount,
        discount: t.discountAmount ?? 0,
        gateway: t.gateway,
        method: t.paymentMethod ?? "",
        receipt: t.receiptNumber ?? "",
        status: t.status,
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  },
};

import { prisma } from "../../../database/prisma";
import { LawFirmStatus, Prisma, AccountType, TenantType } from "@prisma/client";

type AuditMetadata = Record<string, unknown>;

export const lawFirmRepository = {
  findPublicInstitutions() {
    return prisma.lawFirm.findMany({
      where: { tenantType: "EDUCATION", status: "ACTIVE", slug: { not: null } },
      select: { id: true, name: true, slug: true },
      orderBy: { name: "asc" },
    });
  },
  async findMany(params: { status?: LawFirmStatus; search?: string; skip: number; take: number }) {
    const where: Prisma.LawFirmWhereInput = {
      ...(params.status ? { status: params.status } : {}),
      ...(params.search
        ? {
            OR: [
              { name: { contains: params.search, mode: "insensitive" } },
              { email: { contains: params.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.lawFirm.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { createdAt: "desc" },
        include: {
          _count: { select: { users: true, clients: true, cases: true } },
        },
      }),
      prisma.lawFirm.count({ where }),
    ]);

    return { items, total };
  },

  findById(id: string) {
    return prisma.lawFirm.findUnique({
      where: { id },
      include: {
        users: {
          where: { accountType: "LAW_FIRM_ADMIN" },
          select: { id: true, fullName: true, email: true, phone: true, status: true, createdAt: true },
        },
        _count: { select: { users: true, clients: true, cases: true } },
      },
    });
  },

  updateStatus(id: string, status: LawFirmStatus, approvedBy?: string) {
    return prisma.lawFirm.update({
      where: { id },
      data: {
        status,
        ...(status === "ACTIVE" ? { approvedAt: new Date(), approvedBy } : {}),
      },
    });
  },

  updateModules(id: string, modulesEnabled: string[], allowedCourseIds?: string[], allowedExamTypes?: string[]) {
    return prisma.lawFirm.update({
      where: { id },
      data: {
        modulesEnabled,
        ...(allowedCourseIds !== undefined ? { allowedCourseIds } : {}),
        ...(allowedExamTypes !== undefined ? { allowedExamTypes } : {}),
      },
    });
  },

  createAuditLog(params: { userId: string; action: string; entityId: string; metadata?: AuditMetadata }) {
    return prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        entityType: "LawFirm",
        entityId: params.entityId,
        metadata: params.metadata as Prisma.InputJsonValue | undefined,
      },
    });
  },

  findUserByEmail(email: string) {
    return prisma.user.findFirst({ where: { email } });
  },

  /**
   * Company staff manually onboards a law firm — unlike self-registration
   * (which starts PENDING and needs approval), a firm created directly by
   * Company is trusted immediately and goes straight to ACTIVE.
   */
  // Converts an organization name into a URL-safe slug used for its
  // wildcard subdomain (e.g. "sitalawfirm.portal.technocraftx.com"),
  // appending a number if the base slug is already taken by another firm.
  async generateUniqueSlug(tx: Prisma.TransactionClient, name: string): Promise<string> {
    const base = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "org";
    let candidate = base;
    let suffix = 1;
    while (await tx.lawFirm.findFirst({ where: { slug: candidate } })) {
      suffix += 1;
      candidate = `${base}-${suffix}`;
    }
    return candidate;
  },

  async createWithAdmin(params: {
    lawFirmName: string;
    lawFirmEmail: string;
    adminFullName: string;
    adminEmail: string;
    adminPhone?: string;
    passwordHash: string;
    mustChangePassword?: boolean;
    tenantType: TenantType;
    modulesEnabled: string[];
    allowedCourseIds: string[];
    allowedExamTypes: string[];
  }) {
    return prisma.$transaction(async (tx) => {
      const slug = await this.generateUniqueSlug(tx, params.lawFirmName);
      const lawFirm = await tx.lawFirm.create({
        data: {
          name: params.lawFirmName,
          email: params.lawFirmEmail.toLowerCase().trim(),
          status: "ACTIVE",
          tenantType: params.tenantType,
          modulesEnabled: params.modulesEnabled,
          allowedCourseIds: params.allowedCourseIds,
          allowedExamTypes: params.allowedExamTypes,
          slug,
        },
      });

      const admin = await tx.user.create({
        data: {
          accountType: AccountType.LAW_FIRM_ADMIN,
          fullName: params.adminFullName,
          email: params.adminEmail.toLowerCase().trim(),
          phone: params.adminPhone,
          passwordHash: params.passwordHash,
          mustChangePassword: params.mustChangePassword ?? false,
          emailVerified: true, // created directly by Company -- trusted, no self-registration verification needed
          status: "ACTIVE",
          lawFirmId: lawFirm.id,
        },
      });

      return { lawFirm, admin };
    });
  },

  async deleteCascade(lawFirmId: string) {
    await prisma.$transaction(async (tx) => {
      // Students keep their account — just unlink from this institution.
      await tx.user.updateMany({ where: { lawFirmId, accountType: "STUDENT" }, data: { lawFirmId: null } });

      // Organization-owned learning content.
      await tx.mockTestQuestion.deleteMany({ where: { mockTest: { hostLawFirmId: lawFirmId } } });
      await tx.testSection.deleteMany({ where: { mockTest: { hostLawFirmId: lawFirmId } } });
      await tx.mockTest.deleteMany({ where: { hostLawFirmId: lawFirmId } });
      await tx.mcqQuestion.deleteMany({ where: { hostLawFirmId: lawFirmId } });
      await tx.libraryResource.deleteMany({ where: { hostLawFirmId: lawFirmId } }).catch(() => {});

      // Case management data.
      await tx.document.deleteMany({ where: { lawFirmId } });
      await tx.hearing.deleteMany({ where: { case: { lawFirmId } } }).catch(() => {});
      await tx.case.deleteMany({ where: { lawFirmId } });
      await tx.client.deleteMany({ where: { lawFirmId } });

      // Staff accounts (not students) belong exclusively to this org.
      await tx.user.deleteMany({ where: { lawFirmId, accountType: { in: ["LAWYER", "STAFF", "LAW_FIRM_ADMIN"] } } });

      // Tenant-specific roles.
      await tx.role.deleteMany({ where: { lawFirmId } });

      // Everything added in later features that also has a lawFirmId FK --
      // without these, delete fails with a foreign key constraint error
      // instead of actually removing the organization.
      await tx.firmSubscription.deleteMany({ where: { lawFirmId } }).catch(() => {});
      await tx.courseFee.deleteMany({ where: { lawFirmId } }).catch(() => {});
      await tx.paymentVoucher.deleteMany({ where: { student: { lawFirmId } } }).catch(() => {});
      await tx.staffSalary.deleteMany({ where: { lawFirmId } }).catch(() => {});
      await tx.invoice.deleteMany({ where: { lawFirmId } }).catch(() => {});
      await tx.usageLimit.deleteMany({ where: { lawFirmId } }).catch(() => {});
      await tx.courseContent.deleteMany({ where: { lawFirmId } }).catch(() => {});
      await tx.liveClass.deleteMany({ where: { hostLawFirmId: lawFirmId } }).catch(() => {});
      await tx.paymentTransaction.deleteMany({ where: { student: { lawFirmId } } }).catch(() => {});

      await tx.lawFirm.delete({ where: { id: lawFirmId } });
    });
  },
  countCreatedBetween(start: Date, end: Date) {
    return prisma.lawFirm.count({ where: { createdAt: { gte: start, lt: end } } });
  },

  findMySettings(id: string) {
    return prisma.lawFirm.findUnique({
      where: { id },
      select: { id: true, name: true, allowRecordingScreenshots: true },
    });
  },

  updateMySettings(id: string, data: { allowRecordingScreenshots?: boolean }) {
    return prisma.lawFirm.update({
      where: { id },
      data,
      select: { id: true, name: true, allowRecordingScreenshots: true },
    });
  },
};

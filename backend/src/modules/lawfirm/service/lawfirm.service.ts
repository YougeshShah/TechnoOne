import { prisma } from "../../../database/prisma";
import { emailVerificationService } from "../../email-verification/service/email-verification.service";
import { AppError } from "../../../common/errors/AppError";
import { hashPassword } from "../../../common/utils/password";
import { lawFirmRepository } from "../repository/lawfirm.repository";
import { ListLawFirmsQuery, CreateLawFirmInput, UpdateMySettingsInput } from "../dto/lawfirm.dto";

// Generates a readable-but-random temporary password -- excludes
// visually-confusable characters (0/O, 1/l/I) since a Company staff member
// reads this off a screen and has to relay it to the institution.
function generateTemporaryPassword(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let pw = "";
  for (let i = 0; i < 10; i++) {
    pw += chars[Math.floor(Math.random() * chars.length)];
  }
  return pw;
}

export const lawFirmService = {
  async listPublicInstitutions() {
    return lawFirmRepository.findPublicInstitutions();
  },
  async create(input: CreateLawFirmInput, createdByUserId: string) {
    // No duplicate-email check here -- this always creates a brand new
    // organization with its own lawFirmId, so the same admin email existing
    // under a different (or no) organization is expected and fine.

    // Company no longer sets the institution admin's password directly --
    // a random temporary one is generated instead, and the admin is
    // required to change it on first login (mustChangePassword).
    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await hashPassword(temporaryPassword);
    const { lawFirm, admin } = await lawFirmRepository.createWithAdmin({
      lawFirmName: input.lawFirmName,
      lawFirmEmail: input.lawFirmEmail,
      adminFullName: input.adminFullName,
      adminEmail: input.adminEmail,
      adminPhone: input.adminPhone,
      passwordHash,
      mustChangePassword: true,
      tenantType: input.tenantType as any,
      modulesEnabled: input.modulesEnabled,
      allowedCourseIds: input.allowedCourseIds,
      allowedExamTypes: input.allowedExamTypes,
    });

    await lawFirmRepository.createAuditLog({
      userId: createdByUserId,
      action: "LAW_FIRM_CREATED_MANUALLY",
      entityId: lawFirm.id,
      metadata: { lawFirmName: lawFirm.name, adminEmail: admin.email },
    });

    // Every new organization needs at least a couple of usable roles from
    // day one -- without this, the admin's first "Add Staff" hits a wall:
    // requireTenantPermission fails closed for any user with no role at
    // all, so a brand new staff member could do literally nothing until
    // someone manually built a role and its permissions from scratch.
    await this.seedDefaultRoles(lawFirm.id);

    return { lawFirm, admin: { id: admin.id, fullName: admin.fullName, email: admin.email }, temporaryPassword };
  },

  async list(query: ListLawFirmsQuery) {
    const skip = (query.page - 1) * query.limit;

    const { items, total } = await lawFirmRepository.findMany({
      status: query.status,
      search: query.search,
      skip,
      take: query.limit,
    });

    return {
      items: items.map((firm) => ({
        id: firm.id,
        name: firm.name,
        email: firm.email,
        status: firm.status,
        registrationNo: firm.registrationNo,
        modulesEnabled: firm.modulesEnabled,
        allowedCourseIds: (firm as any).allowedCourseIds,
        allowedExamTypes: (firm as any).allowedExamTypes,
        tenantType: (firm as any).tenantType,
        stats: {
          totalUsers: firm._count.users,
          totalClients: firm._count.clients,
          totalCases: firm._count.cases,
        },
        createdAt: firm.createdAt,
      })),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  },

  async getById(id: string) {
    const firm = await lawFirmRepository.findById(id);
    if (!firm) {
      throw AppError.notFound("Law firm not found");
    }
    return firm;
  },

  /**
   * Approve a PENDING law firm. Only PENDING firms can be approved.
   * Approval activates the firm — its admin/lawyers can now fully use the platform.
   */
  async approve(id: string, approvedByUserId: string) {
    const firm = await lawFirmRepository.findById(id);
    if (!firm) {
      throw AppError.notFound("Law firm not found");
    }
    if (firm.status !== "PENDING") {
      throw AppError.badRequest(`Only PENDING law firms can be approved. Current status: ${firm.status}`);
    }

    const updated = await lawFirmRepository.updateStatus(id, "ACTIVE", approvedByUserId);

    // The firm itself is now ACTIVE, but its admin account was created
    // PENDING_VERIFICATION -- activate it too, then send a verification
    // code to their email. Login stays blocked (via emailVerified check)
    // until they enter that code, even though the firm is approved.
    const adminUser = (firm as any).users?.[0];
    if (adminUser) {
      await prisma.user.update({ where: { id: adminUser.id }, data: { status: "ACTIVE" } });
      await emailVerificationService.sendCode(adminUser.email, "REGISTRATION").catch((err: unknown) => {
        console.error("Failed to send law firm admin verification email:", err);
      });
    }

    await lawFirmRepository.createAuditLog({
      userId: approvedByUserId,
      action: "LAW_FIRM_APPROVED",
      entityId: id,
      metadata: { firmName: firm.name },
    });

    return updated;
  },

  /**
   * Suspend an ACTIVE law firm. Suspended firms lose access until reactivated.
   */
  async suspend(id: string, suspendedByUserId: string, reason?: string) {
    const firm = await lawFirmRepository.findById(id);
    if (!firm) {
      throw AppError.notFound("Law firm not found");
    }
    if (firm.status !== "ACTIVE") {
      throw AppError.badRequest(`Only ACTIVE law firms can be suspended. Current status: ${firm.status}`);
    }

    const updated = await lawFirmRepository.updateStatus(id, "SUSPENDED");

    await lawFirmRepository.createAuditLog({
      userId: suspendedByUserId,
      action: "LAW_FIRM_SUSPENDED",
      entityId: id,
      metadata: { firmName: firm.name, reason: reason ?? null },
    });

    return updated;
  },

  /**
   * Reactivate a previously SUSPENDED law firm.
   */
  async activate(id: string, activatedByUserId: string) {
    const firm = await lawFirmRepository.findById(id);
    if (!firm) {
      throw AppError.notFound("Law firm not found");
    }
    if (firm.status !== "SUSPENDED") {
      throw AppError.badRequest(`Only SUSPENDED law firms can be reactivated. Current status: ${firm.status}`);
    }

    const updated = await lawFirmRepository.updateStatus(id, "ACTIVE");

    await lawFirmRepository.createAuditLog({
      userId: activatedByUserId,
      action: "LAW_FIRM_REACTIVATED",
      entityId: id,
      metadata: { firmName: firm.name },
    });

    return updated;
  },

  /**
   * Reject a PENDING law firm registration.
   */
  async reject(id: string, rejectedByUserId: string, reason?: string) {
    const firm = await lawFirmRepository.findById(id);
    if (!firm) {
      throw AppError.notFound("Law firm not found");
    }
    if (firm.status !== "PENDING") {
      throw AppError.badRequest(`Only PENDING law firms can be rejected. Current status: ${firm.status}`);
    }

    const updated = await lawFirmRepository.updateStatus(id, "REJECTED");

    await lawFirmRepository.createAuditLog({
      userId: rejectedByUserId,
      action: "LAW_FIRM_REJECTED",
      entityId: id,
      metadata: { firmName: firm.name, reason: reason ?? null },
    });

    return updated;
  },

  async updateModules(id: string, modulesEnabled: string[], updatedByUserId: string, allowedCourseIds?: string[], allowedExamTypes?: string[]) {
    const firm = await lawFirmRepository.findById(id);
    if (!firm) {
      throw AppError.notFound("Organization not found");
    }

    const updated = await lawFirmRepository.updateModules(id, modulesEnabled, allowedCourseIds, allowedExamTypes);

    await lawFirmRepository.createAuditLog({
      userId: updatedByUserId,
      action: "LAW_FIRM_MODULES_UPDATED",
      entityId: id,
      metadata: { firmName: firm.name, previousModules: firm.modulesEnabled, newModules: modulesEnabled, allowedCourseIds, allowedExamTypes },
    });

    return updated;
  },

  // Permanently removes an organization and everything that belongs
  // exclusively to it — cases, clients, documents, hearings, roles, and
  // any question bank/mock test/library content it created (hostLawFirmId).
  // Staff accounts (Lawyer/Staff/Admin) are deleted along with it, since
  // they only exist as employees of this organization. STUDENT accounts
  // are NOT deleted — they're only unlinked (lawFirmId set to null) so a
  // student's own login, progress, and history survive their institution
  // being removed.
  async remove(id: string) {
    const firm = await lawFirmRepository.findById(id);
    if (!firm) {
      throw AppError.notFound("Organization not found");
    }
    await lawFirmRepository.deleteCascade(id);
  },
  // Monthly organization registration counts for the last N months --
  // powers the growth chart on the Company dashboard.
  async monthlyGrowth(months: number = 6) {
    const now = new Date();
    const results: { month: string; count: number }[] = [];
    for (let i = months - 1; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const count = await lawFirmRepository.countCreatedBetween(start, end);
      results.push({ month: start.toLocaleDateString(undefined, { month: "short", year: "2-digit" }), count });
    }
    return results;
  },
  // Creates two starter roles every new organization gets automatically:
  // "Lawyer" (full day-to-day operational access) and "Staff" (support
  // access, minus case creation). Both are marked isSystem so they can't
  // be accidentally deleted, but the admin can still edit their
  // permissions or add more roles later via Roles & Permissions.
  async seedDefaultRoles(lawFirmId: string) {
    const keys = ["case.manage", "client.manage", "hearing.manage", "document.manage"];
    const permissions = await prisma.permission.findMany({ where: { key: { in: keys } } });
    const byKey = new Map(permissions.map((p) => [p.key, p.id]));

    const lawyerRole = await prisma.role.create({
      data: { name: "Lawyer", lawFirmId, isSystem: true, description: "Full day-to-day case, client, hearing, and document access." },
    });
    for (const key of ["case.manage", "client.manage", "hearing.manage", "document.manage"]) {
      const permissionId = byKey.get(key);
      if (permissionId) await prisma.rolePermission.create({ data: { roleId: lawyerRole.id, permissionId } });
    }

    const staffRole = await prisma.role.create({
      data: { name: "Staff", lawFirmId, isSystem: true, description: "Support access to clients, hearings, and documents." },
    });
    for (const key of ["client.manage", "hearing.manage", "document.manage"]) {
      const permissionId = byKey.get(key);
      if (permissionId) await prisma.rolePermission.create({ data: { roleId: staffRole.id, permissionId } });
    }

    return { lawyerRole, staffRole };
  },

  async getMySettings(lawFirmId: string) {
    const firm = await lawFirmRepository.findMySettings(lawFirmId);
    if (!firm) throw AppError.notFound("Institution not found");
    return firm;
  },

  async updateMySettings(lawFirmId: string, input: UpdateMySettingsInput) {
    return lawFirmRepository.updateMySettings(lawFirmId, input);
  },
};

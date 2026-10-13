import sys

def apply(path, patches, label):
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    for name, old, new in patches:
        c = content.count(old)
        print(f"[{label}] {name} anchor count = {c}")
        if c != 1:
            print(f"ERROR: aborting at '{label}/{name}'.")
            sys.exit(1)
        content = content.replace(old, new)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"Patched {path}")


# 1. DTO
dto_path = "src/modules/lawfirm/dto/lawfirm.dto.ts"
dto_old = '''export const suspendLawFirmSchema = z.object({
  reason: z.string().min(3, "Please provide a reason for suspension").optional(),
});
export type SuspendLawFirmInput = z.infer<typeof suspendLawFirmSchema>;'''
dto_new = '''export const suspendLawFirmSchema = z.object({
  reason: z.string().min(3, "Please provide a reason for suspension").optional(),
});
export type SuspendLawFirmInput = z.infer<typeof suspendLawFirmSchema>;

// Self-service settings an institution's own staff (admin, teacher, or
// general staff) can change for their own institution -- distinct from
// updateModulesSchema, which only Company (platform) staff may touch.
export const updateMySettingsSchema = z.object({
  allowRecordingScreenshots: z.boolean(),
});
export type UpdateMySettingsInput = z.infer<typeof updateMySettingsSchema>;'''
apply(dto_path, [("suspend schema block", dto_old, dto_new)], "dto")


# 2. Repository
repo_path = "src/modules/lawfirm/repository/lawfirm.repository.ts"
repo_old = '''  countCreatedBetween(start: Date, end: Date) {
    return prisma.lawFirm.count({ where: { createdAt: { gte: start, lt: end } } });
  },
};'''
repo_new = '''  countCreatedBetween(start: Date, end: Date) {
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
};'''
apply(repo_path, [("countCreatedBetween block", repo_old, repo_new)], "repository")


# 3. Service
service_path = "src/modules/lawfirm/service/lawfirm.service.ts"
service_old = '''import { ListLawFirmsQuery, CreateLawFirmInput } from "../dto/lawfirm.dto";'''
service_new = '''import { ListLawFirmsQuery, CreateLawFirmInput, UpdateMySettingsInput } from "../dto/lawfirm.dto";'''
service_old2 = '''    return { lawyerRole, staffRole };
  },
};'''
service_new2 = '''    return { lawyerRole, staffRole };
  },

  async getMySettings(lawFirmId: string) {
    const firm = await lawFirmRepository.findMySettings(lawFirmId);
    if (!firm) throw AppError.notFound("Institution not found");
    return firm;
  },

  async updateMySettings(lawFirmId: string, input: UpdateMySettingsInput) {
    return lawFirmRepository.updateMySettings(lawFirmId, input);
  },
};'''
apply(
    service_path,
    [("import", service_old, service_new), ("end of service object", service_old2, service_new2)],
    "service",
)


# 4. Controller
controller_path = "src/modules/lawfirm/controller/lawfirm.controller.ts"
controller_old = '''import { listLawFirmsQuerySchema, lawFirmIdParamSchema, suspendLawFirmSchema, createLawFirmSchema, updateModulesSchema } from "../dto/lawfirm.dto";'''
controller_new = '''import { listLawFirmsQuerySchema, lawFirmIdParamSchema, suspendLawFirmSchema, createLawFirmSchema, updateModulesSchema, updateMySettingsSchema } from "../dto/lawfirm.dto";'''
controller_old2 = '''  async updateWebsite(req: Request, res: Response) {
    const { id } = req.params;
    const { websiteHtml } = req.body;
    const firm = await prisma.lawFirm.update({ where: { id }, data: { websiteHtml } });
    res.status(200).json({ success: true, data: { id: firm.id, slug: firm.slug } });
  },
};'''
controller_new2 = '''  async updateWebsite(req: Request, res: Response) {
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
};'''
apply(
    controller_path,
    [("import", controller_old, controller_new), ("end of controller object", controller_old2, controller_new2)],
    "controller",
)


# 5. Routes -- must be registered BEFORE the blanket
# `router.use(authenticate, authorize("COMPANY"))` so institution staff
# (not just Company) can reach it.
routes_path = "src/modules/lawfirm/routes/lawfirm.routes.ts"
routes_old = '''// All law firm management routes are restricted to COMPANY (Technocraftx) accounts.
router.use(authenticate, authorize("COMPANY"));'''
routes_new = '''// Self-service institution settings -- an institution's own admin, teacher,
// or general staff (LAW_FIRM_ADMIN/LAWYER/STAFF) can read/update settings
// for their OWN institution only (see controller.getMySettings/updateMySettings).
router.get("/me/settings", authenticate, authorize("LAW_FIRM_ADMIN", "LAWYER", "STAFF"), lawFirmController.getMySettings);
router.patch("/me/settings", authenticate, authorize("LAW_FIRM_ADMIN", "LAWYER", "STAFF"), lawFirmController.updateMySettings);

// All law firm management routes below are restricted to COMPANY (Technocraftx) accounts.
router.use(authenticate, authorize("COMPANY"));'''
apply(routes_path, [("global middleware", routes_old, routes_new)], "routes")

print("All lawfirm self-service settings patches applied.")

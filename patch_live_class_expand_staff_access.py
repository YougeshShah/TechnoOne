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


# ---------------------------------------------------------------------------
# 1. Service -- add ownership scoping so a class hosted by one institution
# can only be managed by that same institution's own staff (or Company).
# This didn't exist before; adding it now is required *because* we're about
# to let more roles (LAWYER/STAFF, not just LAW_FIRM_ADMIN) touch these
# endpoints, so the blast radius of a missing check would otherwise grow.
# ---------------------------------------------------------------------------
service_path = "src/modules/live-class/service/live-class.service.ts"

service_old_1 = '''export const liveClassService = {'''
service_new_1 = '''// Institution staff (admin, teacher, or general staff) may only manage a
// class hosted by their OWN institution. Company staff can manage any class.
function assertCanManage(liveClass: any, auth: { accountType: string; lawFirmId: string | null }) {
  if (auth.accountType === "COMPANY") return;
  if (liveClass.hostLawFirmId && liveClass.hostLawFirmId === auth.lawFirmId) return;
  throw AppError.forbidden("You don't have access to manage this class.");
}

export const liveClassService = {'''

service_old_2 = '''  async remove(id: string) {
    const cls = await this.getById(id);
    if (cls.status === "LIVE") {
      throw AppError.badRequest("Cannot delete a class that is currently live. End it first.");
    }
    await liveClassRepository.delete(id);
  },'''
service_new_2 = '''  async remove(id: string, auth: { accountType: string; lawFirmId: string | null }) {
    const cls = await this.getById(id);
    assertCanManage(cls, auth);
    if (cls.status === "LIVE") {
      throw AppError.badRequest("Cannot delete a class that is currently live. End it first.");
    }
    await liveClassRepository.delete(id);
  },'''

service_old_3 = '''  async markLive(id: string) {
    await this.getById(id);
    return liveClassRepository.setStatus(id, "LIVE");
  },

  async markEnded(id: string) {
    await this.getById(id);
    return liveClassRepository.setStatus(id, "ENDED");
  },

  async uploadRecording(id: string, recordingUrl: string) {
    await this.getById(id);
    return liveClassRepository.setRecordingUrl(id, recordingUrl);
  },

  async cancel(id: string) {
    await this.getById(id);
    return liveClassRepository.setStatus(id, "CANCELLED");
  },

  async update(id: string, input: { title?: string; description?: string; scheduledAt?: string; durationMinutes?: number; isFreeDemo?: boolean; hostId?: string }) {
    const cls = await this.getById(id);
    if (cls.status !== "SCHEDULED") {
      throw AppError.badRequest(`Only a SCHEDULED class can be edited. Current status: ${cls.status}`);
    }'''
service_new_3 = '''  async markLive(id: string, auth: { accountType: string; lawFirmId: string | null }) {
    const cls = await this.getById(id);
    assertCanManage(cls, auth);
    return liveClassRepository.setStatus(id, "LIVE");
  },

  async markEnded(id: string, auth: { accountType: string; lawFirmId: string | null }) {
    const cls = await this.getById(id);
    assertCanManage(cls, auth);
    return liveClassRepository.setStatus(id, "ENDED");
  },

  async uploadRecording(id: string, recordingUrl: string, auth: { accountType: string; lawFirmId: string | null }) {
    const cls = await this.getById(id);
    assertCanManage(cls, auth);
    return liveClassRepository.setRecordingUrl(id, recordingUrl);
  },

  async cancel(id: string, auth: { accountType: string; lawFirmId: string | null }) {
    const cls = await this.getById(id);
    assertCanManage(cls, auth);
    return liveClassRepository.setStatus(id, "CANCELLED");
  },

  async update(
    id: string,
    input: { title?: string; description?: string; scheduledAt?: string; durationMinutes?: number; isFreeDemo?: boolean; hostId?: string },
    auth: { accountType: string; lawFirmId: string | null }
  ) {
    const cls = await this.getById(id);
    assertCanManage(cls, auth);
    if (cls.status !== "SCHEDULED") {
      throw AppError.badRequest(`Only a SCHEDULED class can be edited. Current status: ${cls.status}`);
    }'''

apply(
    service_path,
    [
        ("export const liveClassService", service_old_1, service_new_1),
        ("remove", service_old_2, service_new_2),
        ("markLive/markEnded/uploadRecording/cancel/update", service_old_3, service_new_3),
    ],
    "service",
)


# ---------------------------------------------------------------------------
# 2. Controller -- pass req.auth through to the newly auth-aware service
# methods, and let LAWYER/STAFF (not just LAW_FIRM_ADMIN) host their own
# institution's classes when creating one.
# ---------------------------------------------------------------------------
controller_path = "src/modules/live-class/controller/live-class.controller.ts"

controller_old_1 = '''    // Company-hosted classes are platform-wide (hostLawFirmId null); an
    // institution admin's classes are scoped to their own tenant.
    const hostLawFirmId = req.auth.accountType === "LAW_FIRM_ADMIN" ? req.auth.lawFirmId ?? undefined : undefined;'''
controller_new_1 = '''    // Company-hosted classes are platform-wide (hostLawFirmId null); any
    // institution staff member's (admin, teacher, or general staff) classes
    // are scoped to their own tenant.
    const isInstitutionStaff = ["LAW_FIRM_ADMIN", "LAWYER", "STAFF"].includes(req.auth.accountType);
    const hostLawFirmId = isInstitutionStaff ? req.auth.lawFirmId ?? undefined : undefined;'''

controller_old_2 = '''  async remove(req: Request, res: Response) {
    const { id } = liveClassIdParamSchema.parse(req.params);
    await liveClassService.remove(id);
    res.status(200).json({ success: true, message: "Live class deleted" });
  },'''
controller_new_2 = '''  async remove(req: Request, res: Response) {
    if (!req.auth) throw AppError.unauthorized();
    const { id } = liveClassIdParamSchema.parse(req.params);
    await liveClassService.remove(id, req.auth);
    res.status(200).json({ success: true, message: "Live class deleted" });
  },'''

controller_old_3 = '''  async markLive(req: Request, res: Response) {
    const { id } = liveClassIdParamSchema.parse(req.params);
    const result = await liveClassService.markLive(id);
    res.status(200).json({ success: true, data: result });
  },

  async markEnded(req: Request, res: Response) {
    const { id } = liveClassIdParamSchema.parse(req.params);
    const result = await liveClassService.markEnded(id);
    res.status(200).json({ success: true, data: result });
  },

  async uploadRecording(req: Request, res: Response) {
    const { id } = liveClassIdParamSchema.parse(req.params);
    const { recordingUrl } = z.object({ recordingUrl: z.string().min(5) }).parse(req.body);
    const result = await liveClassService.uploadRecording(id, recordingUrl);
    res.status(200).json({ success: true, data: result });
  },

  async cancel(req: Request, res: Response) {
    const { id } = liveClassIdParamSchema.parse(req.params);
    const result = await liveClassService.cancel(id);
    res.status(200).json({ success: true, data: result });
  },

  async update(req: Request, res: Response) {
    const { id } = liveClassIdParamSchema.parse(req.params);
    const input = updateLiveClassSchema.parse(req.body);
    const result = await liveClassService.update(id, input);
    res.status(200).json({ success: true, message: "Live class updated", data: result });
  },'''
controller_new_3 = '''  async markLive(req: Request, res: Response) {
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
  },'''

apply(
    controller_path,
    [
        ("create hostLawFirmId", controller_old_1, controller_new_1),
        ("remove", controller_old_2, controller_new_2),
        ("markLive/markEnded/uploadRecording/cancel/update", controller_old_3, controller_new_3),
    ],
    "controller",
)


# ---------------------------------------------------------------------------
# 3. Routes -- let LAWYER/STAFF (an institution's teachers/general staff,
# not just its LAW_FIRM_ADMIN) manage classes for their own institution.
# The new ownership check in the service (above) is what actually keeps
# them scoped to their own institution's classes.
# ---------------------------------------------------------------------------
routes_path = "src/modules/live-class/routes/live-class.routes.ts"

routes_old = '''router.post("/", authorize("COMPANY", "LAW_FIRM_ADMIN"), liveClassController.create);
router.post("/:id/host-join", authorize("COMPANY", "LAW_FIRM_ADMIN"), liveClassController.joinAsHost);
router.patch("/:id/mark-live", authorize("COMPANY", "LAW_FIRM_ADMIN"), liveClassController.markLive);
router.patch("/:id/mark-ended", authorize("COMPANY", "LAW_FIRM_ADMIN"), liveClassController.markEnded);
router.patch("/:id/recording", authorize("COMPANY", "LAW_FIRM_ADMIN"), liveClassController.uploadRecording);
router.patch("/:id/cancel", authorize("COMPANY", "LAW_FIRM_ADMIN"), liveClassController.cancel);
router.patch("/:id", authorize("COMPANY", "LAW_FIRM_ADMIN"), liveClassController.update);
router.delete("/:id", authorize("COMPANY", "LAW_FIRM_ADMIN"), liveClassController.remove);'''
routes_new = '''router.post("/", authorize("COMPANY", "LAW_FIRM_ADMIN", "LAWYER", "STAFF"), liveClassController.create);
router.post("/:id/host-join", authorize("COMPANY", "LAW_FIRM_ADMIN", "LAWYER", "STAFF"), liveClassController.joinAsHost);
router.patch("/:id/mark-live", authorize("COMPANY", "LAW_FIRM_ADMIN", "LAWYER", "STAFF"), liveClassController.markLive);
router.patch("/:id/mark-ended", authorize("COMPANY", "LAW_FIRM_ADMIN", "LAWYER", "STAFF"), liveClassController.markEnded);
router.patch("/:id/recording", authorize("COMPANY", "LAW_FIRM_ADMIN", "LAWYER", "STAFF"), liveClassController.uploadRecording);
router.patch("/:id/cancel", authorize("COMPANY", "LAW_FIRM_ADMIN", "LAWYER", "STAFF"), liveClassController.cancel);
router.patch("/:id", authorize("COMPANY", "LAW_FIRM_ADMIN", "LAWYER", "STAFF"), liveClassController.update);
router.delete("/:id", authorize("COMPANY", "LAW_FIRM_ADMIN", "LAWYER", "STAFF"), liveClassController.remove);'''

apply(routes_path, [("authorize lists", routes_old, routes_new)], "routes")

print("All live-class staff-access-expansion patches applied.")

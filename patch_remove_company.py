import pathlib

path = pathlib.Path("src/modules/messaging/service/messaging.service.ts")
text = path.read_text()

replacements = [
    (
        '''function canMessage(
  a: { accountType: string; lawFirmId: string | null },
  b: { accountType: string; lawFirmId: string | null }
): boolean {
  if (a.accountType === "COMPANY") return b.accountType === "LAW_FIRM_ADMIN";
  if (b.accountType === "COMPANY") return a.accountType === "LAW_FIRM_ADMIN";

  if (a.accountType === "CLIENT") {''',
        '''function canMessage(
  a: { accountType: string; lawFirmId: string | null },
  b: { accountType: string; lawFirmId: string | null }
): boolean {
  // Institution/Law firm <-> Company now goes through the Support Ticket
  // system instead of real-time chat -- Company is never a valid
  // messaging counterpart here.
  if (a.accountType === "COMPANY" || b.accountType === "COMPANY") return false;

  if (a.accountType === "CLIENT") {''',
    ),
    (
        '''    if (me.accountType === "COMPANY") {
      return prisma.user.findMany({
        where: { accountType: "LAW_FIRM_ADMIN", status: "ACTIVE" },
        select: contactSelect,
        orderBy: { fullName: "asc" },
      });
    }

    if (me.accountType === "CLIENT" || me.accountType === "STUDENT") {''',
        '''    // Company staff have no real-time messaging counterparts -- they use
    // the Support Ticket inbox instead.
    if (me.accountType === "COMPANY") {
      return [];
    }

    if (me.accountType === "CLIENT" || me.accountType === "STUDENT") {''',
    ),
    (
        '''    // LAWYER / LAW_FIRM_ADMIN / STAFF -- their own clients & students, plus
    // Company support for the tenant admin.
    const where: any = {
      status: "ACTIVE",
      OR: [{ lawFirmId: me.lawFirmId, accountType: { in: ["CLIENT", "STUDENT"] } }],
    };
    if (me.accountType === "LAW_FIRM_ADMIN") {
      where.OR.push({ accountType: "COMPANY" });
    }
    return prisma.user.findMany({ where, select: contactSelect, orderBy: { fullName: "asc" } });''',
        '''    // LAWYER / LAW_FIRM_ADMIN / STAFF -- their own clients & students.
    // Company support is handled by the Support Ticket system, not chat.
    const where: any = {
      status: "ACTIVE",
      OR: [{ lawFirmId: me.lawFirmId, accountType: { in: ["CLIENT", "STUDENT"] } }],
    };
    return prisma.user.findMany({ where, select: contactSelect, orderBy: { fullName: "asc" } });''',
    ),
]

missing = [old for old, _ in replacements if text.count(old) != 1]
if missing:
    print(f"ERROR: {len(missing)} anchor(s) not found exactly once. Aborting -- file may differ from what this patch expects.")
    for m in missing:
        print("---- missing anchor ----")
        print(m[:200])
    raise SystemExit(1)

for old, new in replacements:
    text = text.replace(old, new, 1)

path.write_text(text)
print("Patched src/modules/messaging/service/messaging.service.ts successfully:")
print("  - canMessage() now rejects COMPANY entirely (moved to Support Tickets)")
print("  - listContacts() returns [] for COMPANY and no longer offers COMPANY as a contact for LAW_FIRM_ADMIN")

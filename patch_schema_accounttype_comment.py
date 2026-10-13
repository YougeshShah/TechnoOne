import sys

path = "prisma/schema.prisma"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = '''enum AccountType {
  COMPANY // TrailBlaze Tech staff (Super Admin, Library Manager, etc.)
  LAW_FIRM_ADMIN // Owner/Admin of a law firm tenant
  LAWYER
  STAFF // Receptionist, Legal Assistant, Intern
  CLIENT
  STUDENT // Phase 2 — Student Learning Platform (self-registered, no law firm)
}'''

new = '''// NOTE: these names date back to when this platform served law firms
// only. An EDUCATION-type tenant (an IELTS/coaching institute, see
// TenantType below) reuses the exact same values -- LAW_FIRM_ADMIN is that
// institution's admin, LAWYER/STAFF are its teachers/general staff. Do not
// assume any of these names imply an actual law firm; check tenantType.
enum AccountType {
  COMPANY // TrailBlaze Tech staff (Super Admin, Library Manager, etc.)
  LAW_FIRM_ADMIN // Owner/Admin of a tenant -- a law firm OR an education institute
  LAWYER // A tenant's teacher/senior staff (law firm: lawyer; institute: teacher)
  STAFF // A tenant's general/support staff (law firm: receptionist/assistant/intern; institute: general staff)
  CLIENT
  STUDENT // Phase 2 — Student Learning Platform (self-registered, no law firm)
}'''

c = content.count(old)
print(f"anchor count = {c}")
if c != 1:
    print("ERROR: aborting.")
    sys.exit(1)
content = content.replace(old, new)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("Patched prisma/schema.prisma (clarifying comment on AccountType, no value changes)")

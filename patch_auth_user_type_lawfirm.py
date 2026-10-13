import sys

path = "src/types/index.ts"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = '''export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  avatarUrl?: string | null;
  accountType: "STUDENT";
  tenantName?: string | null;
}'''

new = '''export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  avatarUrl?: string | null;
  accountType: "STUDENT";
  tenantName?: string | null;
  // Only present on the full /auth/me response (profileApi.getMe), not on
  // the login response -- carries the student's institution settings.
  lawFirm?: { allowRecordingScreenshots?: boolean } | null;
}'''

c = content.count(old)
print(f"anchor count = {c}")
if c != 1:
    print("ERROR: aborting.")
    sys.exit(1)
content = content.replace(old, new)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("Patched src/types/index.ts (AuthUser.lawFirm.allowRecordingScreenshots)")

import sys

path = "src/api/index.ts"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = '''  async submitWriting(sectionId: string, attemptId: string, essayText: string) {
    const { data } = await apiClient.post<ApiSuccess<any>>("/writing-submissions", { sectionId, attemptId, essayText });
    return data.data;
  },
};'''

new = '''  async submitWriting(sectionId: string, attemptId: string, essayText: string) {
    const { data } = await apiClient.post<ApiSuccess<any>>("/writing-submissions", { sectionId, attemptId, essayText });
    return data.data;
  },

  // --- Anti-cheating (proctoring) ---

  async uploadProctoringSnapshot(attemptId: string, fileUri: string) {
    const formData = new FormData();
    formData.append("snapshot", { uri: fileUri, name: "snapshot.jpg", type: "image/jpeg" } as any);
    const { data } = await apiClient.post<ApiSuccess<any>>(`/mock-tests/attempts/${attemptId}/proctoring-snapshot`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data.data;
  },

  async recordViolation(attemptId: string) {
    const { data } = await apiClient.post<ApiSuccess<{ appLeftCount: number; flagged: boolean }>>(
      `/mock-tests/attempts/${attemptId}/violation`
    );
    return data.data;
  },
};'''

c = content.count(old)
print(f"anchor count = {c}")
if c != 1:
    print("ERROR: aborting.")
    sys.exit(1)
content = content.replace(old, new)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("Patched src/api/index.ts (added uploadProctoringSnapshot, recordViolation to mockTestApi)")

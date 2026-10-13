import sys

# Run this from the portal-mobile/ root directory. Run AFTER patch_liveclass_api.py.

path = 'src/api/liveClass.api.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old = '''  async cancel(id: string): Promise<void> {
    await apiClient.patch(`/live-classes/${id}/cancel`);
  },
};'''

new = '''  async cancel(id: string): Promise<void> {
    await apiClient.patch(`/live-classes/${id}/cancel`);
  },

  async uploadRecording(id: string, recordingUrl: string): Promise<void> {
    await apiClient.patch(`/live-classes/${id}/recording`, { recordingUrl });
  },
};'''

c = content.count(old)
print(f'liveClass.api.ts (recording) anchor count = {c}')
if c != 1:
    print('ERROR: aborting.')
    sys.exit(1)
content = content.replace(old, new)
with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Patched src/api/liveClass.api.ts (added uploadRecording)')

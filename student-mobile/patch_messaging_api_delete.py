import sys

# Run this from EACH mobile app's root directory (portal-mobile, client-mobile,
# student-mobile) -- the file is identical in all three.

path = 'src/api/messaging.api.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old = '''  async unreadCount(): Promise<number> {
    const { data } = await apiClient.get("/messaging/unread-count");
    return data.data.count;
  },
};'''

new = '''  async unreadCount(): Promise<number> {
    const { data } = await apiClient.get("/messaging/unread-count");
    return data.data.count;
  },

  async deleteMessage(messageId: string): Promise<void> {
    await apiClient.delete(`/messaging/messages/${messageId}`);
  },
};'''

c = content.count(old)
print(f'messaging.api.ts anchor count = {c}')
if c != 1:
    print('ERROR: aborting.')
    sys.exit(1)
content = content.replace(old, new)
with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Patched src/api/messaging.api.ts')

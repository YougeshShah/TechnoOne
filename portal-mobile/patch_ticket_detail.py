import sys

# Run this from the portal-mobile/ root directory.

path = 'app/tickets/[id].tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old1 = '''import { useLocalSearchParams, useNavigation } from "expo-router";
import { Ionicons } from "@expo/vector-icons";'''

new1 = '''import { useLocalSearchParams, useNavigation } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";'''

c1 = content.count(old1)
print(f'imports anchor count = {c1}')
if c1 != 1:
    print('ERROR: aborting (imports).')
    sys.exit(1)
content = content.replace(old1, new1)

old2 = '''  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const listRef = useRef<FlatList>(null);'''

new2 = '''  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const listRef = useRef<FlatList>(null);
  const insets = useSafeAreaInsets();'''

c2 = content.count(old2)
print(f'state anchor count = {c2}')
if c2 != 1:
    print('ERROR: aborting (state).')
    sys.exit(1)
content = content.replace(old2, new2)

old3 = '''          <View style={styles.inputRow}>
            <TouchableOpacity onPress={handleAttach} style={styles.attachButton} disabled={submitting}>
              <Ionicons name="attach" size={22} color={colors.primary} />
            </TouchableOpacity>
            <TextInput style={styles.input} placeholder="Reply..." value={replyText} onChangeText={setReplyText} multiline editable={!submitting} />
            <TouchableOpacity style={styles.sendButton} onPress={handleReply} disabled={(!replyText.trim() && !pendingFile) || submitting}>
              {submitting ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={18} color="#fff" />}
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <View style={styles.closedBanner}>
          <Text style={styles.closedBannerText}>This ticket is closed.</Text>
        </View>
      )}'''

new3 = '''          <View style={[styles.inputRow, { paddingBottom: spacing.md + insets.bottom }]}>
            <TouchableOpacity onPress={handleAttach} style={styles.attachButton} disabled={submitting}>
              <Ionicons name="attach" size={22} color={colors.primary} />
            </TouchableOpacity>
            <TextInput style={styles.input} placeholder="Reply..." value={replyText} onChangeText={setReplyText} multiline editable={!submitting} />
            <TouchableOpacity style={styles.sendButton} onPress={handleReply} disabled={(!replyText.trim() && !pendingFile) || submitting}>
              {submitting ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={18} color="#fff" />}
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <View style={[styles.closedBanner, { paddingBottom: spacing.md + insets.bottom }]}>
          <Text style={styles.closedBannerText}>This ticket is closed.</Text>
        </View>
      )}'''

c3 = content.count(old3)
print(f'input-row anchor count = {c3}')
if c3 != 1:
    print('ERROR: aborting (input row).')
    sys.exit(1)
content = content.replace(old3, new3)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Patched app/tickets/[id].tsx')

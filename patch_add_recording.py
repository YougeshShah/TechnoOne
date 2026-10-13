import sys

# Run this from the portal-mobile/ root directory.

path = 'app/live-classes.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add uploadRecording API method reference + local state/mutation.
old1 = '''  const cancelClass = useMutation({
    mutationFn: (id: string) => liveClassApi.cancel(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-live-classes"] }),
    onError: () => Alert.alert("Error", "Could not cancel this class."),
  });

  return (
    <View style={styles.container}>'''

new1 = '''  const cancelClass = useMutation({
    mutationFn: (id: string) => liveClassApi.cancel(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-live-classes"] }),
    onError: () => Alert.alert("Error", "Could not cancel this class."),
  });

  const [recordingModalId, setRecordingModalId] = useState<string | null>(null);
  const [recordingUrlInput, setRecordingUrlInput] = useState("");
  const uploadRecording = useMutation({
    mutationFn: ({ id, url }: { id: string; url: string }) => liveClassApi.uploadRecording(id, url),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-live-classes"] });
      setRecordingModalId(null);
      setRecordingUrlInput("");
    },
    onError: () => Alert.alert("Error", "Could not save the recording link."),
  });

  return (
    <View style={styles.container}>'''

c1 = content.count(old1)
print(f'mutation-block anchor count = {c1}')
if c1 != 1:
    print('ERROR: aborting (mutation block).')
    sys.exit(1)
content = content.replace(old1, new1)

# 2. Add "Add Recording" button for admin on ENDED classes without a recording yet.
old2 = '''            {canManage && item.status === "SCHEDULED" && (
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() =>
                  Alert.alert("Cancel class?", "Students will no longer be able to join this class.", [
                    { text: "No", style: "cancel" },
                    { text: "Yes, cancel", style: "destructive", onPress: () => cancelClass.mutate(item.id) },
                  ])
                }
              >
                <Text style={styles.cancelButtonText}>Cancel Class</Text>
              </TouchableOpacity>
            )}'''

new2 = '''            {canManage && item.status === "SCHEDULED" && (
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() =>
                  Alert.alert("Cancel class?", "Students will no longer be able to join this class.", [
                    { text: "No", style: "cancel" },
                    { text: "Yes, cancel", style: "destructive", onPress: () => cancelClass.mutate(item.id) },
                  ])
                }
              >
                <Text style={styles.cancelButtonText}>Cancel Class</Text>
              </TouchableOpacity>
            )}

            {canManage && item.status === "ENDED" && !item.recordingUrl && (
              <TouchableOpacity
                style={styles.addRecordingButton}
                onPress={() => {
                  setRecordingModalId(item.id);
                  setRecordingUrlInput("");
                }}
              >
                <Ionicons name="link-outline" size={16} color={colors.primary} />
                <Text style={styles.addRecordingButtonText}>Add Recording Link</Text>
              </TouchableOpacity>
            )}'''

c2 = content.count(old2)
print(f'cancel-button anchor count = {c2}')
if c2 != 1:
    print('ERROR: aborting (cancel-button block).')
    sys.exit(1)
content = content.replace(old2, new2)

# 3. Add the recording-link modal, right before the closing </View> of the component.
old3 = '''        )}
      />
    </View>
  );
}'''

new3 = '''        )}
      />

      <Modal visible={!!recordingModalId} transparent animationType="slide" onRequestClose={() => setRecordingModalId(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Recording Link</Text>
            <Text style={styles.modalHint}>Paste the recording URL (Google Drive, YouTube unlisted, etc.) so students can watch it later.</Text>
            <TextInput
              style={styles.modalInput}
              value={recordingUrlInput}
              onChangeText={setRecordingUrlInput}
              placeholder="https://..."
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={[styles.modalSaveButton, (!recordingUrlInput.trim() || uploadRecording.isPending) && { opacity: 0.6 }]}
              disabled={!recordingUrlInput.trim() || uploadRecording.isPending}
              onPress={() => recordingModalId && uploadRecording.mutate({ id: recordingModalId, url: recordingUrlInput.trim() })}
            >
              <Text style={styles.modalSaveButtonText}>{uploadRecording.isPending ? "Saving..." : "Save"}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCancelButton} onPress={() => setRecordingModalId(null)}>
              <Text style={styles.modalCancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}'''

c3 = content.count(old3)
print(f'closing-view anchor count = {c3}')
if c3 != 1:
    print('ERROR: aborting (closing view block).')
    sys.exit(1)
content = content.replace(old3, new3)

# 4. Import Modal + TextInput.
old4 = '''import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert, Linking } from "react-native";'''
new4 = '''import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert, Linking, Modal, TextInput } from "react-native";'''
c4 = content.count(old4)
print(f'import anchor count = {c4}')
if c4 != 1:
    print('ERROR: aborting (import block).')
    sys.exit(1)
content = content.replace(old4, new4)

# 5. Add new styles.
old5 = '''  cancelButton: { alignItems: "center", marginTop: 8 },
  cancelButtonText: { color: "#DC2626", fontWeight: "600", fontSize: 13 },'''
new5 = '''  cancelButton: { alignItems: "center", marginTop: 8 },
  cancelButtonText: { color: "#DC2626", fontWeight: "600", fontSize: 13 },
  addRecordingButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 10 },
  addRecordingButtonText: { color: colors.primary, fontWeight: "600", fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: "#fff", borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg },
  modalTitle: { fontSize: 16, fontWeight: "700", marginBottom: 6 },
  modalHint: { fontSize: 12, color: "#6B7280", marginBottom: spacing.sm },
  modalInput: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: radius.sm, padding: spacing.sm, fontSize: 14, marginBottom: spacing.md },
  modalSaveButton: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 12, alignItems: "center" },
  modalSaveButtonText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  modalCancelButton: { alignItems: "center", paddingVertical: 12 },
  modalCancelButtonText: { color: "#6B7280", fontWeight: "600" },'''
c5 = content.count(old5)
print(f'styles anchor count = {c5}')
if c5 != 1:
    print('ERROR: aborting (styles block).')
    sys.exit(1)
content = content.replace(old5, new5)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Patched app/live-classes.tsx (Add Recording feature)')

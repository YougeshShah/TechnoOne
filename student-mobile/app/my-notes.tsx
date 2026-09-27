import { useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, Modal, ActivityIndicator, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { studentNoteApi, StudentNote } from "../src/api/studentNote.api";

export default function MyNotesScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<StudentNote | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const { data: notes, isLoading } = useQuery({ queryKey: ["student-notes"], queryFn: () => studentNoteApi.list() });

  const createNote = useMutation({
    mutationFn: () => studentNoteApi.create(title, content),
    onSuccess: closeModal,
  });
  const updateNote = useMutation({
    mutationFn: () => studentNoteApi.update(editingNote!.id, title, content),
    onSuccess: closeModal,
  });
  const deleteNote = useMutation({
    mutationFn: (id: string) => studentNoteApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["student-notes"] }),
  });

  function closeModal() {
    queryClient.invalidateQueries({ queryKey: ["student-notes"] });
    setModalOpen(false);
    setEditingNote(null);
    setTitle("");
    setContent("");
  }

  function openNew() {
    setEditingNote(null);
    setTitle("");
    setContent("");
    setModalOpen(true);
  }

  function openEdit(note: StudentNote) {
    setEditingNote(note);
    setTitle(note.title);
    setContent(note.content);
    setModalOpen(true);
  }

  function confirmDelete(id: string) {
    Alert.alert("Delete Note", "Are you sure you want to delete this note?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteNote.mutate(id) },
    ]);
  }

  return (
    <View style={styles.container}>
      {isLoading && <ActivityIndicator style={{ marginTop: 20 }} color="#2563EB" />}
      <FlatList
        data={notes ?? []}
        keyExtractor={(n) => n.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={!isLoading ? <Text style={styles.emptyText}>No notes yet. Tap + to add one.</Text> : null}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.noteCard} onPress={() => openEdit(item)}>
            <View style={styles.noteHeader}>
              <Text style={styles.noteTitle}>{item.title}</Text>
              <TouchableOpacity onPress={() => confirmDelete(item.id)}>
                <Ionicons name="trash-outline" size={18} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
            <Text style={styles.notePreview} numberOfLines={2}>{item.content}</Text>
            <Text style={styles.noteDate}>{new Date(item.updatedAt).toLocaleDateString()}</Text>
          </TouchableOpacity>
        )}
      />
      <TouchableOpacity style={[styles.fab, { bottom: 24 + insets.bottom }]} onPress={openNew}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <Modal visible={modalOpen} animationType="slide" transparent onRequestClose={() => setModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingNote ? "Edit Note" : "New Note"}</Text>
            <TextInput style={styles.titleInput} placeholder="Title" value={title} onChangeText={setTitle} />
            <TextInput
              style={styles.contentInput}
              placeholder="Write your note..."
              value={content}
              onChangeText={setContent}
              multiline
              textAlignVertical="top"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setModalOpen(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={() => (editingNote ? updateNote.mutate() : createNote.mutate())}
                disabled={!title.trim() || createNote.isPending || updateNote.isPending}
              >
                <Text style={styles.saveButtonText}>{editingNote ? "Update" : "Save"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  list: { padding: 16, paddingBottom: 80 },
  emptyText: { textAlign: "center", color: "#9CA3AF", marginTop: 40 },
  noteCard: { backgroundColor: "#fff", borderRadius: 10, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: "#E5E7EB" },
  noteHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  noteTitle: { fontSize: 15, fontWeight: "700", color: "#111827", flex: 1 },
  notePreview: { fontSize: 13, color: "#6B7280", marginTop: 4 },
  noteDate: { fontSize: 11, color: "#9CA3AF", marginTop: 8 },
  fab: { position: "absolute", bottom: 24, right: 24, backgroundColor: "#2563EB", width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", elevation: 4 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#fff", borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20 },
  modalTitle: { fontSize: 17, fontWeight: "700", marginBottom: 12 },
  titleInput: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 8, padding: 10, marginBottom: 10, fontSize: 15 },
  contentInput: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 8, padding: 10, minHeight: 120, fontSize: 14 },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 16 },
  cancelButton: { paddingHorizontal: 16, paddingVertical: 10 },
  cancelButtonText: { color: "#6B7280", fontWeight: "600" },
  saveButton: { backgroundColor: "#2563EB", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  saveButtonText: { color: "#fff", fontWeight: "700" },
});

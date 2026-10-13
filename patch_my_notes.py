import sys

# Run this from student-mobile/ root directory.

path = 'app/my-notes.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Imports.
old1 = '''import { useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, Modal, ActivityIndicator, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { studentNoteApi, StudentNote } from "../src/api/studentNote.api";'''

new1 = '''import { useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, Modal, ActivityIndicator, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { studentNoteApi, StudentNote } from "../src/api/studentNote.api";'''

c1 = content.count(old1)
print(f'imports anchor count = {c1}')
if c1 != 1:
    print('ERROR: aborting (imports).')
    sys.exit(1)
content = content.replace(old1, new1)

# 2. insets const.
old2 = '''export default function MyNotesScreen() {
  const queryClient = useQueryClient();'''

new2 = '''export default function MyNotesScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();'''

c2 = content.count(old2)
print(f'insets anchor count = {c2}')
if c2 != 1:
    print('ERROR: aborting (insets).')
    sys.exit(1)
content = content.replace(old2, new2)

# 3. FAB safe-area bottom padding.
old3 = '''      <TouchableOpacity style={styles.fab} onPress={openNew}>'''
new3 = '''      <TouchableOpacity style={[styles.fab, { bottom: 24 + insets.bottom }]} onPress={openNew}>'''

c3 = content.count(old3)
print(f'fab anchor count = {c3}')
if c3 != 1:
    print('ERROR: aborting (fab).')
    sys.exit(1)
content = content.replace(old3, new3)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Patched app/my-notes.tsx (student-mobile, FAB safe-area padding)')

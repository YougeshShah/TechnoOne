import sys

path = 'app/ai-content.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old1 = '''import { useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useMutation } from "@tanstack/react-query";
import { apiClient } from "../src/api/client";
import { colors, spacing, radius } from "../src/theme/theme";

const DOCUMENT_TYPES = [
  "Legal Notice",
  "Client Engagement Letter",
  "Demand Letter",
  "Affidavit (सपथपत्र)",
  "Power of Attorney (मुख्तियारनामा)",
  "Rental/Lease Agreement",
  "NDA",
];

export default function AiContentScreen() {
  const [documentType, setDocumentType] = useState(DOCUMENT_TYPES[0]);
  const [details, setDetails] = useState("");
  const [language, setLanguage] = useState<"en" | "ne">("en");
  const [copied, setCopied] = useState(false);'''

new1 = '''import { useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useMutation } from "@tanstack/react-query";
import { apiClient } from "../src/api/client";
import { colors, spacing, radius } from "../src/theme/theme";
import { useAuthStore } from "../src/store/authStore";

const LAW_FIRM_DOCUMENT_TYPES = [
  "Legal Notice",
  "Client Engagement Letter",
  "Demand Letter",
  "Affidavit (सपथपत्र)",
  "Power of Attorney (मुख्तियारनामा)",
  "Rental/Lease Agreement",
  "NDA",
];

const EDUCATION_DOCUMENT_TYPES = [
  "Course Syllabus",
  "Student Notice/Circular",
  "Certificate of Completion",
  "Parent/Guardian Letter",
  "Class Schedule Notice",
  "Admission Offer Letter",
  "Fee Reminder Notice",
];

export default function AiContentScreen() {
  const user = useAuthStore((s) => s.user);
  const DOCUMENT_TYPES = user?.tenantType === "EDUCATION" ? EDUCATION_DOCUMENT_TYPES : LAW_FIRM_DOCUMENT_TYPES;
  const [documentType, setDocumentType] = useState(DOCUMENT_TYPES[0]);
  const [details, setDetails] = useState("");
  const [language, setLanguage] = useState<"en" | "ne">("en");
  const [copied, setCopied] = useState(false);'''

count1 = content.count(old1)
print(f'header/types anchor count = {count1}')
if count1 != 1:
    print('ERROR: aborting (header/types block).')
    sys.exit(1)
content = content.replace(old1, new1)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Patched app/ai-content.tsx')

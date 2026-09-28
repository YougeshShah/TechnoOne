import { useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Image, Linking, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { apiClient } from "../../src/api/client";

// Same Reader-App restriction as app/payment/course.tsx -- no purchase-
// related flow at all on iOS, submitting proof of payment included.
const WEBSITE_URL = "https://technocraftx.com";

export default function PaymentVoucherScreen() {
  const router = useRouter();
  const { courseId } = useLocalSearchParams<{ courseId?: string }>();
  const [amount, setAmount] = useState("");
  const [file, setFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);

  const submitVoucher = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append("courseId", courseId ?? "");
      formData.append("amount", amount);
      formData.append("file", { uri: file!.uri, name: file!.name, type: file!.mimeType || "application/octet-stream" } as any);
      return apiClient.post("/payment-vouchers", formData, { headers: { "Content-Type": "multipart/form-data" } });
    },
    onSuccess: () => {
      Alert.alert("Submitted", "Your receipt has been submitted for review. You'll be notified once approved.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    },
    onError: (err: any) => {
      Alert.alert("Error", err?.response?.data?.message || "Could not submit voucher.");
    },
  });

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: ["image/*", "application/pdf"] });
    if (!result.canceled && result.assets?.[0]) setFile(result.assets[0]);
  };

  if (Platform.OS === "ios") {
    return (
      <View style={[styles.container, styles.content]}>
        <Text style={styles.subtitle}>
          To pay and enroll, please visit our website. Once your payment is approved there, come back to the app
          to access your course.
        </Text>
        <TouchableOpacity style={styles.submitButton} onPress={() => Linking.openURL(WEBSITE_URL)}>
          <Text style={styles.submitButtonText}>Open technocraftx.com</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.subtitle}>
        If you've paid via bank transfer or cash, upload your receipt here. Your institution will review and
        approve it manually.
      </Text>

      <Text style={styles.label}>Amount Paid (NPR)</Text>
      <TextInput style={styles.input} placeholder="e.g. 2000" value={amount} onChangeText={setAmount} keyboardType="numeric" />

      <Text style={styles.label}>Receipt</Text>
      <TouchableOpacity style={styles.filePicker} onPress={pickFile}>
        {file ? (
          file.mimeType?.startsWith("image/") ? (
            <Image source={{ uri: file.uri }} style={styles.previewImage} />
          ) : (
            <View style={styles.fileRow}>
              <Ionicons name="document-outline" size={24} color="#2563EB" />
              <Text style={styles.fileName} numberOfLines={1}>{file.name}</Text>
            </View>
          )
        ) : (
          <View style={styles.filePickerEmpty}>
            <Ionicons name="cloud-upload-outline" size={28} color="#9CA3AF" />
            <Text style={styles.filePickerText}>Tap to choose an image or PDF</Text>
          </View>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.submitButton, (!amount || !file || submitVoucher.isPending) && styles.submitButtonDisabled]}
        onPress={() => submitVoucher.mutate()}
        disabled={!amount || !file || submitVoucher.isPending}
      >
        {submitVoucher.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Submit for Review</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 16, paddingBottom: 40 },
  subtitle: { fontSize: 13, color: "#6B7280", marginBottom: 20 },
  label: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 8, padding: 12, fontSize: 15 },
  filePicker: { borderWidth: 1, borderColor: "#E5E7EB", borderStyle: "dashed", borderRadius: 8, minHeight: 120, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  filePickerEmpty: { alignItems: "center", padding: 20 },
  filePickerText: { fontSize: 13, color: "#9CA3AF", marginTop: 8 },
  fileRow: { flexDirection: "row", alignItems: "center", gap: 8, padding: 16 },
  fileName: { fontSize: 13, color: "#374151", flex: 1 },
  previewImage: { width: "100%", height: 160, resizeMode: "cover" },
  submitButton: { backgroundColor: "#2563EB", borderRadius: 8, paddingVertical: 14, alignItems: "center", marginTop: 24 },
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});

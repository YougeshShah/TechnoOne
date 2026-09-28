import { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Linking, Alert, Platform } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { apiClient } from "../../src/api/client";

// Apple's App Store rules for a "Reader" app like ours (IELTS/legal course
// content) don't allow ANY in-app purchase flow on iOS -- not even a button
// that redirects out to an external payment gateway. Everything has to
// happen entirely outside the app -- the exact pattern Netflix, Spotify and
// Amazon Kindle use on iOS. Android has no such restriction, so
// eSewa/Khalti/Voucher stay fully in-app there.
const WEBSITE_URL = "https://technocraftx.com";

export default function CoursePaymentScreen() {
  const router = useRouter();
  const { courseId, amount, courseName } = useLocalSearchParams<{ courseId: string; amount: string; courseName?: string }>();
  const [loading, setLoading] = useState<"ESEWA" | "KHALTI" | "VOUCHER" | null>(null);

  const payWithKhalti = async () => {
    setLoading("KHALTI");
    try {
      const { data } = await apiClient.post("/payment/khalti/initiate", { courseId, amount: Number(amount) });
      await Linking.openURL(data.data.paymentUrl);
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message || "Could not start Khalti payment.");
    } finally {
      setLoading(null);
    }
  };

  const payWithEsewa = async () => {
    setLoading("ESEWA");
    try {
      const { data } = await apiClient.post("/payment/esewa/initiate", { courseId, amount: Number(amount) });
      const { formUrl, fields } = data.data;
      const params = new URLSearchParams(fields as any).toString();
      await Linking.openURL(`${formUrl}?${params}`);
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message || "Could not start eSewa payment.");
    } finally {
      setLoading(null);
    }
  };

  const uploadVoucher = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: ["image/*", "application/pdf"] });
    if (result.canceled || !result.assets?.[0]) return;
    const file = result.assets[0];
    setLoading("VOUCHER");
    try {
      const formData = new FormData();
      formData.append("courseId", courseId ?? "");
      formData.append("amount", amount ?? "0");
      formData.append("file", { uri: file.uri, name: file.name, type: file.mimeType || "application/octet-stream" } as any);
      await apiClient.post("/payment-vouchers", formData, { headers: { "Content-Type": "multipart/form-data" } });
      Alert.alert("Submitted", "Receipt submitted for review.", [{ text: "OK", onPress: () => router.back() }]);
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message || "Could not upload voucher.");
    } finally {
      setLoading(null);
    }
  };

  if (Platform.OS === "ios") {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{courseName || "Enroll in Course"}</Text>
        <Text style={styles.amount}>NPR {amount}</Text>
        <Text style={styles.subtitle}>
          To enroll in this course, please visit our website. Once you've paid there, come back to the app to
          start learning.
        </Text>
        <TouchableOpacity style={[styles.payButton, { backgroundColor: "#2563EB" }]} onPress={() => Linking.openURL(WEBSITE_URL)}>
          <Text style={styles.payButtonText}>Open technocraftx.com</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{courseName || "Enroll in Course"}</Text>
      <Text style={styles.amount}>NPR {amount}</Text>
      <Text style={styles.subtitle}>Choose a payment method to complete enrollment.</Text>

      <TouchableOpacity style={[styles.payButton, { backgroundColor: "#5C2D91" }]} onPress={payWithKhalti} disabled={!!loading}>
        {loading === "KHALTI" ? <ActivityIndicator color="#fff" /> : <Text style={styles.payButtonText}>Pay with Khalti</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={[styles.payButton, { backgroundColor: "#60BB46" }]} onPress={payWithEsewa} disabled={!!loading}>
        {loading === "ESEWA" ? <ActivityIndicator color="#fff" /> : <Text style={styles.payButtonText}>Pay with eSewa</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={styles.voucherButton} onPress={uploadVoucher} disabled={!!loading}>
        {loading === "VOUCHER" ? <ActivityIndicator color="#2563EB" /> : <Text style={styles.voucherButtonText}>Upload Receipt (Bank/Cash)</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 20 },
  title: { fontSize: 18, fontWeight: "700", color: "#111827" },
  amount: { fontSize: 28, fontWeight: "800", color: "#2563EB", marginVertical: 8 },
  subtitle: { fontSize: 13, color: "#6B7280", marginBottom: 24 },
  payButton: { borderRadius: 10, paddingVertical: 14, alignItems: "center", marginBottom: 12 },
  payButtonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  voucherButton: { borderWidth: 1, borderColor: "#2563EB", borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 8 },
  voucherButtonText: { color: "#2563EB", fontWeight: "700" },
});

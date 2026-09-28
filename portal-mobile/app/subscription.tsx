import { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Linking, Alert, Platform } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../src/api/client";
import { colors, spacing, radius } from "../src/theme/theme";

interface Plan {
  id: string;
  name: string;
  description: string | null;
  priceMonthly: number | null;
  maxLawyers: number | null;
  maxCases: number | null;
}

const STATUS_COLORS: Record<string, string> = { PENDING: "#F59E0B", COMPLETED: "#10B981", FAILED: "#EF4444" };

// Same Apple Reader-App restriction as the student app's payment screens --
// no purchase-related flow, pricing, or plan list at all on iOS. An
// institution/law firm subscribing to TechnoOne itself is still a
// "purchase made from inside the app" in Apple's eyes, so this gets the
// exact same treatment: iOS shows a plain "manage on our website" message,
// nothing else. Android is unaffected.
const WEBSITE_URL = "https://technocraftx.com";

export default function SubscriptionScreen() {
  const queryClient = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState<"ESEWA" | "KHALTI" | "VOUCHER" | null>(null);

  const { data: plans } = useQuery({
    queryKey: ["mobile-subscription-plans"],
    queryFn: async () => (await apiClient.get("/firm-payment/plans")).data.data as Plan[],
    enabled: Platform.OS !== "ios",
  });
  const { data: transactions } = useQuery({
    queryKey: ["mobile-firm-transactions"],
    queryFn: async () => (await apiClient.get("/firm-payment/my-transactions")).data.data,
    enabled: Platform.OS !== "ios",
  });

  const payWithKhalti = async () => {
    if (!selectedPlan?.priceMonthly) return;
    setLoading("KHALTI");
    try {
      const { data } = await apiClient.post("/firm-payment/khalti/initiate", { planId: selectedPlan.id, amount: selectedPlan.priceMonthly });
      await Linking.openURL(data.data.paymentUrl);
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message || "Could not start Khalti payment.");
    } finally {
      setLoading(null);
    }
  };

  const payWithEsewa = async () => {
    if (!selectedPlan?.priceMonthly) return;
    setLoading("ESEWA");
    try {
      const { data } = await apiClient.post("/firm-payment/esewa/initiate", { planId: selectedPlan.id, amount: selectedPlan.priceMonthly });
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
    if (!selectedPlan?.priceMonthly) return;
    const result = await DocumentPicker.getDocumentAsync({ type: ["image/*", "application/pdf"] });
    if (result.canceled || !result.assets?.[0]) return;
    const file = result.assets[0];
    setLoading("VOUCHER");
    try {
      const formData = new FormData();
      formData.append("planId", selectedPlan.id);
      formData.append("amount", String(selectedPlan.priceMonthly));
      formData.append("file", { uri: file.uri, name: file.name, type: file.mimeType || "application/octet-stream" } as any);
      await apiClient.post("/firm-payment/voucher", formData, { headers: { "Content-Type": "multipart/form-data" } });
      queryClient.invalidateQueries({ queryKey: ["mobile-firm-transactions"] });
      Alert.alert("Submitted", "Voucher submitted for review.");
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message || "Could not upload voucher.");
    } finally {
      setLoading(null);
    }
  };

  if (Platform.OS === "ios") {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.subtitle}>
          To manage or renew your institution's TechnoOne subscription, please visit our website. Your account
          stays fully usable here in the meantime.
        </Text>
        <TouchableOpacity style={[styles.payButton, { backgroundColor: colors.primary }]} onPress={() => Linking.openURL(WEBSITE_URL)}>
          <Text style={styles.payButtonText}>Open technocraftx.com</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.subtitle}>Choose a plan and pay to keep your institution's TechnoOne subscription active.</Text>

      {(plans ?? []).map((p) => (
        <TouchableOpacity
          key={p.id}
          style={[styles.planCard, selectedPlan?.id === p.id && styles.planCardActive]}
          onPress={() => setSelectedPlan(p)}
        >
          <Text style={styles.planName}>{p.name}</Text>
          <Text style={styles.planPrice}>{p.priceMonthly ? `NPR ${p.priceMonthly}/mo` : "Contact Us"}</Text>
          <Text style={styles.planMeta}>
            {p.maxLawyers ? `${p.maxLawyers} members` : "Unlimited members"} · {p.maxCases ? `${p.maxCases} items` : "Unlimited items"}
          </Text>
        </TouchableOpacity>
      ))}

      {selectedPlan?.priceMonthly ? (
        <View style={styles.payBox}>
          <Text style={styles.payTitle}>Pay NPR {selectedPlan.priceMonthly} for {selectedPlan.name}</Text>
          <TouchableOpacity style={[styles.payButton, { backgroundColor: "#60BB46" }]} onPress={payWithEsewa} disabled={!!loading}>
            {loading === "ESEWA" ? <ActivityIndicator color="#fff" /> : <Text style={styles.payButtonText}>Pay with eSewa</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={[styles.payButton, { backgroundColor: "#5C2D91" }]} onPress={payWithKhalti} disabled={!!loading}>
            {loading === "KHALTI" ? <ActivityIndicator color="#fff" /> : <Text style={styles.payButtonText}>Pay with Khalti</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.voucherButton} onPress={uploadVoucher} disabled={!!loading}>
            {loading === "VOUCHER" ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.voucherButtonText}>Upload Receipt (Bank/Cash)</Text>}
          </TouchableOpacity>
        </View>
      ) : null}

      <Text style={styles.sectionTitle}>Payment History</Text>
      {(transactions ?? []).map((t: any) => (
        <View key={t.id} style={styles.txCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.txTitle}>{t.plan.name} — NPR {t.amount}</Text>
            <Text style={styles.txMeta}>{t.gateway} · {new Date(t.createdAt).toLocaleDateString()}</Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: STATUS_COLORS[t.status] }]}>
            <Text style={styles.statusPillText}>{t.status}</Text>
          </View>
        </View>
      ))}
      {(transactions ?? []).length === 0 && <Text style={styles.emptyText}>No payments yet.</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { padding: spacing.md, paddingBottom: 40 },
  subtitle: { fontSize: 13, color: "#6B7280", marginBottom: spacing.md },
  planCard: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  planCardActive: { borderColor: colors.primary, borderWidth: 2 },
  planName: { fontSize: 15, fontWeight: "700" },
  planPrice: { fontSize: 18, fontWeight: "800", marginVertical: 4 },
  planMeta: { fontSize: 12, color: "#6B7280" },
  payBox: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: radius.md, padding: spacing.md, marginVertical: spacing.md },
  payTitle: { fontSize: 14, fontWeight: "700", marginBottom: spacing.sm },
  payButton: { borderRadius: radius.md, paddingVertical: 12, alignItems: "center", marginBottom: spacing.sm },
  payButtonText: { color: "#fff", fontWeight: "700" },
  voucherButton: { borderWidth: 1, borderColor: colors.primary, borderRadius: radius.md, paddingVertical: 12, alignItems: "center" },
  voucherButtonText: { color: colors.primary, fontWeight: "700" },
  sectionTitle: { fontSize: 15, fontWeight: "700", marginTop: spacing.md, marginBottom: spacing.sm },
  txCard: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  txTitle: { fontSize: 13, fontWeight: "600" },
  txMeta: { fontSize: 11, color: "#6B7280", marginTop: 2 },
  statusPill: { borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 4 },
  statusPillText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  emptyText: { color: "#9CA3AF", textAlign: "center" },
});

import { apiClient } from "./client";
import { ApiSuccessResponse } from "../types/api.types";
import { getStaticBaseUrl } from "./profile.api";

export const companySettingsApi = {
  async getQrCode(): Promise<{ paymentQrCodeUrl: string | null }> {
    const { data } = await apiClient.get<ApiSuccessResponse<{ paymentQrCodeUrl: string | null }>>(
      "/institution-fee/qr-code/company"
    );
    return data.data;
  },
  async uploadQrCode(file: File): Promise<any> {
    const formData = new FormData();
    formData.append("qrCode", file);
    const { data } = await apiClient.post<ApiSuccessResponse<any>>("/institution-fee/qr-code/company", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data.data;
  },
};

// Payment QR image URLs come back as "/uploads/payment-qr/x.png" -- prefix
// with the server origin (same pattern as getAvatarUrl) so <img> can load it.
export function getQrCodeImageUrl(paymentQrCodeUrl: string | null | undefined): string | undefined {
  if (!paymentQrCodeUrl) return undefined;
  return `${getStaticBaseUrl()}${paymentQrCodeUrl}`;
}

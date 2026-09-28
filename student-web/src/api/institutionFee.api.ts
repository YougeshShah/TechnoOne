import { apiClient } from "./client";

export interface AmountDue {
  fee: number | null;
  discount: number;
  amountDue: number | null;
}

export const institutionFeeApi = {
  async myAmountDue(courseId: string): Promise<AmountDue> {
    const { data } = await apiClient.get(`/institution-fee/my-amount-due/${courseId}`);
    return data.data;
  },
  async myQrCode(): Promise<{ paymentQrCodeUrl: string | null }> {
    const { data } = await apiClient.get(`/institution-fee/qr-code/student`);
    return data.data;
  },
};

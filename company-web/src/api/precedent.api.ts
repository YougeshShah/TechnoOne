import { apiClient } from "./client";
import { ApiSuccessResponse } from "../types/api.types";

export interface PrecedentListItem {
  id: string;
  sourceId: string | null;
  sourceUrl: string | null;
  title: string;
  caseType: string | null;
  category: string | null;
  court: string | null;
  benchType: string | null;
  judges: string | null;
  decisionDate: string | null;
  caseNumber: string | null;
  petitioner: string | null;
  respondent: string | null;
  hostLawFirmId: string | null;
  createdAt: string;
}

export interface PrecedentDetail extends PrecedentListItem {
  fullContent: string;
}

export interface PrecedentSearchResult {
  items: PrecedentListItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface UpdatePrecedentPayload {
  title?: string;
  caseType?: string;
  category?: string;
  court?: string;
  benchType?: string;
  judges?: string;
  decisionDate?: string;
  caseNumber?: string;
  petitioner?: string;
  respondent?: string;
  fullContent?: string;
  sourceUrl?: string;
}

export interface CreatePrecedentPayload {
  title: string;
  caseType?: string;
  category?: string;
  court?: string;
  benchType?: string;
  judges?: string;
  decisionDate?: string;
  caseNumber?: string;
  petitioner?: string;
  respondent?: string;
  fullContent: string;
  sourceUrl?: string;
}

export const precedentApi = {
  async search(params: { search?: string; category?: string; page?: number; limit?: number }): Promise<PrecedentSearchResult> {
    const { data } = await apiClient.get<ApiSuccessResponse<PrecedentSearchResult>>("/precedents", { params });
    return data.data;
  },

  async getById(id: string): Promise<PrecedentDetail> {
    const { data } = await apiClient.get<ApiSuccessResponse<PrecedentDetail>>(`/precedents/${id}`);
    return data.data;
  },

  async listCategories(): Promise<string[]> {
    const { data } = await apiClient.get<ApiSuccessResponse<string[]>>("/precedents/categories");
    return data.data;
  },

  // Company (and, per the backend route, LAW_FIRM_ADMIN) can add a precedent manually.
  async create(payload: CreatePrecedentPayload): Promise<PrecedentDetail> {
    const { data } = await apiClient.post<ApiSuccessResponse<PrecedentDetail>>("/precedents", payload);
    return data.data;
  },

  // Company-only on the backend -- these calls will 403 for any other account type.
  async update(id: string, payload: UpdatePrecedentPayload): Promise<PrecedentDetail> {
    const { data } = await apiClient.patch<ApiSuccessResponse<PrecedentDetail>>(`/precedents/${id}`, payload);
    return data.data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/precedents/${id}`);
  },
};

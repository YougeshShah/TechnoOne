import { apiClient } from "./client";
import { ApiSuccessResponse } from "../types/api.types";

export interface LawFirmSettings {
  id: string;
  name: string;
  allowRecordingScreenshots: boolean;
}

// Self-service settings for an institution's own admin/teacher/staff --
// always scoped to their own institution (backend reads it off the auth
// token, not from any id in the URL), never any other institution's.
export const lawFirmSettingsApi = {
  async getMine(): Promise<LawFirmSettings> {
    const { data } = await apiClient.get<ApiSuccessResponse<LawFirmSettings>>("/law-firms/me/settings");
    return data.data;
  },
  async updateMine(payload: { allowRecordingScreenshots: boolean }): Promise<LawFirmSettings> {
    const { data } = await apiClient.patch<ApiSuccessResponse<LawFirmSettings>>("/law-firms/me/settings", payload);
    return data.data;
  },
};

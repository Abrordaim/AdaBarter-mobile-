import { apiClient, uploadWithXHR, TokenStorage, ApiResponse } from './api';
import * as ImagePicker from 'expo-image-picker';

export interface CreateReportData {
  reportable_type: 'item' | 'user';
  reportable_id: number;
  reason: string;
  description: string;
}

export interface ReportResponseData {
  id: number;
  status: string;
  created_at: string;
}

export const reportService = {
  async createReport(
    data: CreateReportData,
    evidenceAsset?: ImagePicker.ImagePickerAsset | null
  ): Promise<ApiResponse<ReportResponseData>> {
    if (evidenceAsset) {
      const formData = new FormData();
      formData.append('reportable_type', data.reportable_type);
      formData.append('reportable_id', data.reportable_id.toString());
      formData.append('reason', data.reason);
      formData.append('description', data.description);

      const mimeType = evidenceAsset.mimeType || 'image/jpeg';
      const ext = mimeType.split('/')[1] || 'jpg';
      const filename = evidenceAsset.fileName || `evidence_${Date.now()}.${ext}`;

      formData.append('evidence', {
        uri: evidenceAsset.uri,
        name: filename,
        type: mimeType,
      } as any);

      const token = await TokenStorage.getToken();
      return await uploadWithXHR<ReportResponseData>('/reports', formData, token);
    }

    return await apiClient<ReportResponseData>('/reports', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

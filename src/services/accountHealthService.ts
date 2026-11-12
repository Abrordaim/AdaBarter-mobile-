import { apiClient, uploadWithXHR, TokenStorage, ApiResponse } from './api';
import * as ImagePicker from 'expo-image-picker';

export interface UserPenaltyItem {
  id: number;
  points: number;
  category: string;
  reason: string;
  status: 'active' | 'expired' | 'revoked';
  expires_at: string | null;
  appeal_status: 'none' | 'pending' | 'accepted' | 'rejected';
  appeal_reason: string | null;
  appeal_admin_notes: string | null;
  can_appeal: boolean;
  created_at: string;
}

export interface AccountHealthData {
  penalty_points: number;
  account_status: 'active' | 'restricted' | 'banned';
  restriction_tier: number;
  tier_name: string;
  health_level: 'good' | 'warning' | 'restricted' | 'banned';
  restricted_until: string | null;
  active_restrictions: string[];
  penalties: UserPenaltyItem[];
}

export const accountHealthService = {
  /**
   * Mengambil data kesehatan akun, poin penalti aktif, dan pembatasan fitur pengguna
   */
  async getAccountHealth(): Promise<ApiResponse<AccountHealthData>> {
    return await apiClient<AccountHealthData>('/user/account-health', {
      method: 'GET',
    });
  },

  /**
   * Mengajukan sanggahan / banding untuk suatu poin penalti
   */
  async submitAppeal(
    penaltyId: number,
    reason: string,
    evidenceAsset?: ImagePicker.ImagePickerAsset | null
  ): Promise<ApiResponse<{ id: number; appeal_status: string; appealed_at: string }>> {
    if (evidenceAsset) {
      const formData = new FormData();
      formData.append('reason', reason);

      const mimeType = evidenceAsset.mimeType || 'image/jpeg';
      const ext = mimeType.split('/')[1] || 'jpg';
      const filename = evidenceAsset.fileName || `appeal_${Date.now()}.${ext}`;

      formData.append('evidence', {
        uri: evidenceAsset.uri,
        name: filename,
        type: mimeType,
      } as any);

      const token = await TokenStorage.getToken();
      return await uploadWithXHR<{ id: number; appeal_status: string; appealed_at: string }>(
        `/user/penalties/${penaltyId}/appeal`,
        formData,
        token
      );
    }

    return await apiClient<{ id: number; appeal_status: string; appealed_at: string }>(
      `/user/penalties/${penaltyId}/appeal`,
      {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }
    );
  },
};

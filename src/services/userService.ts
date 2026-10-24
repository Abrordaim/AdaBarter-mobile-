import { apiClient, uploadWithXHR, TokenStorage } from './api';
import { User } from './authService';
import { BarterItem } from './itemService';
import * as ImagePicker from 'expo-image-picker';

export interface UserProfileData extends User {
  active_items_count: number;
  total_items_count: number;
  sent_offers_count: number;
  received_offers_count: number;
}

export interface PublicUserProfile {
  id: number;
  name: string;
  city?: string | null;
  province_id?: number | null;
  province_name?: string | null;
  regency_id?: number | null;
  regency_name?: string | null;
  district_id?: number | null;
  district_name?: string | null;
  avatar_url?: string | null;
  is_vip?: boolean;
  average_rating?: number | null;
  ratings_count?: number;
  completed_trades_count: number;
  active_items_count: number;
  created_at?: string;
}

export interface PublicProfileResponse {
  user: PublicUserProfile;
  items: BarterItem[];
}

export interface UpdateProfileData {
  name?: string;
  phone?: string;
  city?: string;
  province_id?: number;
  province_name?: string;
  regency_id?: number;
  regency_name?: string;
  district_id?: number;
  district_name?: string;
}

export const userService = {
  async getProfile(): Promise<UserProfileData> {
    const res = await apiClient<UserProfileData>('/user/profile', {
      method: 'GET',
    });
    return res.data;
  },

  async updateProfile(
    data: UpdateProfileData,
    avatarAsset?: ImagePicker.ImagePickerAsset | null
  ): Promise<User> {
    if (avatarAsset) {
      const formData = new FormData();
      if (data.name !== undefined) formData.append('name', data.name);
      if (data.phone !== undefined) formData.append('phone', data.phone || '');
      if (data.city !== undefined) formData.append('city', data.city || '');
      if (data.province_id !== undefined) formData.append('province_id', data.province_id.toString());
      if (data.province_name) formData.append('province_name', data.province_name);
      if (data.regency_id !== undefined) formData.append('regency_id', data.regency_id.toString());
      if (data.regency_name) formData.append('regency_name', data.regency_name);
      if (data.district_id !== undefined) formData.append('district_id', data.district_id.toString());
      if (data.district_name) formData.append('district_name', data.district_name);

      const mimeType = avatarAsset.mimeType || 'image/jpeg';
      const ext = mimeType.split('/')[1] || 'jpg';
      const filename = avatarAsset.fileName || `avatar_${Date.now()}.${ext}`;

      formData.append('avatar', {
        uri: avatarAsset.uri,
        name: filename,
        type: mimeType,
      } as any);

      const token = await TokenStorage.getToken();
      const res = await uploadWithXHR<User>('/user/profile', formData, token);
      return res.data;
    }

    const res = await apiClient<User>('/user/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return res.data;
  },

  async getPublicProfile(userId: number): Promise<PublicProfileResponse> {
    const res = await apiClient<PublicProfileResponse>(`/users/${userId}`, {
      method: 'GET',
    });
    return res.data;
  },
};

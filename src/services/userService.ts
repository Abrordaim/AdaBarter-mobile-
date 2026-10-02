import { apiClient, uploadWithXHR, TokenStorage } from './api';
import { User } from './authService';
import * as ImagePicker from 'expo-image-picker';

export interface UserProfileData extends User {
  active_items_count: number;
  total_items_count: number;
  sent_offers_count: number;
  received_offers_count: number;
}

export interface UpdateProfileData {
  name?: string;
  phone?: string;
  city?: string;
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
};

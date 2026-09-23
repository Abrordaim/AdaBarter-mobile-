import { apiClient } from './api';
import { User } from './authService';

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

  async updateProfile(data: UpdateProfileData, avatarUri?: string): Promise<User> {
    if (avatarUri) {
      const formData = new FormData();
      if (data.name) formData.append('name', data.name);
      if (data.phone) formData.append('phone', data.phone);
      if (data.city) formData.append('city', data.city);

      const filename = avatarUri.split('/').pop() || 'avatar.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('avatar', {
        uri: avatarUri,
        name: filename,
        type,
      } as any);

      const res = await apiClient<User>('/user/profile', {
        method: 'POST',
        body: formData,
      });
      return res.data;
    }

    const res = await apiClient<User>('/user/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return res.data;
  },
};

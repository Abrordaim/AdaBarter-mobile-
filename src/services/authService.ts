import { apiClient, TokenStorage } from './api';

export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  city?: string | null;
  avatar_url?: string | null;
  role: 'user' | 'admin' | 'super_admin';
  is_vip: boolean;
  free_post_quota: number;
  bonus_post_quota: number;
  remaining_quota: number;
  can_post: boolean;
  active_items_count?: number; 
  total_items_count?: number;
  sent_offers_count?: number;
  received_offers_count?: number;
  average_rating?: number | null;
  ratings_count?: number;
  created_at?: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  phone?: string;
  city?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponseData {
  user: User;
  token: string;
}

export const authService = {
  async register(data: RegisterData): Promise<AuthResponseData> {
    const res = await apiClient<AuthResponseData>('/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (res.data?.token) {
      await TokenStorage.setToken(res.data.token);
    }
    return res.data;
  },

  async login(data: LoginData): Promise<AuthResponseData> {
    const res = await apiClient<AuthResponseData>('/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (res.data?.token) {
      await TokenStorage.setToken(res.data.token);
    }
    return res.data;
  },

  async logout(): Promise<void> {
    try {
      await apiClient('/logout', {
        method: 'POST',
      });
    } catch {
      // Ignore network errors during logout
    } finally {
      await TokenStorage.removeToken();
    }
  },

  async getMe(): Promise<User> {
    const res = await apiClient<User>('/me', {
      method: 'GET',
    });
    return res.data;
  },
};

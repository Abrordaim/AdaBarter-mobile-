import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// Default API Base URL based on environment
// For Android Emulator: 10.0.2.2 points to host machine
// For iOS Simulator / Web: localhost points to host machine
const getBaseUrl = () => {
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8000/api';
  }
  return 'http://localhost:8000/api';
};

export const API_BASE_URL = getBaseUrl();

const TOKEN_KEY = 'adabarter_auth_token';

// Safe token storage supporting web and native
export const TokenStorage = {
  async getToken(): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        return typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
      }
      return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch {
      return null;
    }
  },

  async setToken(token: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined') localStorage.setItem(TOKEN_KEY, token);
      } else {
        await SecureStore.setItemAsync(TOKEN_KEY, token);
      }
    } catch (e) {
      console.error('Failed to store auth token', e);
    }
  },

  async removeToken(): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined') localStorage.removeItem(TOKEN_KEY);
      } else {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
      }
    } catch (e) {
      console.error('Failed to remove auth token', e);
    }
  },
};

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
  errors?: Record<string, string[]>;
}

// Fetch wrapper with automatic auth header and error handling
export async function apiClient<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = await TokenStorage.getToken();
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(options.headers as Record<string, string>),
  };

  // If body is not FormData, ensure Content-Type is JSON
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMessage = data?.message || `Request failed with status ${response.status}`;
      const error: any = new Error(errorMessage);
      error.status = response.status;
      error.errors = data?.errors;
      throw error;
    }

    return data;
  } catch (error: any) {
    throw error;
  }
}

import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

// =====================================================================
// Konfigurasi API Base URL — Sesuaikan IP_ADDRESS di bawah ini
// dengan IP LAN komputer Anda (jalankan `hostname -I` di terminal).
// Server Laravel HARUS dijalankan dengan:
//   php artisan serve --host=0.0.0.0 --port=8000
// =====================================================================

// Ganti IP ini dengan IP jaringan lokal komputer Anda
const LOCAL_IP = '192.168.0.106';

const getBaseUrl = () => {
  // 1. Expo extra configuration jika ada
  const envUrl = Constants.expoConfig?.extra?.apiBaseUrl;
  if (envUrl) return envUrl;

  // 2. Web browser
  if (Platform.OS === 'web') {
    return 'http://localhost:8000/api';
  }

  // 3. Otomatis deteksi IP Host komputer dari Expo Metro Packager
  // Pada Expo Go (HP fisik maupun emulator), hostUri berisi alamat host komputer: "192.168.x.x:8081"
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any).manifest?.debuggerHost ||
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost;

  if (hostUri) {
    const host = hostUri.split(':')[0];
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return `http://${host}:8000/api`;
    }
  }

  // 4. Fallback ke IP LAN komputer lokal
  return `http://${LOCAL_IP}:8000/api`;
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

    let data: any = {};
    const text = await response.text();
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { message: text || `HTTP ${response.status}` };
    }

    if (!response.ok) {
      const errorMessage = data?.message || `Request failed with status ${response.status}`;
      const error: any = new Error(errorMessage);
      error.status = response.status;
      error.errors = data?.errors;
      throw error;
    }

    return data;
  } catch (error: any) {
    console.error(`[AdaBarter API Error] ${options.method || 'GET'} ${url}:`, error.message);
    throw error;
  }
}

/**
 * Upload multipart/form-data via XMLHttpRequest.
 * React Native's XHR natively understands {uri, name, type} FormData entries
 * without needing to convert to Blob first — works on both physical devices
 * (content:// URIs) and emulators.
 */
export function uploadWithXHR<T = any>(
  endpoint: string,
  formData: FormData,
  token: string | null
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);
    xhr.setRequestHeader('Accept', 'application/json');
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }

    xhr.onload = () => {
      let data: any = {};
      try {
        data = xhr.responseText ? JSON.parse(xhr.responseText) : {};
      } catch {
        data = { message: xhr.responseText || `HTTP ${xhr.status}` };
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data as ApiResponse<T>);
      } else {
        const errorMessage = data?.message || `Request failed with status ${xhr.status}`;
        const error: any = new Error(errorMessage);
        error.status = xhr.status;
        error.errors = data?.errors;
        console.error(`[AdaBarter API Error] POST ${url}:`, errorMessage);
        reject(error);
      }
    };

    xhr.onerror = () => {
      const error = new Error('Network request failed');
      console.error(`[AdaBarter API Error] POST ${url}: Network request failed`);
      reject(error);
    };

    xhr.send(formData);
  });
}

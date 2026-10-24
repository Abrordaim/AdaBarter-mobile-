import { apiClient } from './api';

export interface Province {
  id: number;
  code: string;
  name: string;
}

export interface Regency {
  id: number;
  code: string;
  name: string;
  province_id: number;
}

export interface District {
  id: number;
  code: string;
  name: string;
  regency_id: number;
}

export const regionService = {
  async getProvinces(): Promise<Province[]> {
    const res = await apiClient<Province[]>('/regions/provinces');
    return res.data || [];
  },

  async getRegencies(provinceId: number): Promise<Regency[]> {
    const res = await apiClient<Regency[]>(`/regions/provinces/${provinceId}/regencies`);
    return res.data || [];
  },

  async getDistricts(regencyId: number): Promise<District[]> {
    const res = await apiClient<District[]>(`/regions/regencies/${regencyId}/districts`);
    return res.data || [];
  },
};

import { apiClient } from './api';

export interface Banner {
  id: number;
  title: string;
  image_url: string;
  redirect_url?: string | null;
  advertiser_name?: string | null;
  position: 'home_top' | 'home_bottom' | 'detail_page';
  started_at?: string | null;
  expired_at?: string | null;
}

export const bannerService = {
  async getBanners(position?: string): Promise<Banner[]> {
    const query = position ? `?position=${position}` : '';
    const res = await apiClient<Banner[]>(`/banners${query}`, {
      method: 'GET',
    });
    return res.data;
  },
};

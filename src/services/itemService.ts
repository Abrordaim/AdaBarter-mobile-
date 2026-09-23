import { apiClient } from './api';
import { Category } from './categoryService';
import { User } from './authService';

export interface BarterItem {
  id: number;
  title: string;
  description: string;
  condition: 'baru' | 'bekas_seperti_baru' | 'bekas_baik' | 'bekas_layak_pakai';
  desired_items?: string | null;
  estimated_price?: number | null;
  location?: string | null;
  city?: string | null;
  status: 'active' | 'inactive' | 'moderated' | 'traded';
  is_boosted: boolean;
  images: string[];
  primary_image?: string | null;
  user?: User;
  category?: Category;
  created_at?: string; 
  updated_at?: string; 
}

export interface ItemFilters {
  search?: string;
  category_id?: number;
  city?: string;
  condition?: string;
  page?: number;
  per_page?: number;
}

export interface CreateItemData {
  category_id: number;
  title: string;
  description: string;
  condition: string;
  desired_items?: string;
  estimated_price?: number;
  location?: string;
  city?: string;
}

export const itemService = {
  async getItems(filters: ItemFilters = {}): Promise<{ items: BarterItem[]; pagination: any }> {
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    if (filters.category_id) params.append('category_id', filters.category_id.toString());
    if (filters.city) params.append('city', filters.city);
    if (filters.condition) params.append('condition', filters.condition);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.per_page) params.append('per_page', filters.per_page.toString());

    const queryString = params.toString();
    const endpoint = `/items${queryString ? `?${queryString}` : ''}`;
    const res = await apiClient<{ items: BarterItem[]; pagination: any }>(endpoint, {
      method: 'GET',
    });
    return res.data;
  },

  async getItemDetail(id: number): Promise<BarterItem> {
    const res = await apiClient<BarterItem>(`/items/${id}`, {
      method: 'GET',
    });
    return res.data;
  },

  async getMyItems(): Promise<BarterItem[]> {
    const res = await apiClient<BarterItem[]>('/my-items', {
      method: 'GET',
    });
    return res.data;
  },

  async createItem(data: CreateItemData, imageUris: string[] = []): Promise<BarterItem> {
    const formData = new FormData();
    formData.append('category_id', data.category_id.toString());
    formData.append('title', data.title);
    formData.append('description', data.description);
    formData.append('condition', data.condition);
    if (data.desired_items) formData.append('desired_items', data.desired_items);
    if (data.estimated_price !== undefined) formData.append('estimated_price', data.estimated_price.toString());
    if (data.location) formData.append('location', data.location);
    if (data.city) formData.append('city', data.city);

    imageUris.forEach((uri, index) => {
      const filename = uri.split('/').pop() || `image_${index}.jpg`;
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('images[]', {
        uri,
        name: filename,
        type,
      } as any);
    });

    const res = await apiClient<BarterItem>('/items', {
      method: 'POST',
      body: formData,
    });
    return res.data;
  },

  async deleteItem(id: number): Promise<void> {
    await apiClient(`/items/${id}`, {
      method: 'DELETE',
    });
  },
};

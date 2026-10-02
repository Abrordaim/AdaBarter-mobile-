import { apiClient, uploadWithXHR, TokenStorage } from './api';
import { Category } from './categoryService';
import { User } from './authService';
import * as ImagePicker from 'expo-image-picker';

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

  async createItem(data: CreateItemData, imageAssets: ImagePicker.ImagePickerAsset[] = []): Promise<BarterItem> {
    const formData = new FormData();
    formData.append('category_id', data.category_id.toString());
    formData.append('title', data.title);
    formData.append('description', data.description);
    formData.append('condition', data.condition);
    if (data.desired_items) formData.append('desired_items', data.desired_items);
    if (data.estimated_price !== undefined) formData.append('estimated_price', data.estimated_price.toString());
    if (data.location) formData.append('location', data.location);
    if (data.city) formData.append('city', data.city);

    // Append images as native RN FormData parts {uri, name, type}.
    // This bypasses Expo's Winter fetch and uses XMLHttpRequest which
    // natively understands content:// URIs on physical Android devices.
    for (let index = 0; index < imageAssets.length; index++) {
      const asset = imageAssets[index];
      const mimeType = asset.mimeType || 'image/jpeg';
      const ext = mimeType.split('/')[1] || 'jpg';
      const filename = asset.fileName || `image_${index}.${ext}`;

      formData.append('images[]', {
        uri: asset.uri,
        name: filename,
        type: mimeType,
      } as any);
    }

    // Use XHR to bypass Expo's Winter fetch (which can't handle content:// URIs)
    const token = await TokenStorage.getToken();
    const res = await uploadWithXHR<BarterItem>('/items', formData, token);
    return res.data;
  },

  async updateItem(
    id: number,
    data: Partial<CreateItemData & { status?: string }>,
    newImageAssets: ImagePicker.ImagePickerAsset[] = []
  ): Promise<BarterItem> {
    const formData = new FormData();
    // Laravel method spoofing for PUT via multipart/form-data
    formData.append('_method', 'PUT');

    if (data.category_id !== undefined) formData.append('category_id', data.category_id.toString());
    if (data.title !== undefined) formData.append('title', data.title);
    if (data.description !== undefined) formData.append('description', data.description);
    if (data.condition !== undefined) formData.append('condition', data.condition);
    if (data.desired_items !== undefined) formData.append('desired_items', data.desired_items ?? '');
    if (data.estimated_price !== undefined) formData.append('estimated_price', data.estimated_price.toString());
    if (data.location !== undefined) formData.append('location', data.location ?? '');
    if (data.city !== undefined) formData.append('city', data.city ?? '');
    if (data.status !== undefined) formData.append('status', data.status);

    for (let index = 0; index < newImageAssets.length; index++) {
      const asset = newImageAssets[index];
      const mimeType = asset.mimeType || 'image/jpeg';
      const ext = mimeType.split('/')[1] || 'jpg';
      const filename = asset.fileName || `new_image_${index}.${ext}`;
      formData.append('new_images[]', {
        uri: asset.uri,
        name: filename,
        type: mimeType,
      } as any);
    }

    const token = await TokenStorage.getToken();
    const res = await uploadWithXHR<BarterItem>(`/items/${id}`, formData, token);
    return res.data;
  },

  async deleteItem(id: number): Promise<void> {
    await apiClient(`/items/${id}`, {
      method: 'DELETE',
    });
  },
};

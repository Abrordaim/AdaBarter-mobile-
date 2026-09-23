import { apiClient } from './api';

export interface Category {
  id: number;
  name: string;
  slug: string;
  icon?: string | null;
  description?: string | null;
  items_count?: number;
}

export const categoryService = {
  async getCategories(): Promise<Category[]> {
    const res = await apiClient<Category[]>('/categories', {
      method: 'GET',
    });
    return res.data;
  },
};
 
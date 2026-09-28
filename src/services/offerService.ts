import { apiClient } from './api';
import { User } from './authService';
import { BarterItem } from './itemService';

export interface BarterOffer {
  id: number;
  cash_supplement?: number | null;
  cash_supplement_by?: 'offerer' | 'target_owner' | null;
  status: 'pending' | 'matched' | 'rejected' | 'completed' | 'cancelled';
  offerer_approved: boolean;
  target_approved: boolean;
  matched_at?: string | null;
  completed_at?: string | null;
  rejection_reason?: string | null;
  offerer?: User;
  target_owner?: User;
  offerer_item?: BarterItem;
  target_item?: BarterItem;
  latest_message?: any;
  created_at?: string;
  updated_at?: string;
}

export interface CreateOfferPayload {
  offerer_item_id: number;
  target_item_id: number;
  cash_supplement?: number;
  cash_supplement_by?: 'offerer' | 'target_owner';
}

export const offerService = {
  async getOffers(type?: 'sent' | 'received', status?: string): Promise<BarterOffer[]> {
    const params = new URLSearchParams();
    if (type) params.append('type', type);
    if (status) params.append('status', status);

    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await apiClient<BarterOffer[]>(`/offers${query}`, {
      method: 'GET',
    });
    return res.data;
  },

  async getOfferDetail(id: number): Promise<BarterOffer> {
    const res = await apiClient<BarterOffer>(`/offers/${id}`, {
      method: 'GET',
    });
    return res.data;
  },

  async createOffer(payload: CreateOfferPayload): Promise<BarterOffer> {
    const res = await apiClient<BarterOffer>('/offers', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  async acceptOffer(id: number): Promise<BarterOffer> {
    const res = await apiClient<BarterOffer>(`/offers/${id}/accept`, {
      method: 'POST',
    });
    return res.data;
  },

  async rejectOffer(id: number, reason?: string): Promise<BarterOffer> {
    const res = await apiClient<BarterOffer>(`/offers/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ rejection_reason: reason }),
    });
    return res.data;
  },

  async completeOffer(id: number): Promise<BarterOffer> {
    const res = await apiClient<BarterOffer>(`/offers/${id}/complete`, {
      method: 'POST',
    });
    return res.data;
  },

  async cancelOffer(id: number): Promise<BarterOffer> {
    const res = await apiClient<BarterOffer>(`/offers/${id}/cancel`, {
      method: 'POST',
    });
    return res.data;
  },
};

import { apiClient, uploadWithXHR, TokenStorage } from './api';
import { User } from './authService';
import { BarterItem } from './itemService';
import * as ImagePicker from 'expo-image-picker';

export type EscrowStatus =
  | 'WAITING_PAYMENT'
  | 'HELD'
  | 'WAITING_CONFIRMATION'
  | 'COMPLETED'
  | 'DISPUTED'
  | 'REFUNDED'
  | 'EXPIRED';

export interface DisputeInfo {
  id: number;
  reported_by?: number;
  reason: string;
  description: string;
  status: 'open' | 'resolved';
  resolution?: 'refund_full' | 'release' | 'refund_partial' | null;
  refund_amount?: number | null;
  admin_note?: string | null;
  created_at?: string;
  resolved_at?: string | null;
}

export interface BarterOffer {
  id: number;
  cash_supplement?: number | null;
  cash_supplement_by?: 'offerer' | 'target_owner' | null;
  payment_method?: 'cod' | 'gateway';
  price_difference?: number;
  payer_id?: number | null;
  receiver_id?: number | null;
  escrow_status?: EscrowStatus | null;
  payer_confirmed_at?: string | null;
  receiver_confirmed_at?: string | null;
  confirm_deadline_at?: string | null;
  released_at?: string | null;
  handover_code?: string | null;
  dispute?: DisputeInfo | null;
  status: 'pending' | 'matched' | 'rejected' | 'completed' | 'cancelled';
  offerer_approved: boolean;
  target_approved: boolean;
  matched_at?: string | null;
  completed_at?: string | null;
  rejection_reason?: string | null;
  has_rated?: boolean;
  my_rating?: {
    id: number;
    rating: number;
    comment?: string | null;
  } | null;
  offerer?: User;
  target_owner?: User;
  offerer_item?: BarterItem;
  offerer_items?: BarterItem[];
  total_offerer_estimated_price?: number;
  target_item?: BarterItem;
  latest_message?: any;
  created_at?: string;
  updated_at?: string;
}

export interface CreateOfferPayload {
  offerer_item_ids?: number[];
  offerer_item_id?: number;
  target_item_id: number;
  cash_supplement?: number;
  cash_supplement_by?: 'offerer' | 'target_owner';
}

export interface PayEscrowResponse {
  token?: string;
  snap_token?: string;
  redirect_url: string;
  order_id: string;
  gross_amount: number;
  original_amount?: number;
  discount_amount?: number;
  is_production?: boolean;
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

  /**
   * Bayar selisih barter via rekening bersama (Midtrans Snap)
   */
  async payEscrow(id: number, voucherClaimId?: number): Promise<PayEscrowResponse> {
    const res = await apiClient<PayEscrowResponse>(`/offers/${id}/pay`, {
      method: 'POST',
      body: JSON.stringify({ voucher_claim_id: voucherClaimId }),
    });
    return res.data;
  },

  /**
   * Konfirmasi penerimaan serah terima barang (Payer atau Receiver dengan handover code)
   */
  async confirmReceived(id: number, handoverCode?: string): Promise<{ offer: BarterOffer; is_released: boolean }> {
    const res = await apiClient<{ offer: BarterOffer; is_released: boolean }>(`/offers/${id}/confirm`, {
      method: 'POST',
      body: JSON.stringify({ handover_code: handoverCode }),
    });
    return res.data;
  },

  /**
   * Mengajukan komplain/sengketa barter jika ada kendala serah terima di lokasi
   */
  async openDispute(
    id: number,
    data: { reason: string; description: string },
    evidenceAsset?: ImagePicker.ImagePickerAsset | null
  ): Promise<any> {
    if (evidenceAsset) {
      const formData = new FormData();
      formData.append('reason', data.reason);
      formData.append('description', data.description);

      const mimeType = evidenceAsset.mimeType || 'image/jpeg';
      const ext = mimeType.split('/')[1] || 'jpg';
      const filename = evidenceAsset.fileName || `dispute_${Date.now()}.${ext}`;

      formData.append('evidence[]', {
        uri: evidenceAsset.uri,
        name: filename,
        type: mimeType,
      } as any);

      const token = await TokenStorage.getToken();
      const res = await uploadWithXHR<any>(`/offers/${id}/dispute`, formData, token);
      return res.data;
    }

    const res = await apiClient<any>(`/offers/${id}/dispute`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data;
  },
};

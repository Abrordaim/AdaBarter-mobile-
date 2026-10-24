import { apiClient } from './api';

export interface Voucher {
  id: number;
  code: string;
  description?: string | null;
  type: 'fixed' | 'percentage';
  discount_amount?: number | null;
  percentage?: number | null;
  max_discount_amount?: number | null;
  min_transaction_amount: number;
  distribution: 'public' | 'private';
  max_claims?: number;
  claimed_count?: number;
  remaining_claims?: number;
  formatted_discount: string;
  expired_at?: string | null;
  is_claimed?: boolean;
  is_expired?: boolean;
  is_usable?: boolean;
}

export interface VoucherClaimItem {
  claim_id: number;
  is_used: boolean;
  used_at?: string | null;
  claimed_at: string;
  offer_id?: number | null;
  voucher: Voucher;
}

export interface ClaimVoucherResult {
  claim_id: number;
  claimed_at: string;
  voucher: Voucher;
  new_bonus_quota?: number;
  remaining_quota?: number;
}

export const voucherService = {
  /**
   * Mengambil daftar voucher publik yang aktif dan dapat diklaim (Metode 2).
   */
  async getAvailableVouchers(): Promise<Voucher[]> {
    const res = await apiClient<Voucher[]>('/vouchers/available', {
      method: 'GET',
    });
    return res.data;
  },

  /**
   * Mengambil daftar voucher yang sudah diklaim milik pengguna.
   */
  async getMyVouchers(status?: 'active' | 'used'): Promise<VoucherClaimItem[]> {
    const query = status ? `?status=${status}` : '';
    const res = await apiClient<VoucherClaimItem[]>(`/vouchers/my${query}`, {
      method: 'GET',
    });
    return res.data;
  },

  /**
   * Klaim voucher:
   * - Via kode promo (Metode 1): { code: 'HEMAT50K' }
   * - Via tombol 1-tap (Metode 2): { voucher_id: 12 }
   */
  async claimVoucher(params: { code?: string; voucher_id?: number }): Promise<ClaimVoucherResult> {
    const res = await apiClient<ClaimVoucherResult>('/vouchers/claim', {
      method: 'POST',
      body: JSON.stringify(params),
    });
    return res.data;
  },
};

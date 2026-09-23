import { apiClient } from './api';

export interface ClaimVoucherResult {
  voucher: {
    code: string;
    description?: string;
    quota_amount: number;
  };
  new_bonus_quota: number;
  remaining_quota: number;
}

export const voucherService = {
  async claimVoucher(code: string): Promise<ClaimVoucherResult> {
    const res = await apiClient<ClaimVoucherResult>('/vouchers/claim', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
    return res.data; 
  },
};

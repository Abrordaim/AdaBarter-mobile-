import { apiClient } from './api';

export interface WalletTransaction {
  id: number;
  type: 'credit' | 'debit';
  amount: number;
  reason: string;
  balance_after: number;
  reference_type?: string | null;
  reference_id?: number | null;
  created_at?: string;
}

export interface Withdrawal {
  id: number;
  amount: number;
  bank_name: string;
  account_number: string;
  account_name: string;
  status: 'pending' | 'paid' | 'rejected';
  rejection_reason?: string | null;
  processed_at?: string | null;
  created_at?: string;
}

export interface WalletData {
  balance: number;
  transactions: WalletTransaction[];
}

export interface RequestWithdrawalPayload {
  amount: number;
  bank_name: string;
  account_number: string;
  account_name: string;
}

export const walletService = {
  /**
   * Mengambil saldo dompet dan 30 riwayat mutasi terakhir
   */
  async getWallet(): Promise<WalletData> {
    const res = await apiClient<WalletData>('/wallet', {
      method: 'GET',
    });
    return res.data;
  },

  /**
   * Mengajukan penarikan dana ke rekening bank
   */
  async requestWithdrawal(payload: RequestWithdrawalPayload): Promise<Withdrawal> {
    const res = await apiClient<{ withdrawal: Withdrawal }>('/wallet/withdraw', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data.withdrawal;
  },

  /**
   * Mengambil riwayat pengajuan penarikan dana user
   */
  async getWithdrawals(): Promise<Withdrawal[]> {
    const res = await apiClient<{ data: Withdrawal[] }>('/wallet/withdrawals', {
      method: 'GET',
    });
    // Menangani baik paginated response (.data.data) maupun array langsung (.data)
    if (res.data && Array.isArray((res.data as any).data)) {
      return (res.data as any).data;
    }
    return Array.isArray(res.data) ? res.data : [];
  },
};

import { apiClient } from './api';

/** Paket VIP dari database (id adalah integer) */
export interface SubscriptionPlan {
  id: number;
  name: string;
  duration_days: number;
  price: number;
  formatted_price: string;
  tag?: string;
  badge?: string;
  features: string[];
}

/** Paket iklan sorotan dari database (id adalah integer) */
export interface BoostPackage {
  id: number;
  days: number;
  price: number;
  formatted_price: string;
  label: string;
  tag?: string;
  description: string;
}

/** Paket slot dari database (id adalah integer) */
export interface QuotaPackage {
  id: number;
  slots: number;
  price: number;
  formatted_price: string;
  label: string;
  badge?: string;
}

export interface MonetizationPlansResponse {
  subscription_plans: SubscriptionPlan[];
  boost_packages: BoostPackage[];
  quota_packages: QuotaPackage[];
}

export interface UserTransaction {
  id: number;
  user_id: number;
  type: 'subscription' | 'boost' | 'pay_per_post';
  amount: number;
  description: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  payment_method: string;
  payment_ref: string;
  created_at: string;
}

export const monetizationService = {
  async getPlans(): Promise<MonetizationPlansResponse> {
    const res = await apiClient<MonetizationPlansResponse>('/monetization/plans', {
      method: 'GET',
    });
    return res.data;
  },

  /**
   * Berlangganan VIP.
   * @param planId - integer ID dari database (bukan string seperti "vip_1m")
   */
  async subscribe(planId: number, paymentMethod = 'QRIS / Virtual Account (Simulasi)'): Promise<any> {
    const res = await apiClient('/monetization/subscribe', {
      method: 'POST',
      body: JSON.stringify({ plan_id: planId, payment_method: paymentMethod }),
    });
    return res.data;
  },

  /**
   * Boost barang listing menggunakan ID paket boost.
   * @param boostPackageId - integer ID dari database boost_packages
   * @param days - opsional durasi dalam hari
   */
  async boostItem(itemId: number, boostPackageId: number, days?: number, paymentMethod = 'QRIS / Virtual Account (Simulasi)'): Promise<any> {
    const res = await apiClient(`/monetization/items/${itemId}/boost`, {
      method: 'POST',
      body: JSON.stringify({
        boost_package_id: boostPackageId,
        days: days,
        payment_method: paymentMethod,
      }),
    });
    return res.data;
  },

  /**
   * Beli kuota slot tambahan.
   * @param slotPackageId - integer ID dari database slot_packages
   */
  async purchaseQuota(slotPackageId: number, paymentMethod = 'QRIS / Virtual Account (Simulasi)'): Promise<any> {
    const res = await apiClient('/monetization/quota/purchase', {
      method: 'POST',
      body: JSON.stringify({ slot_package_id: slotPackageId, payment_method: paymentMethod }),
    });
    return res.data;
  },

  async getTransactions(): Promise<UserTransaction[]> {
    const res = await apiClient<UserTransaction[]>('/monetization/transactions', {
      method: 'GET',
    });
    return res.data;
  },
};

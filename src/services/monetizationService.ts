import { apiClient } from './api';

/** Paket VIP dari database (id adalah integer) */
export interface SubscriptionPlan {
  id: number;
  name: string;
  duration_days: number;
  price: number;
  formatted_price: string;
  bonus_post_quota: number;
  bonus_boost_quota: number;
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

export interface MonetizationPlansResponse {
  subscription_plans: SubscriptionPlan[];
  boost_packages: BoostPackage[];
}

export interface SnapPaymentResponse {
  token: string;
  order_id: string;
  gross_amount: number;
  redirect_url: string;
  plan?: any;
  item?: any;
  package?: any;
}

export interface UserTransaction {
  id: number;
  user_id: number;
  type: 'subscription' | 'boost' | 'pay_per_post' | 'escrow';
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
   * Membuat transaksi Snap Token Midtrans untuk berlangganan VIP.
   * @param planId - integer ID dari database vip_plans
   */
  async payVip(planId: number): Promise<SnapPaymentResponse> {
    const res = await apiClient<SnapPaymentResponse>('/monetization/vip/pay', {
      method: 'POST',
      body: JSON.stringify({ plan_id: planId }),
    });
    return res.data;
  },

  /**
   * Membuat transaksi Snap Token Midtrans untuk iklan sorotan (boost) barang.
   * @param itemId - ID barang milik user
   * @param packageId - integer ID dari database boost_packages
   */
  async payBoost(itemId: number, packageId: number): Promise<SnapPaymentResponse> {
    const res = await apiClient<SnapPaymentResponse>(`/monetization/items/${itemId}/boost/pay`, {
      method: 'POST',
      body: JSON.stringify({ boost_package_id: packageId }),
    });
    return res.data;
  },

  /**
   * Boost barang listing secara gratis menggunakan 1 Kuota Boost VIP milik user.
   * @param itemId - ID barang milik user
   */
  async boostWithQuota(itemId: number): Promise<any> {
    const res = await apiClient(`/monetization/items/${itemId}/boost/use-quota`, {
      method: 'POST',
    });
    return res.data;
  },

  /**
   * Direct simulation subscription (opsional / fallback testing)
   */
  async subscribe(planId: number, paymentMethod = 'QRIS / Virtual Account (Simulasi)'): Promise<any> {
    const res = await apiClient('/monetization/subscribe', {
      method: 'POST',
      body: JSON.stringify({ plan_id: planId, payment_method: paymentMethod }),
    });
    return res.data;
  },

  /**
   * Direct simulation boost (opsional / fallback testing)
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

  async getTransactions(): Promise<UserTransaction[]> {
    const res = await apiClient<UserTransaction[]>('/monetization/transactions', {
      method: 'GET',
    });
    return res.data;
  },
};


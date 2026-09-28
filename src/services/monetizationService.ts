import { apiClient } from './api';

export interface SubscriptionPlan {
  id: string;
  name: string;
  duration_days: number;
  price: number;
  formatted_price: string;
  tag?: string;
  badge?: string;
  features: string[];
}

export interface BoostPackage {
  id: string;
  days: number;
  price: number;
  formatted_price: string;
  label: string;
  tag?: string;
  description: string;
}

export interface QuotaPackage {
  id: string;
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

  async subscribe(planId: string, paymentMethod = 'QRIS / Virtual Account (Simulasi)'): Promise<any> {
    const res = await apiClient('/monetization/subscribe', {
      method: 'POST',
      body: JSON.stringify({ plan_id: planId, payment_method: paymentMethod }),
    });
    return res.data;
  },

  async boostItem(itemId: number, days: number, paymentMethod = 'QRIS / Virtual Account (Simulasi)'): Promise<any> {
    const res = await apiClient(`/monetization/items/${itemId}/boost`, {
      method: 'POST',
      body: JSON.stringify({ days, payment_method: paymentMethod }),
    });
    return res.data;
  },

  async purchaseQuota(slots: number, paymentMethod = 'QRIS / Virtual Account (Simulasi)'): Promise<any> {
    const res = await apiClient('/monetization/quota/purchase', {
      method: 'POST',
      body: JSON.stringify({ slots, payment_method: paymentMethod }),
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

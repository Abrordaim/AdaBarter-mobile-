import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText, Button, Badge } from '@/components/atoms';
import { useAuth } from '@/context/AuthContext';
import { monetizationService, UserTransaction } from '@/services/monetizationService';

export default function TransactionsScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  const [transactions, setTransactions] = useState<UserTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTransactions = async (isRefresh = false) => {
    if (!isAuthenticated) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await monetizationService.getTransactions();
      setTransactions(data || []);
    } catch (e: any) {
      console.log('Error fetching transactions:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [isAuthenticated]);

  const getTypeInfo = (type: string) => {
    switch (type) {
      case 'subscription':
        return { icon: '👑', label: 'VIP Subscription', variant: 'warning' as const };
      case 'boost':
        return { icon: '⚡', label: 'Boost Listing', variant: 'info' as const };
      case 'pay_per_post':
      default:
        return { icon: '📦', label: 'Beli Slot Kuota', variant: 'success' as const };
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-900" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center"
        >
          <AppText className="text-xl font-bold">‹</AppText>
        </TouchableOpacity>
        <AppText variant="h3" className="font-bold text-slate-800 dark:text-white">
          Riwayat Transaksi Akun
        </AppText>
        <View className="w-10" />
      </View>

      <ScrollView
        className="flex-1 px-4 py-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 50 }}
      >
        {loading ? (
          <View className="py-20 items-center justify-center">
            <ActivityIndicator size="large" color="#059669" />
            <AppText variant="caption" className="text-slate-500 mt-3">
              Memuat riwayat transaksi...
            </AppText>
          </View>
        ) : transactions.length === 0 ? (
          <View className="py-20 items-center justify-center">
            <View className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full items-center justify-center mb-4">
              <AppText className="text-4xl">🧾</AppText>
            </View>
            <AppText variant="h3" className="font-bold text-slate-800 dark:text-white text-center mb-1">
              Belum Ada Riwayat Transaksi
            </AppText>
            <AppText variant="caption" className="text-slate-500 text-center px-6 mb-6">
              Seluruh transaksi langganan VIP, iklan sorotan boost, dan pembelian kuota tambahan Anda akan tercatat di sini.
            </AppText>
            <Button
              title="Lihat Opsi VIP"
              variant="primary"
              onPress={() => router.push('/monetization/vip')}
            />
          </View>
        ) : (
          <View className="gap-3">
            {transactions.map((trx) => {
              const info = getTypeInfo(trx.type);
              return (
                <View
                  key={trx.id}
                  className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm"
                >
                  <View className="flex-row items-center justify-between mb-2">
                    <View className="flex-row items-center gap-2">
                      <AppText className="text-xl">{info.icon}</AppText>
                      <AppText variant="label" className="font-bold text-slate-900 dark:text-white text-sm">
                        {info.label}
                      </AppText>
                    </View>
                    <Badge variant={trx.status === 'completed' ? 'success' : 'neutral'} text={trx.status === 'completed' ? 'Berhasil' : trx.status} />
                  </View>

                  <AppText variant="caption" className="text-slate-700 dark:text-slate-300 font-medium mb-2">
                    {trx.description}
                  </AppText>

                  <View className="flex-row items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/60">
                    <View>
                      <AppText variant="caption" className="text-slate-400 text-[11px]">
                        Ref: {trx.payment_ref}
                      </AppText>
                      <AppText variant="caption" className="text-slate-400 text-[11px]">
                        {new Date(trx.created_at).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </AppText>
                    </View>

                    <AppText className="font-extrabold text-base text-brand-600 dark:text-brand-400">
                      Rp {Number(trx.amount).toLocaleString('id-ID')}
                    </AppText>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

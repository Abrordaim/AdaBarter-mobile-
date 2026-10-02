import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText, Button, Badge } from '@/components/atoms';
import { useAuth } from '@/context/AuthContext';
import { monetizationService, SubscriptionPlan } from '@/services/monetizationService';

export default function VipSubscriptionScreen() {
  const router = useRouter();
  const { user, isAuthenticated, refreshUser } = useAuth();

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('vip_3m');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/(auth)/login');
      return;
    }
    loadPlans();
  }, [isAuthenticated]);

  const loadPlans = async () => {
    setLoading(true);
    try {
      const data = await monetizationService.getPlans();
      setPlans(data.subscription_plans || []);
      if (data.subscription_plans?.length > 0) {
        setSelectedPlanId(data.subscription_plans[1]?.id || data.subscription_plans[0].id);
      }
    } catch (e: any) {
      Alert.alert('Gagal Memuat', e.message || 'Gagal memuat paket langganan.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async () => {
    const plan = plans.find((p) => p.id === selectedPlanId);
    if (!plan) return;

    Alert.alert(
      'Konfirmasi Langganan VIP 👑',
      `Anda akan mengaktifkan paket ${plan.name} seharga ${plan.formatted_price}. Karena aplikasi berjalan di lingkungan localhost, pembayaran akan langsung disimulasikan berhasil (QRIS/VA).`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Konfirmasi Bayar',
          onPress: async () => {
            setSubmitting(true);
            try {
              await monetizationService.subscribe(plan.id);
              await refreshUser();
              Alert.alert(
                'Selamat! Akun Anda Telah VIP! 👑',
                'Anda sekarang memiliki akses posting barang tanpa batas dan lencana VIP eksklusif di profil serta katalog barter.',
                [
                  {
                    text: 'Mulai Barter',
                    onPress: () => router.replace('/(tabs)/profile'),
                  },
                ]
              );
            } catch (e: any) {
              Alert.alert('Gagal Berlangganan', e.message || 'Terjadi kesalahan.');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white dark:bg-slate-900 justify-center items-center">
        <ActivityIndicator size="large" color="#059669" />
        <AppText variant="caption" className="text-slate-500 mt-3">
          Memuat paket VIP...
        </AppText>
      </SafeAreaView>
    );
  }

  const isAlreadyVip = user?.is_vip ?? false;

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
          AdaBarter VIP Member
        </AppText>
        <View className="w-10" />
      </View>

      <ScrollView className="flex-1 px-4 py-4" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>
        {/* VIP Banner Card */}
        <View className="bg-gradient-to-r bg-emerald-700 p-6 rounded-3xl mb-5 shadow-sm items-center">
          <View className="w-16 h-16 rounded-full bg-amber-400 items-center justify-center mb-3 shadow-md">
            <AppText className="text-3xl">👑</AppText>
          </View>
          <AppText variant="h2" className="text-white font-extrabold text-2xl text-center mb-1">
            Tingkatkan ke Akun VIP
          </AppText>
          <AppText className="text-emerald-100 text-center text-xs px-4">
            Bebas barter tanpa batas kuota postingan dan nikmati eksposur maksimal untuk seluruh barang Anda.
          </AppText>
          {isAlreadyVip && (
            <View className="mt-3 bg-amber-400 px-3 py-1 rounded-full">
              <AppText className="text-xs font-bold text-slate-900">
                ✨ Anda Sedang Memiliki Status VIP Aktif
              </AppText>
            </View>
          )}
        </View>

        {/* Benefits List */}
        <View className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 mb-5">
          <AppText variant="h3" className="font-bold text-slate-900 dark:text-white mb-3">
            Keuntungan Eksklusif VIP
          </AppText>
          <View className="gap-3">
            <View className="flex-row items-center gap-3">
              <View className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950 items-center justify-center">
                <AppText className="text-sm">♾️</AppText>
              </View>
              <View className="flex-1">
                <AppText className="font-bold text-sm text-slate-900 dark:text-white">
                  Posting Barang Tanpa Batas
                </AppText>
                <AppText variant="caption" className="text-slate-500 text-xs">
                  Tidak dibatasi jatah 3 barang gratis, unggah sebanyak mungkin barang layak pakai Anda.
                </AppText>
              </View>
            </View>

            <View className="flex-row items-center gap-3">
              <View className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-950 items-center justify-center">
                <AppText className="text-sm">⭐</AppText>
              </View>
              <View className="flex-1">
                <AppText className="font-bold text-sm text-slate-900 dark:text-white">
                  Lencana VIP Emas Eksklusif
                </AppText>
                <AppText variant="caption" className="text-slate-500 text-xs">
                  Meningkatkan kredibilitas dan kepercayaan pengguna lain saat mengajukan barter.
                </AppText>
              </View>
            </View>

            <View className="flex-row items-center gap-3">
              <View className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950 items-center justify-center">
                <AppText className="text-sm">🚀</AppText>
              </View>
              <View className="flex-1">
                <AppText className="font-bold text-sm text-slate-900 dark:text-white">
                  Prioritas Pencarian & Rekomendasi
                </AppText>
                <AppText variant="caption" className="text-slate-500 text-xs">
                  Barang Anda tampil lebih sering di feed beranda dan rekomendasi barter.
                </AppText>
              </View>
            </View>
          </View>
        </View>

        {/* Plan Cards */}
        <AppText variant="caption" className="text-slate-500 font-bold uppercase tracking-wider mb-3 px-1">
          Pilih Paket Langganan
        </AppText>

        <View className="gap-3 mb-6">
          {plans.map((plan) => {
            const isSelected = selectedPlanId === plan.id;
            return (
              <TouchableOpacity
                key={plan.id}
                onPress={() => setSelectedPlanId(plan.id)}
                className={`p-4 rounded-2xl border ${
                  isSelected
                    ? 'bg-emerald-50 dark:bg-emerald-950 border-brand-600'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                }`}
              >
                <View className="flex-row justify-between items-start mb-2">
                  <View>
                    <View className="flex-row items-center gap-2">
                      <AppText className={`font-bold text-base ${isSelected ? 'text-brand-900 dark:text-emerald-100' : 'text-slate-900 dark:text-white'}`}>
                        {plan.name}
                      </AppText>
                      {plan.badge && (
                        <View className="bg-amber-400 px-2 py-0.5 rounded-full">
                          <AppText className="text-[10px] font-bold text-slate-900">{plan.badge}</AppText>
                        </View>
                      )}
                    </View>
                    <AppText className="text-xs text-slate-500 mt-0.5">
                      Masa aktif {plan.duration_days} hari
                    </AppText>
                  </View>

                  <AppText className="font-extrabold text-lg text-brand-600 dark:text-brand-400">
                    {plan.formatted_price}
                  </AppText>
                </View>

                {/* Features Checklist */}
                <View className="pt-2 border-t border-slate-100 dark:border-slate-700/60 gap-1">
                  {plan.features.map((feat, idx) => (
                    <View key={idx} className="flex-row items-center gap-1.5">
                      <AppText className="text-brand-600 text-xs">✓</AppText>
                      <AppText variant="caption" className="text-slate-600 dark:text-slate-300 text-xs">
                        {feat}
                      </AppText>
                    </View>
                  ))}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Localhost Payment Note */}
        <View className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl mb-4">
          <AppText variant="caption" className="text-slate-500 text-center text-xs">
            💡 Lingkungan Demo / Localhost: Transaksi menggunakan simulasi sistem pembayaran lokal langsung tanpa gateway eksternal.
          </AppText>
        </View>
      </ScrollView>

      {/* Floating Bottom Action */}
      <View className="absolute bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 border-t border-slate-200 dark:border-slate-800 px-5 py-3 shadow-lg">
        <Button
          title={isAlreadyVip ? "Perpanjang Masa Aktif VIP 👑" : "Aktifkan Langganan VIP Sekarang 👑"}
          variant="primary"
          size="lg"
          loading={submitting}
          onPress={handleSubscribe}
        />
      </View>
    </SafeAreaView>
  );
}

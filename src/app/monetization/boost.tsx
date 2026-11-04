import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText, Button, Badge } from '@/components/atoms';
import { useAuth } from '@/context/AuthContext';
import { itemService, BarterItem } from '@/services/itemService';
import { monetizationService, BoostPackage } from '@/services/monetizationService';
import { MidtransPaymentWebView, PaymentStatus } from '@/components/organisms/MidtransPaymentWebView';

export default function BoostItemScreen() {
  const { item_id } = useLocalSearchParams<{ item_id: string }>();
  const router = useRouter();
  const { user, isAuthenticated, refreshUser } = useAuth();

  const [packages, setPackages] = useState<BoostPackage[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<number | null>(null);
  const [myItems, setMyItems] = useState<BarterItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [usingQuota, setUsingQuota] = useState(false);

  // Midtrans WebView state
  const [webViewVisible, setWebViewVisible] = useState(false);
  const [snapUrl, setSnapUrl] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/(auth)/login');
      return;
    }
    loadData();
  }, [item_id, isAuthenticated]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [plansData, items] = await Promise.all([
        monetizationService.getPlans(),
        itemService.getMyItems(),
      ]);
      const boostPkgs = plansData.boost_packages || [];
      setPackages(boostPkgs);
      if (boostPkgs.length > 0) {
        const preferred = boostPkgs.find((p) => p.days === 7) || boostPkgs[0];
        setSelectedPackageId(preferred.id);
      }
      const activeItems = items.filter((it) => it.status === 'active');
      setMyItems(activeItems); 

      if (item_id) {
        setSelectedItemId(parseInt(item_id, 10));
      } else if (activeItems.length > 0) {
        setSelectedItemId(activeItems[0].id);
      }
    } catch (e: any) {
      Alert.alert('Gagal Memuat', e.message || 'Gagal memuat paket boost.');
    } finally {
      setLoading(false);
    }
  };

  const handleBoost = async () => {
    if (!selectedItemId) {
      Alert.alert('Perhatian', 'Pilih salah satu barang milik Anda untuk di-boost.');
      return;
    }

    const pkg = packages.find((p) => p.id === selectedPackageId);
    if (!pkg) return;

    setSubmitting(true);
    try {
      const result = await monetizationService.payBoost(selectedItemId, pkg.id);
      if (result.redirect_url) {
        setSnapUrl(result.redirect_url);
        setPaymentAmount(result.gross_amount || pkg.price);
        setWebViewVisible(true);
      } else {
        Alert.alert('Gagal Memulai Pembayaran', 'Tidak dapat membuka halaman pembayaran Midtrans.');
      }
    } catch (e: any) {
      Alert.alert('Gagal Memulai Pembayaran', e.message || 'Terjadi kesalahan sistem.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBoostWithQuota = async () => {
    if (!selectedItemId) {
      Alert.alert('Perhatian', 'Pilih salah satu barang milik Anda untuk di-boost.');
      return;
    }

    const selectedItem = myItems.find((it) => it.id === selectedItemId);
    const itemTitle = selectedItem?.title || 'barang ini';

    Alert.alert(
      'Gunakan 1 Kuota Boost VIP ⚡',
      `Anda akan menggunakan 1 kuota boost gratis untuk menyematkan "${itemTitle}" di posisi teratas selama 7 hari. Lanjutkan?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Gunakan Kuota',
          onPress: async () => {
            setUsingQuota(true);
            try {
              await monetizationService.boostWithQuota(selectedItemId);
              await refreshUser();
              await loadData();
              Alert.alert(
                'Barang Berhasil Di-Boost! ⚡',
                `Barang "${itemTitle}" berhasil disematkan di posisi teratas etalase selama 7 hari menggunakan Kuota Boost VIP Anda.`,
                [
                  {
                    text: 'Lihat di Beranda',
                    onPress: () => router.replace('/(tabs)'),
                  },
                ]
              );
            } catch (e: any) {
              Alert.alert('Gagal Memproses Boost', e.message || 'Terjadi kesalahan.');
            } finally {
              setUsingQuota(false);
            }
          },
        },
      ]
    );
  };

  const handlePaymentFinish = async (status: PaymentStatus) => {
    setWebViewVisible(false);

    if (status === 'success') {
      await refreshUser();
      await loadData();
      Alert.alert(
        'Barang Berhasil Di-Boost! ⚡',
        'Pembayaran berhasil dikonfirmasi. Barang Anda kini telah disematkan di posisi teratas feed beranda.',
        [
          {
            text: 'Lihat di Beranda',
            onPress: () => router.replace('/(tabs)'),
          },
        ]
      );
    } else if (status === 'pending') {
      await refreshUser();
      Alert.alert(
        'Pembayaran Sedang Diproses ⏳',
        'Transaksi Anda sedang menunggu konfirmasi pembayaran. Sorotan iklan barang Anda akan aktif segera setelah pembayaran diverifikasi.',
        [
          {
            text: 'Ke Beranda',
            onPress: () => router.replace('/(tabs)'),
          },
        ]
      );
    } else if (status === 'error') {
      Alert.alert('Pembayaran Gagal', 'Pembayaran tidak berhasil diselesaikan. Silakan coba kembali.');
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white dark:bg-slate-900 justify-center items-center">
        <ActivityIndicator size="large" color="#059669" />
        <AppText variant="caption" className="text-slate-500 mt-3">
          Memuat opsi boost...
        </AppText>
      </SafeAreaView>
    );
  }

  const userBoostQuota = user?.boost_quota ?? 0;

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
          Iklan Sorotan (Boost)
        </AppText>
        <View className="w-10" />
      </View>

      <ScrollView className="flex-1 px-4 py-4" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>
        {/* Intro Card */}
        <View className="bg-amber-500 p-5 rounded-3xl mb-5 shadow-sm">
          <View className="flex-row items-center gap-2 mb-2">
            <AppText className="text-2xl">⚡</AppText>
            <AppText variant="h2" className="text-white font-extrabold text-xl">
              Tampil di Posisi Teratas
            </AppText>
          </View>
          <AppText className="text-amber-50 text-xs leading-5">
            Dapatkan tawaran barter 3x lebih cepat! Barang yang di-boost akan selalu diprioritaskan di baris pertama feed beranda dengan lencana emas 'Pinned'.
          </AppText>
        </View>

        {/* VIP Free Boost Quota Banner (jika memiliki kuota boost dari VIP) */}
        {userBoostQuota > 0 && (
          <View className="bg-emerald-50 dark:bg-emerald-950/40 p-5 rounded-2xl border-2 border-emerald-500 mb-5 shadow-sm">
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center gap-2">
                <AppText className="text-lg">👑</AppText>
                <AppText className="font-bold text-sm text-emerald-900 dark:text-emerald-100">
                  Kuota Boost VIP Tersedia
                </AppText>
              </View>
              <View className="bg-emerald-600 px-2.5 py-0.5 rounded-full">
                <AppText className="text-xs font-extrabold text-white">
                  {userBoostQuota} Slot Gratis
                </AppText>
              </View>
            </View>
            <AppText variant="caption" className="text-emerald-800 dark:text-emerald-200 text-xs mb-3">
              Sebagai keuntungan member VIP, Anda dapat langsung menyematkan barang selama 7 hari tanpa biaya tambahan.
            </AppText>
            <Button
              title="Gunakan 1 Kuota Boost VIP Gratis ⚡"
              variant="primary"
              size="md"
              loading={usingQuota}
              disabled={!selectedItemId || myItems.length === 0}
              onPress={handleBoostWithQuota}
            />
          </View>
        )}

        {/* Section: Select Item to Boost */}
        <AppText variant="caption" className="text-slate-500 font-bold uppercase tracking-wider mb-2 px-1">
          Pilih Barang yang Ingin Disorot
        </AppText>

        {myItems.length === 0 ? (
          <View className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 items-center mb-5">
            <AppText className="text-3xl mb-2">📦</AppText>
            <AppText variant="label" className="font-bold text-slate-800 dark:text-white mb-1">
              Tidak Ada Barang Aktif
            </AppText>
            <AppText variant="caption" className="text-slate-500 text-center mb-3">
              Anda belum memiliki barang aktif di etalase untuk di-boost.
            </AppText>
            <Button
              title="Upload Barang Sekarang"
              variant="primary"
              onPress={() => router.push('/(tabs)/add-item')}
            />
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row mb-5">
            {myItems.map((item) => {
              const isSelected = selectedItemId === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => setSelectedItemId(item.id)}
                  className={`w-40 mr-3 p-3 rounded-2xl border ${
                    isSelected
                      ? 'bg-amber-50 dark:bg-amber-950 border-amber-500'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <View className="h-24 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-700 mb-2">
                    {item.primary_image || item.images?.[0] ? (
                      <Image
                        source={{ uri: item.primary_image || item.images[0] }}
                        className="w-full h-full"
                        resizeMode="cover"
                      />
                    ) : (
                      <View className="flex-1 items-center justify-center">
                        <AppText className="text-2xl">📦</AppText>
                      </View>
                    )}
                  </View>
                  <AppText variant="label" className="font-bold text-xs text-slate-900 dark:text-white mb-0.5" numberOfLines={1}>
                    {item.title}
                  </AppText>
                  {item.is_boosted ? (
                    <Badge variant="warning" text="Sedang Pinned ⚡" />
                  ) : (
                    <AppText variant="caption" className="text-slate-400 text-[11px]">
                      Status Normal
                    </AppText>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Section: Select Boost Package */}
        <AppText variant="caption" className="text-slate-500 font-bold uppercase tracking-wider mb-2 px-1">
          Atau Beli Paket Durasi Sorotan
        </AppText>

        <View className="gap-3 mb-6">
          {packages.map((pkg) => {
            const isSelected = selectedPackageId === pkg.id;
            return (
              <TouchableOpacity
                key={pkg.id}
                onPress={() => setSelectedPackageId(pkg.id)}
                className={`p-4 rounded-2xl border flex-row items-center justify-between ${
                  isSelected
                    ? 'bg-amber-50 dark:bg-amber-950 border-amber-500'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                }`}
              >
                <View className="flex-1 pr-3">
                  <View className="flex-row items-center gap-2 mb-0.5">
                    <AppText className={`font-bold text-base ${isSelected ? 'text-amber-900 dark:text-amber-200' : 'text-slate-900 dark:text-white'}`}>
                      {pkg.label}
                    </AppText>
                    {pkg.tag && (
                      <View className="bg-amber-400 px-2 py-0.5 rounded-full">
                        <AppText className="text-[10px] font-bold text-slate-900">{pkg.tag}</AppText>
                      </View>
                    )}
                  </View>
                  <AppText variant="caption" className="text-slate-500 text-xs">
                    {pkg.description}
                  </AppText>
                </View>

                <AppText className="font-extrabold text-base text-amber-600 dark:text-amber-400">
                  {pkg.formatted_price}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Floating Bottom Action */}
      <View className="absolute bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 border-t border-slate-200 dark:border-slate-800 px-5 py-3 shadow-lg">
        <Button
          title={
            packages.find((p) => p.id === selectedPackageId)
              ? `Bayar ${packages.find((p) => p.id === selectedPackageId)?.label} ⚡`
              : 'Aktifkan Boost ⚡'
          }
          variant="primary"
          size="lg"
          loading={submitting}
          disabled={!selectedItemId || myItems.length === 0}
          className="bg-amber-500 active:bg-amber-600"
          onPress={handleBoost}
        />
      </View>

      {/* Midtrans Snap WebView Modal */}
      {webViewVisible && snapUrl ? (
        <MidtransPaymentWebView
          snapUrl={snapUrl}
          amount={paymentAmount}
          onPaymentFinish={handlePaymentFinish}
          onClose={() => setWebViewVisible(false)}
        />
      ) : null}
    </SafeAreaView>
  );
}


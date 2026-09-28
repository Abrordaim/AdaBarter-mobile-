import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, Alert, Modal, TextInput, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { MainTemplate } from '@/components/templates';
import { AppText, Button, Avatar, Badge, Icon } from '@/components/atoms';
import { useAuth } from '@/context/AuthContext';
import { userService, UserProfileData } from '@/services/userService';
import { voucherService } from '@/services/voucherService';
import { monetizationService } from '@/services/monetizationService';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, isAuthenticated, logout, refreshUser } = useAuth();

  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(false);

  // Voucher state
  const [voucherModalVisible, setVoucherModalVisible] = useState(false);
  const [voucherCode, setVoucherCode] = useState('');
  const [claimingVoucher, setClaimingVoucher] = useState(false);

  // Quota purchase modal state
  const [quotaModalVisible, setQuotaModalVisible] = useState(false);
  const [purchasingQuota, setPurchasingQuota] = useState(false);

  const fetchProfile = async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const data = await userService.getProfile();
      setProfile(data);
    } catch (e: any) {
      console.log('Failed to fetch profile:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [isAuthenticated]);

  const handleLogout = () => {
    Alert.alert('Konfirmasi Keluar', 'Apakah Anda yakin ingin keluar dari akun AdaBarter?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Keluar',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(tabs)');
        },
      },
    ]);
  };

  const handleClaimVoucher = async () => {
    if (!voucherCode.trim()) {
      Alert.alert('Perhatian', 'Harap masukkan kode voucher.');
      return;
    }

    setClaimingVoucher(true);
    try {
      const result = await voucherService.claimVoucher(voucherCode.trim());
      Alert.alert(
        'Klaim Berhasil! 🎉',
        `Selamat! Anda mendapatkan tambahan kuota +${result.voucher.quota_amount} postingan. Sisa kuota aktif Anda sekarang: ${result.remaining_quota}.`
      );
      setVoucherModalVisible(false);
      setVoucherCode('');
      await fetchProfile();
      await refreshUser();
    } catch (e: any) {
      const msg = e.errors?.code?.[0] || e.message || 'Gagal mengklaim voucher.';
      Alert.alert('Gagal Klaim Voucher', msg);
    } finally {
      setClaimingVoucher(false);
    }
  };

  const handlePurchaseQuota = async (slots: number, price: string) => {
    Alert.alert(
      'Beli Slot Kuota Tambahan 📦',
      `Beli +${slots} slot posting seharga ${price}? (Simulasi pembayaran localhost)`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Konfirmasi Bayar',
          onPress: async () => {
            setPurchasingQuota(true);
            try {
              const res = await monetizationService.purchaseQuota(slots);
              Alert.alert(
                'Pembelian Berhasil! 🎉',
                `Kuota posting Anda bertambah +${slots} slot. Sisa kuota aktif Anda saat ini: ${res.remaining_quota}.`
              );
              setQuotaModalVisible(false);
              await fetchProfile();
              await refreshUser();
            } catch (e: any) {
              Alert.alert('Gagal Membeli Kuota', e.message || 'Terjadi kesalahan.');
            } finally {
              setPurchasingQuota(false);
            }
          },
        },
      ]
    );
  };

  // If not authenticated, show guest state with login prompt
  if (!isAuthenticated) {
    return (
      <MainTemplate title="Akunku">
        <View className="px-6 py-12 items-center justify-center">
          <View className="w-24 h-24 bg-brand-100 dark:bg-brand-900/30 rounded-full items-center justify-center mb-6">
            <Icon name="person" size={48} color="#059669" />
          </View>
          <AppText variant="h2" className="text-center font-bold mb-2 text-slate-800 dark:text-white">
            Bergabung dengan AdaBarter
          </AppText>
          <AppText variant="body" className="text-center text-slate-600 dark:text-slate-400 mb-8 px-4">
            Masuk atau buat akun baru untuk mengunggah barang, mengajukan penawaran barter, dan chat dengan pengguna lain.
          </AppText>

          <View className="w-full gap-3">
            <Button
              title="Masuk ke Akun"
              variant="primary"
              size="lg"
              onPress={() => router.push('/(auth)/login')}
            />
            <Button
              title="Daftar Akun Baru"
              variant="secondary"
              size="lg"
              onPress={() => router.push('/(auth)/register')}
            />
          </View>
        </View>
      </MainTemplate>
    );
  }

  const freeQuota = profile?.free_post_quota ?? user?.free_post_quota ?? 3;
  const bonusQuota = profile?.bonus_post_quota ?? user?.bonus_post_quota ?? 0;
  const activeItems = profile?.active_items_count ?? user?.active_items_count ?? 0;
  const remainingQuota = profile?.remaining_quota ?? user?.remaining_quota ?? 0;
  const isVip = profile?.is_vip ?? user?.is_vip ?? false;
  const totalSlots = freeQuota + bonusQuota;
  const usagePercentage = totalSlots > 0 ? Math.min(100, Math.round((activeItems / totalSlots) * 100)) : 0;

  return (
    <MainTemplate title="Akunku" onRefresh={fetchProfile} refreshing={loading}>
      <View className="px-4 py-4">
        {/* Profile Card */}
        <View className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 mb-4">
          <View className="flex-row items-center gap-4">
            <Avatar
              name={user?.name || 'User'}
              url={user?.avatar_url || undefined}
              size="lg"
            />
            <View className="flex-1">
              <View className="flex-row items-center gap-2 flex-wrap mb-1">
                <AppText variant="h3" className="font-bold text-slate-900 dark:text-white">
                  {user?.name}
                </AppText>
                {isVip && <Badge variant="warning" text="VIP Member 👑" />}
                {user?.role === 'super_admin' && <Badge variant="error" text="Super Admin" />}
                {user?.role === 'admin' && <Badge variant="info" text="Admin" />}
              </View>
              <AppText variant="caption" className="text-slate-500 dark:text-slate-400 mb-0.5">
                {user?.email}
              </AppText>
              {user?.city && (
                <View className="flex-row items-center gap-1">
                  <AppText variant="caption" className="terrxt-brand-600 font-medium ">
                    <Icon name="location-outline" size={12} color="black" />
                    <Text className="border">
                      {user.city}
                    </Text>
                  </AppText>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* VIP Upgrade Promo Banner */}
        {!isVip ? (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push('/monetization/vip')}
            className="bg-amber-500 p-4 rounded-2xl mb-4 shadow-sm flex-row items-center justify-between"
          >
            <View className="flex-1 pr-2">
              <View className="flex-row items-center gap-1.5 mb-1">
                <AppText className="text-lg">
                  <Icon name="star-outline" size={24}  color="yellow" />
                    
                </AppText>
                <AppText className="text-white font-extrabold text-base">
                  Tingkatkan ke VIP Member
                </AppText>
              </View>
              <AppText className="text-amber-50 text-xs">
                Nikmati kuota posting tanpa batas dan lencana emas eksklusif.
              </AppText>
            </View>
            <View className="bg-white px-3 py-1.5 rounded-full shadow-sm">
              <AppText className="text-xs font-bold text-slate-900">Lihat Paket</AppText>
            </View>
          </TouchableOpacity>
        ) : (
          <View className="bg-emerald-700 p-4 rounded-2xl mb-4 shadow-sm flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <AppText className="text-2xl">
                 <Icon name="star" size={24}  color="yellow" />
              </AppText>
              <View>
                <AppText className="text-white font-bold text-sm">Status VIP Aktif</AppText>
                <AppText className="text-emerald-100 text-xs">Posting tanpa batas aktif</AppText>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => router.push('/monetization/vip')}
              className="bg-emerald-800 px-3 py-1 rounded-full"
            >
              <AppText className="text-xs text-white font-medium">Perpanjang</AppText>
            </TouchableOpacity>
          </View>
        )}

        {/* Visual Quota Indicator Card (PRD Core Feature) */}
        <View className="bg-emerald-50/80 dark:bg-emerald-950/30 p-5 rounded-2xl border border-emerald-200 dark:border-emerald-800 mb-4">
          <View className="flex-row justify-between items-center mb-3">
            <View className="flex-row items-center gap-2">
              <AppText className="text-lg">📦</AppText>
              <AppText variant="h3" className="font-bold text-emerald-900 dark:text-emerald-100">
                Status Kuota Postingan
              </AppText>
            </View>
            <View className="flex-row gap-1.5">
              <TouchableOpacity
                onPress={() => setVoucherModalVisible(true)}
                className="bg-emerald-600 px-2.5 py-1.5 rounded-full flex-row items-center gap-1 shadow-sm"
              >
                <AppText className="text-[11px] text-white font-bold">🎟️ Voucher</AppText>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setQuotaModalVisible(true)}
                className="bg-amber-500 px-2.5 py-1.5 rounded-full flex-row items-center gap-1 shadow-sm"
              >
                <AppText className="text-[11px] text-white font-bold">+ Beli Slot</AppText>
              </TouchableOpacity>
            </View>
          </View>

          <AppText variant="caption" className="text-emerald-800 dark:text-emerald-200 mb-3">
            {isVip
              ? 'Akun VIP: Anda memiliki akses postingan tanpa batas!'
              : `Batas dasar gratis: ${freeQuota} barang aktif. Sisa kuota menentukan berapa barang lagi yang dapat Anda unggah ke etalase.`}
          </AppText>

          {/* Progress Bar Visualizer */}
          <View className="h-3 w-full bg-emerald-200 dark:bg-emerald-900 rounded-full overflow-hidden mb-3">
            <View
              className={`h-full ${usagePercentage >= 100 ? 'bg-amber-500' : 'bg-brand-600'} rounded-full`}
              style={{ width: `${isVip ? 100 : usagePercentage}%` }}
            />
          </View>

          {/* Slot Breakdown Indicators */}
          <View className="flex-row justify-between items-center pt-2 border-t border-emerald-200/60 dark:border-emerald-800/60">
            <View className="items-center flex-1">
              <AppText variant="caption" className="text-emerald-700 dark:text-emerald-300">
                Slot Terpakai
              </AppText>
              <AppText className="font-bold text-base text-emerald-900 dark:text-white">
                {activeItems} barang
              </AppText>
            </View>
            <View className="h-8 w-px bg-emerald-300 dark:bg-emerald-800" />
            <View className="items-center flex-1">
              <AppText variant="caption" className="text-emerald-700 dark:text-emerald-300">
                Bonus Voucher & Beli
              </AppText>
              <AppText className="font-bold text-base text-emerald-900 dark:text-white">
                +{bonusQuota} slot
              </AppText>
            </View>
            <View className="h-8 w-px bg-emerald-300 dark:bg-emerald-800" />
            <View className="items-center flex-1">
              <AppText variant="caption" className="text-emerald-700 dark:text-emerald-300">
                Sisa Kuota
              </AppText>
              <AppText className={`font-bold text-base ${remainingQuota === 0 && !isVip ? 'text-amber-600' : 'text-brand-700 dark:text-brand-300'}`}>
                {isVip ? '∞' : `${remainingQuota} slot`}
              </AppText>
            </View>
          </View>
        </View>

        {/* Activity Summary Cards */}
        <View className="flex-row gap-3 mb-4">
          <View className="flex-1 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 items-center">
            <AppText className="text-2xl font-bold text-brand-600 mb-1">
              {profile?.sent_offers_count ?? user?.sent_offers_count ?? 0}
            </AppText>
            <AppText variant="caption" className="text-slate-600 dark:text-slate-400 text-center">
              Penawaran Terkirim
            </AppText>
          </View>
          <View className="flex-1 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 items-center">
            <AppText className="text-2xl font-bold text-blue-600 mb-1">
              {profile?.received_offers_count ?? user?.received_offers_count ?? 0}
            </AppText>
            <AppText variant="caption" className="text-slate-600 dark:text-slate-400 text-center">
              Penawaran Masuk
            </AppText>
          </View>
        </View>

        {/* Account Monetization & Action Buttons */}
        <View className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden mb-6">
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/tukaranku')}
            className="flex-row items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700"
          >
            <View className="flex-row items-center gap-3">
              <Icon name="repeat" size={20} color="#059669" />
              <AppText variant="body" className="font-medium text-slate-800 dark:text-slate-200">
                Kelola Tawaran Barter (Tukaranku)
              </AppText>
            </View>
            <AppText className="text-slate-400">›</AppText>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/monetization/vip')}
            className="flex-row items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700"
          >
            <View className="flex-row items-center gap-3">
              <AppText className="text-lg">
                 <Icon name="star-outline" size={24}  color="yellow" />
              </AppText>
              <AppText variant="body" className="font-medium text-slate-800 dark:text-slate-200">
                Paket Langganan VIP
              </AppText>
            </View>
            <AppText className="text-slate-400">›</AppText>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/monetization/boost')}
            className="flex-row items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700"
          >
            <View className="flex-row items-center gap-3">
              <AppText className="text-lg">⚡</AppText>
              <AppText variant="body" className="font-medium text-slate-800 dark:text-slate-200">
                Iklan Sorotan (Boost Listing)
              </AppText>
            </View>
            <AppText className="text-slate-400">›</AppText>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/monetization/transactions')}
            className="flex-row items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700"
          >
            <View className="flex-row items-center gap-3">
              <AppText className="text-lg">🧾</AppText>
              <AppText variant="body" className="font-medium text-slate-800 dark:text-slate-200">
                Riwayat Transaksi & Tagihan
              </AppText>
            </View>
            <AppText className="text-slate-400">›</AppText>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setVoucherModalVisible(true)}
            className="flex-row items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700"
          >
            <View className="flex-row items-center gap-3">
              <AppText className="text-lg">🎟️</AppText>
              <AppText variant="body" className="font-medium text-slate-800 dark:text-slate-200">
                Klaim Voucher Tambahan Kuota
              </AppText>
            </View>
            <AppText className="text-slate-400">›</AppText>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleLogout}
            className="flex-row items-center justify-between p-4"
          >
            <View className="flex-row items-center gap-3">
              <AppText className="text-lg">🚪</AppText>
              <AppText variant="body" className="font-medium text-red-600 dark:text-red-400">
                Keluar dari Akun
              </AppText>
            </View>
            <AppText className="text-slate-400">›</AppText>
          </TouchableOpacity>
        </View>
      </View>

      {/* Claim Voucher Modal */}
      <Modal
        visible={voucherModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setVoucherModalVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-center items-center px-6">
          <View className="bg-white dark:bg-slate-800 w-full p-6 rounded-3xl shadow-lg">
            <View className="items-center mb-4">
              <View className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950 rounded-full items-center justify-center mb-2">
                <AppText className="text-3xl">🎟️</AppText>
              </View>
              <AppText variant="h3" className="font-bold text-center text-slate-900 dark:text-white">
                Klaim Voucher Kuota
              </AppText>
              <AppText variant="caption" className="text-center text-slate-500 dark:text-slate-400 mt-1">
                Masukkan kode voucher khusus untuk menambah batas kuota postingan aktif Anda secara gratis.
              </AppText>
            </View>

            <View className="border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-3 mb-4 bg-slate-50 dark:bg-slate-900">
              <TextInput
                placeholder="Contoh: WELCOME2024 atau BARTERFEST"
                placeholderTextColor="#94a3b8"
                autoCapitalize="characters"
                value={voucherCode}
                onChangeText={setVoucherCode}
                className="text-center font-bold text-lg text-slate-900 dark:text-white tracking-widest"
              />
            </View>

            <View className="flex-row gap-3">
              <View className="flex-1">
                <Button
                  title="Batal"
                  variant="secondary"
                  onPress={() => {
                    setVoucherModalVisible(false);
                    setVoucherCode('');
                  }}
                />
              </View>
              <View className="flex-1">
                <Button
                  title="Klaim"
                  variant="primary"
                  loading={claimingVoucher}
                  onPress={handleClaimVoucher}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Purchase Quota Modal */}
      <Modal
        visible={quotaModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setQuotaModalVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-center items-center px-6">
          <View className="bg-white dark:bg-slate-800 w-full p-6 rounded-3xl shadow-lg">
            <View className="items-center mb-4">
              <View className="w-16 h-16 bg-amber-100 dark:bg-amber-950 rounded-full items-center justify-center mb-2">
                <AppText className="text-3xl">📦</AppText>
              </View>
              <AppText variant="h3" className="font-bold text-center text-slate-900 dark:text-white">
                Beli Slot Kuota Tambahan
              </AppText>
              <AppText variant="caption" className="text-center text-slate-500 dark:text-slate-400 mt-1">
                Perlu menambah barang aktif di etalase? Pilih paket slot posting satuan berikut:
              </AppText>
            </View>

            <View className="gap-2.5 mb-5">
              <TouchableOpacity
                onPress={() => handlePurchaseQuota(1, 'Rp 10.000')}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 flex-row items-center justify-between"
              >
                <AppText className="font-bold text-slate-800 dark:text-slate-200">+1 Slot Barang</AppText>
                <AppText className="font-extrabold text-brand-600">Rp 10.000</AppText>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handlePurchaseQuota(3, 'Rp 25.000')}
                className="p-3.5 rounded-xl border border-amber-400 bg-amber-50/50 dark:bg-amber-950/20 flex-row items-center justify-between"
              >
                <View className="flex-row items-center gap-2">
                  <AppText className="font-bold text-slate-800 dark:text-slate-200">+3 Slot Barang</AppText>
                  <View className="bg-amber-400 px-1.5 py-0.5 rounded">
                    <AppText className="text-[10px] font-bold text-slate-900">Hemat 5rb</AppText>
                  </View>
                </View>
                <AppText className="font-extrabold text-brand-600">Rp 25.000</AppText>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handlePurchaseQuota(5, 'Rp 40.000')}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 flex-row items-center justify-between"
              >
                <View className="flex-row items-center gap-2">
                  <AppText className="font-bold text-slate-800 dark:text-slate-200">+5 Slot Barang</AppText>
                  <View className="bg-emerald-500 px-1.5 py-0.5 rounded">
                    <AppText className="text-[10px] font-bold text-white">Hemat 10rb</AppText>
                  </View>
                </View>
                <AppText className="font-extrabold text-brand-600">Rp 40.000</AppText>
              </TouchableOpacity>
            </View>

            <Button
              title="Tutup"
              variant="secondary"
              onPress={() => setQuotaModalVisible(false)}
            />
          </View>
        </View>
      </Modal>
    </MainTemplate>
  );
}

import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, Alert, Modal, TextInput, Text, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { MainTemplate } from '@/components/templates';
import { AppText, Button, Avatar, Badge, Icon, Input } from '@/components/atoms';
import { useAuth } from '@/context/AuthContext';
import { userService, UserProfileData } from '@/services/userService';
import { voucherService } from '@/services/voucherService';
import { monetizationService } from '@/services/monetizationService';
import { itemService, BarterItem } from '@/services/itemService';
import { API_BASE_URL } from '@/services/api';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, isAuthenticated, logout, refreshUser } = useAuth();

  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(false);

  // Edit Profile state
  const [editProfileVisible, setEditProfileVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editCity, setEditCity] = useState('');
  const [newAvatarAsset, setNewAvatarAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [updatingProfile, setUpdatingProfile] = useState(false);

  // My items state
  const [myItems, setMyItems] = useState<BarterItem[]>([]);
  const [myItemsLoading, setMyItemsLoading] = useState(false);
  const [showMyItems, setShowMyItems] = useState(false);

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

  const fetchMyItems = async () => {
    setMyItemsLoading(true);
    try {
      const items = await itemService.getMyItems();
      setMyItems(items);
    } catch (e: any) {
      console.log('Failed to fetch my items:', e);
    } finally {
      setMyItemsLoading(false);
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

  const handleDeleteItem = (item: BarterItem) => {
    Alert.alert(
      'Hapus Barang',
      `Hapus "${item.title}"? Barang yang sudah dihapus tidak dapat dikembalikan.`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            try {
              await itemService.deleteItem(item.id);
              setMyItems((prev) => prev.filter((i) => i.id !== item.id));
              await refreshUser();
              Alert.alert('Berhasil', 'Barang berhasil dihapus.');
            } catch (e: any) {
              Alert.alert('Gagal Hapus', e.message || 'Terjadi kesalahan.');
            }
          },
        },
      ]
    );
  };

  const handleToggleMyItems = () => {
    if (!showMyItems) {
      fetchMyItems();
    }
    setShowMyItems((prev) => !prev);
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
      'Beli Slot Kuota Tambahan',
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
                'Pembelian Berhasil! ',
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

  const openEditProfile = () => {
    setEditName(user?.name || profile?.name || '');
    setEditPhone(user?.phone || profile?.phone || '');
    setEditCity(user?.city || profile?.city || '');
    setNewAvatarAsset(null);
    setEditProfileVisible(true);
  };

  const pickAvatar = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Izin Ditolak', 'Aplikasi membutuhkan izin akses galeri untuk mengganti foto profil.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images' as any,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setNewAvatarAsset(result.assets[0]);
      }
    } catch (e: any) {
      Alert.alert('Gagal Memilih Foto', e.message || 'Terjadi kesalahan saat membuka galeri.');
    }
  };

  const handleUpdateProfile = async () => {
    if (!editName.trim()) {
      Alert.alert('Perhatian', 'Nama lengkap wajib diisi.');
      return;
    }

    setUpdatingProfile(true);
    try {
      await userService.updateProfile(
        {
          name: editName.trim(),
          phone: editPhone.trim() || undefined,
          city: editCity.trim() || undefined,
        },
        newAvatarAsset
      );

      await Promise.all([refreshUser(), fetchProfile()]);

      Alert.alert('Berhasil! 🎉', 'Data profil Anda berhasil diperbarui.');
      setEditProfileVisible(false);
    } catch (e: any) {
      const msg = e.errors?.name?.[0] || e.errors?.phone?.[0] || e.errors?.city?.[0] || e.errors?.avatar?.[0] || e.message || 'Gagal memperbarui profil.';
      Alert.alert('Gagal Update Profil', msg);
    } finally {
      setUpdatingProfile(false);
    }
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
            <TouchableOpacity onPress={openEditProfile} activeOpacity={0.8} className="relative">
              <Avatar
                name={user?.name || 'User'}
                url={user?.avatar_url || undefined}
                size="lg"
              />
              <View className="absolute -bottom-1 -right-1 bg-brand-600 rounded-full p-1 border-2 border-white dark:border-slate-800">
                <Icon name="camera" size={12} color="#ffffff" />
              </View>
            </TouchableOpacity>

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

              <View className="flex-row items-center gap-3 flex-wrap mt-0.5">
                {user?.city ? (
                  <View className="flex-row items-center gap-1">
                    <Icon name="location-outline" size={12} color="#059669" />
                    <AppText variant="caption" className="text-slate-600 dark:text-slate-300 font-medium">
                      {user.city}
                    </AppText>
                  </View>
                ) : null}
                {user?.phone ? (
                  <View className="flex-row items-center gap-1">
                    <Icon name="call-outline" size={12} color="#059669" />
                    <AppText variant="caption" className="text-slate-600 dark:text-slate-300 font-medium">
                      {user.phone}
                    </AppText>
                  </View>
                ) : null}
              </View>
            </View>

            <TouchableOpacity
              onPress={openEditProfile}
              activeOpacity={0.7}
              className="bg-brand-50 dark:bg-brand-950/40 p-2.5 rounded-xl border border-brand-200 dark:border-brand-800 items-center justify-center"
            >
              <Icon name="create-outline" size={20} color="#059669" />
            </TouchableOpacity>
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
              <AppText variant="h3" className="font-bold text-emerald-900 dark:text-emerald-100">
                Kuota Postingan
              </AppText>
            </View>
            <View className="flex-row gap-1.5">
              <TouchableOpacity
                onPress={() => setVoucherModalVisible(true)}
                className="bg-emerald-600 px-2.5 py-1.5 rounded-full flex-row items-center gap-1 shadow-sm"
              >
                <AppText className="text-[11px] text-white font-bold">Voucher</AppText>
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
                Voucher & Beli
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
        <View className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden mb-4">
          {/* ── Barang Saya (expandable) ── */}
          <TouchableOpacity
            onPress={handleToggleMyItems}
            className="flex-row items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700"
          >
            <View className="flex-row items-center gap-3">
              <Icon name="cube-outline" size={20} color="#059669" />
              <AppText variant="body" className="font-medium text-slate-800 dark:text-slate-200">
                Barang Saya
              </AppText>
              {myItems.length > 0 && (
                <View className="bg-brand-100 dark:bg-brand-900 px-2 py-0.5 rounded-full">
                  <AppText className="text-[11px] font-bold text-brand-700 dark:text-brand-300">
                    {myItems.length}
                  </AppText>
                </View>
              )}
            </View>
            <Icon
              name={showMyItems ? 'chevron-up' : 'chevron-down'}
              size={18}
              color="#94a3b8"
            />
          </TouchableOpacity>

          {/* Expandable items list */}
          {showMyItems && (
            <View className="border-b border-slate-100 dark:border-slate-700">
              {myItemsLoading ? (
                <View className="py-8 items-center">
                  <ActivityIndicator size="small" color="#059669" />
                  <AppText variant="caption" className="text-slate-500 mt-2">Memuat barang...</AppText>
                </View>
              ) : myItems.length === 0 ? (
                <View className="py-8 items-center px-4">
                  <AppText className="text-3xl mb-2">📦</AppText>
                  <AppText variant="body" className="font-semibold text-slate-700 dark:text-slate-300 text-center">
                    Belum Ada Barang
                  </AppText>
                  <AppText variant="caption" className="text-slate-500 text-center mt-1">
                    Unggah barang pertama Anda dan mulai barter sekarang!
                  </AppText>
                </View>
              ) : (
                myItems.map((item, index) => {
                  const imageUrl = item.primary_image
                    ? item.primary_image.startsWith('http')
                      ? item.primary_image
                      : `${API_BASE_URL.replace('/api', '')}/storage/${item.primary_image}`
                    : null;

                  const statusColor =
                    item.status === 'active'
                      ? 'text-brand-600'
                      : item.status === 'moderated'
                      ? 'text-red-500'
                      : item.status === 'traded'
                      ? 'text-blue-500'
                      : 'text-slate-400';

                  const statusLabel =
                    item.status === 'active'
                      ? 'Aktif'
                      : item.status === 'inactive'
                      ? 'Nonaktif'
                      : item.status === 'moderated'
                      ? 'Dimoderasi'
                      : 'Sudah Barter';

                  return (
                    <View
                      key={item.id}
                      className={`flex-row items-center px-4 py-3 gap-3 ${
                        index < myItems.length - 1
                          ? 'border-b border-slate-100 dark:border-slate-700/50'
                          : ''
                      }`}
                    >
                      {/* Thumbnail */}
                      {imageUrl ? (
                        <Image
                          source={{ uri: imageUrl }}
                          style={{ width: 56, height: 56, borderRadius: 10, backgroundColor: '#e2e8f0' }}
                          resizeMode="cover"
                        />
                      ) : (
                        <View
                          style={{ width: 56, height: 56, borderRadius: 10, backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Icon name="image-outline" size={24} color="#94a3b8" />
                        </View>
                      )}

                      {/* Info */}
                      <View className="flex-1 min-w-0">
                        <AppText
                          className="font-semibold text-slate-800 dark:text-slate-200 text-sm"
                          numberOfLines={1}
                        >
                          {item.title}
                        </AppText>
                        <AppText variant="caption" className={`${statusColor} font-medium mt-0.5`}>
                          {statusLabel}
                          {item.is_boosted ? ' · 🔥 Di-boost' : ''}
                        </AppText>
                        <AppText variant="caption" className="text-slate-400 mt-0.5" numberOfLines={1}>
                          {item.category?.name || '—'} · {item.condition === 'baru' ? 'Baru' : 'Bekas'}
                        </AppText>
                      </View>

                      {/* Action Buttons */}
                      <View className="flex-row gap-2">
                        <TouchableOpacity
                          onPress={() => router.push({ pathname: '/item/edit/[id]', params: { id: item.id } } as any)}
                          className="bg-brand-50 dark:bg-brand-900/30 border border-brand-200 dark:border-brand-700 px-3 py-1.5 rounded-lg"
                        >
                          <AppText className="text-xs font-bold text-brand-700 dark:text-brand-300">Edit</AppText>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleDeleteItem(item)}
                          className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-1.5 rounded-lg"
                        >
                          <AppText className="text-xs font-bold text-red-600 dark:text-red-400">Hapus</AppText>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          )}

          <TouchableOpacity
            onPress={openEditProfile}
            className="flex-row items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700"
          >
            <View className="flex-row items-center gap-3">
              <Icon name="person-circle-outline" size={20} color="#059669" />
              <AppText variant="body" className="font-medium text-slate-800 dark:text-slate-200">
                Edit Profil Pengguna
              </AppText>
            </View>
            <AppText className="text-slate-400">›</AppText>
          </TouchableOpacity>

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
              <AppText className="text-lg"><Icon name={'flash-outline'} size={24} color={'grey'}/></AppText>
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
              <AppText className="text-lg"><Icon name={'list'} size={24} color={'grey'}/></AppText>
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
              <AppText className="text-lg"><Icon name={'card-sharp'} size={24} color={'gray'}/></AppText>
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
              <AppText className="text-lg"><Icon name={'log-out-outline'} size={24} color={'red'}/></AppText>
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

      {/* Edit Profile Modal */}
      <Modal
        visible={editProfileVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditProfileVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-center items-center px-4 py-6">
          <View className="bg-white dark:bg-slate-800 w-full max-h-[88%] rounded-3xl p-6 shadow-xl">
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Header */}
              <View className="flex-row justify-between items-center mb-5 pb-3 border-b border-slate-100 dark:border-slate-700">
                <View>
                  <AppText variant="h3" className="font-bold text-slate-900 dark:text-white">
                    Edit Profil
                  </AppText>
                  <AppText variant="caption" className="text-slate-500 mt-0.5">
                    Perbarui informasi akun Anda
                  </AppText>
                </View>
                <TouchableOpacity
                  onPress={() => setEditProfileVisible(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 items-center justify-center"
                >
                  <AppText className="text-slate-500 font-bold text-sm">✕</AppText>
                </TouchableOpacity>
              </View>

              {/* Avatar Uploader */}
              <View className="items-center mb-6">
                <TouchableOpacity
                  onPress={pickAvatar}
                  activeOpacity={0.8}
                  className="relative"
                >
                  {newAvatarAsset ? (
                    <Image
                      source={{ uri: newAvatarAsset.uri }}
                      style={{ width: 88, height: 88, borderRadius: 22, backgroundColor: '#e2e8f0' }}
                      resizeMode="cover"
                    />
                  ) : (
                    <Avatar
                      name={editName || user?.name || 'User'}
                      url={user?.avatar_url || undefined}
                      size="lg"
                    />
                  )}
                  <View className="absolute -bottom-1 -right-1 bg-brand-600 rounded-full p-2 border-2 border-white dark:border-slate-800 shadow-sm">
                    <Icon name="camera" size={14} color="#ffffff" />
                  </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={pickAvatar} className="mt-2.5">
                  <AppText variant="caption" className="text-brand-600 font-semibold">
                    {newAvatarAsset ? 'Ganti Foto Terpilih' : 'Ubah Foto Profil'}
                  </AppText>
                </TouchableOpacity>
              </View>

              {/* Form Inputs */}
              <Input
                label="Nama Lengkap *"
                placeholder="Masukkan nama lengkap"
                value={editName}
                onChangeText={setEditName}
                maxLength={255}
                leftIcon={<Icon name="person-outline" size={18} color="#94a3b8" />}
              />

              {/* Email (Read Only) */}
              <View className="w-full mb-4">
                <AppText variant="label" className="mb-1 text-slate-700 dark:text-slate-300">
                  Email (Tidak dapat diubah)
                </AppText>
                <View className="flex-row items-center border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 bg-slate-100 dark:bg-slate-900/60">
                  <View className="mr-2">
                    <Icon name="mail-outline" size={18} color="#94a3b8" />
                  </View>
                  <AppText className="flex-1 text-slate-500 dark:text-slate-400">
                    {user?.email || '-'}
                  </AppText>
                  <Icon name="lock-closed-outline" size={16} color="#94a3b8" />
                </View>
              </View>

              <Input
                label="Nomor Telepon / WhatsApp"
                placeholder="Contoh: 081234567890"
                value={editPhone}
                onChangeText={setEditPhone}
                keyboardType="phone-pad"
                maxLength={20}
                leftIcon={<Icon name="call-outline" size={18} color="#94a3b8" />}
              />

              <Input
                label="Kota Domisili"
                placeholder="Contoh: Jakarta Selatan"
                value={editCity}
                onChangeText={setEditCity}
                maxLength={100}
                leftIcon={<Icon name="location-outline" size={18} color="#94a3b8" />}
              />

              {/* Action Buttons */}
              <View className="flex-row gap-3 mt-4 mb-2">
                <View className="flex-1">
                  <Button
                    title="Batal"
                    variant="secondary"
                    onPress={() => setEditProfileVisible(false)}
                    disabled={updatingProfile}
                  />
                </View>
                <View className="flex-1">
                  <Button
                    title="Simpan"
                    variant="primary"
                    loading={updatingProfile}
                    onPress={handleUpdateProfile}
                  />
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </MainTemplate>
  );
}

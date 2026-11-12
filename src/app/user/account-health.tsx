import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  RefreshControl,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { AppText, Button, Badge, Icon } from '@/components/atoms';
import { useAuth } from '@/context/AuthContext';
import {
  accountHealthService,
  AccountHealthData,
  UserPenaltyItem,
} from '@/services/accountHealthService';

export default function AccountHealthScreen() {
  const router = useRouter();
  const { isAuthenticated, refreshUser } = useAuth();

  const [healthData, setHealthData] = useState<AccountHealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Banding Modal State
  const [appealModalVisible, setAppealModalVisible] = useState(false);
  const [selectedPenalty, setSelectedPenalty] = useState<UserPenaltyItem | null>(null);
  const [appealReason, setAppealReason] = useState('');
  const [evidenceAsset, setEvidenceAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [submittingAppeal, setSubmittingAppeal] = useState(false);

  const fetchHealthData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await accountHealthService.getAccountHealth();
      if (res.success && res.data) {
        setHealthData(res.data);
      } else {
        Alert.alert('Informasi', res.message || 'Gagal memuat kesehatan akun.');
      }
    } catch (e: any) {
      Alert.alert('Gagal Memuat', e.message || 'Terjadi kesalahan jaringan.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/(auth)/login');
      return;
    }
    fetchHealthData();
  }, [isAuthenticated]);

  const handleOpenAppeal = (penalty: UserPenaltyItem) => {
    setSelectedPenalty(penalty);
    setAppealReason('');
    setEvidenceAsset(null);
    setAppealModalVisible(true);
  };

  const pickEvidence = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Izin Ditolak', 'Aplikasi memerlukan izin galeri untuk melampirkan foto bukti.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'] as any,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setEvidenceAsset(result.assets[0]);
      }
    } catch (err: any) {
      Alert.alert('Gagal Memilih Foto', err.message || 'Terjadi kesalahan.');
    }
  };

  const handleSubmitAppeal = async () => {
    if (!selectedPenalty) return;

    if (!appealReason.trim() || appealReason.trim().length < 10) {
      Alert.alert('Alasan Kurang Lengkap', 'Mohon jelaskan alasan sanggahan Anda minimal 10 karakter.');
      return;
    }

    setSubmittingAppeal(true);
    try {
      const res = await accountHealthService.submitAppeal(
        selectedPenalty.id,
        appealReason.trim(),
        evidenceAsset
      );

      if (res.success) {
        Alert.alert(
          'Banding Terkirim',
          'Permohonan banding Anda berhasil diajukan. Tim Admin AdaBarter akan meninjau bukti Anda dalam 1-3 hari kerja.'
        );
        setAppealModalVisible(false);
        setSelectedPenalty(null);
        await fetchHealthData(true);
        await refreshUser();
      } else {
        Alert.alert('Gagal Mengajukan Banding', res.message || 'Terjadi kesalahan.');
      }
    } catch (e: any) {
      Alert.alert('Gagal', e.message || 'Gagal mengirim permohonan banding.');
    } finally {
      setSubmittingAppeal(false);
    }
  };

  const getRestrictionLabel = (restriction: string) => {
    switch (restriction) {
      case 'no_post':
        return 'Larangan Posting / Unggah Barang Baru';
      case 'no_offer':
        return 'Larangan Mengirimkan Tawaran Barter Baru';
      case 'no_direct_chat':
        return 'Larangan Obrolan Langsung (Tanya Barang Baru)';
      case 'no_boost':
        return 'De-ranking Feed & Larangan Beli Fitur Boost Listing';
      case 'hide_items':
        return 'Katalog Barang Disembunyikan Sementara dari Feed Publik';
      default:
        return restriction;
    }
  };

  const points = healthData?.penalty_points ?? 0;
  const status = healthData?.account_status ?? 'active';
  const tier = healthData?.restriction_tier ?? 0;

  const getHealthTheme = () => {
    if (status === 'banned' || tier === 4) {
      return {
        bg: 'bg-red-500',
        text: 'text-red-700',
        cardBg: 'bg-red-50 dark:bg-red-950/40',
        borderColor: 'border-red-200 dark:border-red-800',
        badgeBg: 'bg-red-100 text-red-800',
        title: 'Pemblokiran Permanen (Banned)',
        desc: 'Akun Anda telah dinonaktifkan karena pelanggaran aturan berat atau akumulasi 15+ poin.',
      };
    }
    if (status === 'restricted' || tier >= 1) {
      return {
        bg: 'bg-amber-500',
        text: 'text-amber-700',
        cardBg: 'bg-amber-50 dark:bg-amber-950/40',
        borderColor: 'border-amber-200 dark:border-amber-800',
        badgeBg: 'bg-amber-100 text-amber-800',
        title: healthData?.tier_name || 'Akun Dibatasi (Restricted)',
        desc: 'Beberapa fitur akun dibatasi selama masa sanksi. Anda tetap dapat menyelesaikan transaksi aktif.',
      };
    }
    if (points > 0) {
      return {
        bg: 'bg-yellow-500',
        text: 'text-yellow-700',
        cardBg: 'bg-yellow-50 dark:bg-yellow-950/40',
        borderColor: 'border-yellow-200 dark:border-yellow-800',
        badgeBg: 'bg-yellow-100 text-yellow-800',
        title: 'Peringatan Akun (Tier 0)',
        desc: 'Akun memiliki poin penalti namun belum ada pembatasan fitur. Pertahankan transaksi jujur.',
      };
    }
    return {
      bg: 'bg-emerald-600',
      text: 'text-emerald-700',
      cardBg: 'bg-emerald-50 dark:bg-emerald-950/40',
      borderColor: 'border-emerald-200 dark:border-emerald-800',
      badgeBg: 'bg-emerald-100 text-emerald-800',
      title: 'Kondisi Akun Sangat Baik',
      desc: 'Tidak ada poin penalti aktif. Anda memiliki akses penuh ke seluruh fitur AdaBarter.',
    };
  };

  const theme = getHealthTheme();

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-900" edges={['top']}>
      {/* Top Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
        <TouchableOpacity
          onPress={() => router.back()}
          className="p-2 -ml-2 rounded-full hover:bg-slate-100"
        >
          <Icon name="arrow-back" size={24} color="#334155" />
        </TouchableOpacity>
        <AppText variant="h3" className="font-bold text-slate-800 dark:text-slate-100">
          Kesehatan Akun
        </AppText>
        <View style={{ width: 32 }} />
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center p-6">
          <ActivityIndicator size="large" color="#059669" />
          <AppText variant="caption" className="text-slate-500 mt-3">
            Memuat status kesehatan akun...
          </AppText>
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-4 py-4"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchHealthData(true)} />
          }
        >
          {/* Main Health Card */}
          <View className={`${theme.cardBg} p-5 rounded-2xl border ${theme.borderColor} mb-4 shadow-sm`}>
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center gap-2">
                <Icon
                  name={points === 0 ? 'shield-checkmark' : 'shield-half'}
                  size={24}
                  color={points === 0 ? '#059669' : '#dc2626'}
                />
                <AppText className="font-bold text-base text-slate-900 dark:text-slate-100">
                  {theme.title}
                </AppText>
              </View>
              <View className="px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 shadow-xs border border-slate-200 dark:border-slate-700">
                <AppText className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {points} / 15 Poin
                </AppText>
              </View>
            </View>

            <AppText variant="body" className="text-xs text-slate-700 dark:text-slate-300 mb-4 leading-5">
              {theme.desc}
            </AppText>

            {/* Health Meter Bar */}
            <View className="h-2.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mb-2">
              <View
                className={`h-full ${points > 8 ? 'bg-red-500' : points > 2 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                style={{ width: `${Math.min((points / 15) * 100, 100)}%` }}
              />
            </View>
            <View className="flex-row justify-between">
              <AppText variant="caption" className="text-xs text-slate-500">
                0 Poin (Sehat)
              </AppText>
              <AppText variant="caption" className="text-xs text-slate-500">
                15 Poin (Banned)
              </AppText>
            </View>
          </View>

          {/* Active Restrictions Card (if any) */}
          {healthData && healthData.active_restrictions && healthData.active_restrictions.length > 0 && (
            <View className="bg-red-50 dark:bg-red-950/30 p-4 rounded-2xl border border-red-200 dark:border-red-900 mb-4">
              <View className="flex-row items-center gap-2 mb-2">
                <Icon name="warning" size={18} color="#dc2626" />
                <AppText className="font-bold text-sm text-red-900 dark:text-red-200">
                  Pembatasan Fitur Sedang Berlaku:
                </AppText>
              </View>

              <View className="space-y-1.5 pl-1 mb-3">
                {healthData.active_restrictions.map((r, idx) => (
                  <View key={idx} className="flex-row items-center gap-2">
                    <AppText className="text-red-600 font-bold">•</AppText>
                    <AppText variant="caption" className="text-red-800 dark:text-red-300 font-medium">
                      {getRestrictionLabel(r)}
                    </AppText>
                  </View>
                ))}
              </View>

              {healthData.restricted_until && (
                <View className="bg-white/80 dark:bg-slate-800/80 p-2.5 rounded-xl border border-red-100 dark:border-red-900/50 mb-2">
                  <AppText variant="caption" className="text-xs text-slate-600 dark:text-slate-300">
                    Sanksi berlaku hingga:{' '}
                    <AppText className="font-bold text-red-700">
                      {new Date(healthData.restricted_until).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </AppText>
                  </AppText>
                </View>
              )}

              <View className="bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800 flex-row items-start gap-2">
                <Icon name="information-circle" size={16} color="#059669" />
                <AppText variant="caption" className="text-xs text-emerald-800 dark:text-emerald-200 flex-1 leading-4">
                  <AppText className="font-bold text-xs text-emerald-900 dark:text-emerald-100">Jaminan Fair Play: </AppText>
                  Obrolan dan proses penyelesaian barter yang telah berstatus Matched atau Escrow tetap dapat diakses agar tidak merugikan mitra barter Anda.
                </AppText>
              </View>
            </View>
          )}

          {/* Section: Riwayat Poin & Sanksi */}
          <View className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 mb-4 shadow-sm">
            <View className="flex-row items-center justify-between mb-3">
              <AppText  className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Riwayat Sanksi Penalti
              </AppText>
              <AppText className="text-sm text-slate-500">
                Kedaluwarsa 90 hari
              </AppText>
            </View>

            {(!healthData || healthData.penalties.length === 0) ? (
              <View className="py-8 items-center justify-center">
                <Icon name="shield-checkmark-outline" size={48} color="#059669" />
                <AppText className="font-bold text-slate-800 dark:text-slate-200 text-sm mt-3">
                  Tidak Ada Sanksi
                </AppText>
                <AppText variant="caption" className="text-slate-500 text-center mt-1 px-6">
                  Akun Anda bersih dari sanksi. Terus jaga etika barter dan kepatuhan aturan komunitas AdaBarter.
                </AppText>
              </View>
            ) : (
              <View className="space-y-3">
                {healthData.penalties.map((item) => {
                  const isRevoked = item.status === 'revoked';
                  const isExpired = item.status === 'expired';

                  return (
                    <View
                      key={item.id}
                      className={`p-3.5 rounded-xl border ${
                        isRevoked
                          ? 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-60'
                          : 'bg-purple-50/40 dark:bg-purple-950/20 border-purple-100 dark:border-purple-900/40'
                      }`}
                    >
                      <View className="flex-row items-center justify-between mb-1.5">
                        <View className="flex-row items-center gap-2">
                          <View
                            className={`px-2 py-0.5 rounded-full ${
                              isRevoked || isExpired ? 'bg-slate-200' : 'bg-red-100'
                            }`}
                          >
                            <AppText
                              className={`text-xs font-bold ${
                                isRevoked || isExpired ? 'text-slate-600 line-through' : 'text-red-700'
                              }`}
                            >
                              +{item.points} Poin
                            </AppText>
                          </View>
                          <AppText className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            {item.category.replace(/_/g, ' ').toUpperCase()}
                          </AppText>
                        </View>

                        {/* Status Label */}
                        {isRevoked ? (
                          <Badge variant="success" text="Dicabut" />
                        ) : isExpired ? (
                          <Badge variant="neutral" text="Kedaluwarsa" />
                        ) : (
                          <Badge variant="error" text="Aktif" />
                        )}
                      </View>

                      <AppText variant="caption" className="text-slate-600 dark:text-slate-400 text-xs mb-2">
                        {item.reason}
                      </AppText>

                      <View className="flex-row items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-800">
                        <AppText variant="caption" className="text-xs text-slate-500">
                          {new Date(item.created_at).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </AppText>

                        {/* Appeal Actions / Status */}
                        {item.appeal_status === 'none' && item.can_appeal && !isRevoked && !isExpired && (
                          <TouchableOpacity
                            onPress={() => handleOpenAppeal(item)}
                            className="bg-purple-600 px-3 py-1 rounded-full shadow-xs"
                          >
                            <AppText className="text-xs font-bold text-white">
                              Ajukan Banding
                            </AppText>
                          </TouchableOpacity>
                        )}

                        {item.appeal_status === 'pending' && (
                          <View className="bg-amber-100 px-2.5 py-1 rounded-full">
                            <AppText className="text-xs font-bold text-amber-800">
                              Ditinjau
                            </AppText>
                          </View>
                        )}

                        {item.appeal_status === 'accepted' && (
                          <View className="bg-emerald-100 px-2.5 py-1 rounded-full">
                            <AppText className="text-xs font-bold text-emerald-800">
                              Banding Diterima
                            </AppText>
                          </View>
                        )}

                        {item.appeal_status === 'rejected' && (
                          <View className="bg-red-100 px-2.5 py-1 rounded-full">
                            <AppText className="text-xs font-bold text-red-800">
                              Ditolak
                            </AppText>
                          </View>
                        )}
                      </View>

                      {/* Admin Notes on Appeal if available */}
                      {item.appeal_admin_notes && (
                        <View className="mt-2 bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-100 dark:border-slate-700">
                          <AppText variant="caption" className="text-xs text-slate-500">
                            Catatan Admin: {item.appeal_admin_notes}
                          </AppText>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* Shopee-style Tier Knowledge Card */}
          <View className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 mb-8 shadow-sm">
            <AppText className="font-bold text-slate-900 dark:text-slate-100 mb-2">
              Tingkat Sanksi & Aturan Poin Penalti
            </AppText>
            <AppText  className="text-xs text-slate-500 mb-3 leading-4">
              AdaBarter menerapkan sistem penalti bertingkat agar ekosistem barter tetap aman, adil, dan transparan.
            </AppText>

            <View className="space-y-2 text-xs">
              <View className="p-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl">
                <AppText className="font-bold text-slate-800 dark:text-slate-200">
                  • 0 - 2 Poin (Tier 0)
                </AppText>
                <AppText className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  Peringatan tertulis tanpa pembatasan fitur transaksi.
                </AppText>
              </View>

              <View className="p-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl">
                <AppText className="font-bold text-amber-800 dark:text-amber-300">
                  • 3 - 5 Poin (Tier 1 - Pembatasan Ringan, 28 Hari)
                </AppText>
                <AppText variant="caption" className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  De-ranking feed pencarian, kupon promosi dinonaktifkan, dan larangan membeli iklan sorotan (Boost).
                </AppText>
              </View>

              <View className="p-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl">
                <AppText className="font-bold text-orange-800 dark:text-orange-300">
                  • 6 - 8 Poin (Tier 2 - Pembatasan Sedang, 28 Hari)
                </AppText>
                <AppText variant="caption" className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  Larangan mengunggah barang baru dan larangan mengirimkan tawaran barter baru.
                </AppText>
              </View>

              <View className="p-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl">
                <AppText className="font-bold text-red-800 dark:text-red-300">
                  • 9 - 14 Poin (Tier 3 - Pembatasan Berat, 28 Hari)
                </AppText>
                <AppText variant="caption" className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  Katalog barang disembunyikan dan larangan obrolan langsung baru. Transaksi yang sudah berjalan tetap dapat diselesaikan.
                </AppText>
              </View>

              <View className="p-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl">
                <AppText className="font-bold text-red-900 dark:text-red-400">
                  • 15+ Poin (Tier 4 - Pemblokiran Akun Permanen)
                </AppText>
                <AppText variant="caption" className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  Akun dinonaktifkan permanen, sesi login dicabut, dan barang dimoderasi.
                </AppText>
              </View>
            </View>
          </View>
        </ScrollView>
      )}

      {/* Modal Permohonan Banding */}
      <Modal
        visible={appealModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setAppealModalVisible(false)}
      >
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-white dark:bg-slate-800 rounded-t-3xl p-5 max-h-[85%]">
            <View className="flex-row items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700 mb-4">
              <AppText variant="h3" className="font-bold text-slate-800 dark:text-slate-100">
                Formulir Pengajuan Banding
              </AppText>
              <TouchableOpacity
                onPress={() => setAppealModalVisible(false)}
                className="p-1 rounded-full"
              >
                <Icon name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedPenalty && (
                <View className="bg-purple-50 dark:bg-purple-950/40 p-3 rounded-xl border border-purple-200 dark:border-purple-800 mb-4">
                  <AppText className="text-xs font-bold text-purple-900 dark:text-purple-200">
                    Sanksi: +{selectedPenalty.points} Poin ({selectedPenalty.category.replace(/_/g, ' ')})
                  </AppText>
                  <AppText variant="caption" className="text-purple-700 dark:text-purple-300 mt-1">
                    Alasan sanksi: {selectedPenalty.reason}
                  </AppText>
                </View>
              )}

              <AppText variant="body" className="font-bold text-xs text-slate-700 dark:text-slate-300 mb-1.5">
                Alasan Sanggahan Anda:
              </AppText>
              <TextInput
                value={appealReason}
                onChangeText={setAppealReason}
                placeholder="Jelaskan secara rinci mengapa sanksi ini keliru atau bukti yang Anda miliki..."
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={4}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-800 dark:text-slate-200 text-sm mb-4 min-h-[96px] text-top"
              />

              <AppText variant="body" className="font-bold text-xs text-slate-700 dark:text-slate-300 mb-1.5">
                Foto Bukti Pendukung (Opsional):
              </AppText>
              <TouchableOpacity
                onPress={pickEvidence}
                className="w-full border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-4 items-center justify-center mb-4 bg-slate-50 dark:bg-slate-900"
              >
                {evidenceAsset ? (
                  <View className="items-center">
                    <Image
                      source={{ uri: evidenceAsset.uri }}
                      className="w-32 h-32 rounded-lg mb-2"
                      resizeMode="cover"
                    />
                    <AppText variant="caption" className="text-purple-600 font-bold">
                      Ganti Foto Bukti
                    </AppText>
                  </View>
                ) : (
                  <View className="items-center">
                    <Icon name="camera-outline" size={32} color="#94a3b8" />
                    <AppText variant="caption" className="text-slate-500 mt-1">
                      Ketuk untuk memilih foto / tangkapan layar bukti
                    </AppText>
                  </View>
                )}
              </TouchableOpacity>

              <View className="bg-amber-50 dark:bg-amber-950/30 p-3 rounded-xl border border-amber-200 dark:border-amber-900 mb-4">
                <AppText variant="caption" className="text-[11px] text-amber-800 dark:text-amber-200 leading-4">
                  ⚠️ Banding hanya dapat diajukan 1 kali untuk setiap sanksi dalam batas waktu 7 hari setelah poin diberikan. Pastikan penjelasan Anda akurat.
                </AppText>
              </View>

              <View className="flex-row gap-3 pt-2">
                <View className="flex-1">
                  <Button
                    variant="secondary"
                    title="Batal"
                    onPress={() => setAppealModalVisible(false)}
                    disabled={submittingAppeal}
                  />
                </View>
                <View className="flex-1">
                  <Button
                    variant="primary"
                    title={submittingAppeal ? 'Mengirim...' : 'Kirim Banding'}
                    onPress={handleSubmitAppeal}
                    loading={submittingAppeal}
                    disabled={submittingAppeal}
                  />
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

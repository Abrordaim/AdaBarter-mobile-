import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText, Button, Icon } from '@/components/atoms';
import { voucherService, Voucher, VoucherClaimItem } from '@/services/voucherService';

// ── Helpers ──────────────────────────────────────────────────
function formatRp(val: number | null | undefined): string {
  if (!val) return 'Rp 0';
  return `Rp ${Number(val).toLocaleString('id-ID')}`;
}

function formatExpiry(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Tidak ada batas';
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Available Voucher Card ───────────────────────────────────
function AvailableVoucherCard({
  voucher,
  onClaim,
  claiming,
}: {
  voucher: Voucher;
  onClaim: (id: number) => void;
  claiming: boolean;
}) {
  const isClaimed = voucher.is_claimed;
  const isExpired = voucher.is_expired;
  const canClaim = !isClaimed && !isExpired;

  return (
    <View className="mb-3 mx-4">
      <View
        className={`bg-white dark:bg-slate-800  overflow-hidden border-l-2 border-dashed  ${voucher.type === 'percentage'
          ? 'border-blue-700'
          : 'border-emerald-700 dark:border-slate-700'
          } shadow-lg`}
      >
        <View className="flex-row">
          {/* Header */}
          <View className="flex-row items-start ">
            <View className={`h-24 w-24 flex-col gap-2 items-center justify-center ${voucher.type === 'percentage'
              ? 'bg-blue-700 '
              : 'bg-emerald-700 '
              }`}>
              <Icon name={'cash-outline'} size={30} color={'white'} />
              <AppText className="text-sm text-white font-medium">
                {voucher.type === 'percentage'
                  ? `Diskon ${voucher.percentage}%`
                  : 'Potongan'}
              </AppText>

            </View>
          </View>


          {/* Details row */}
          <View className="flex-col ml-2 mt-2">
            <View className='flex-row'>
              <AppText className="text-sm text-slate-900 font-medium">
                {voucher.type === 'percentage'
                  ? `Diskon ${voucher.percentage}% `
                  : 'Potongan'}
              </AppText>
              {voucher.max_discount_amount && voucher.type === 'percentage' && (
                <AppText className="text-sm text-slate-900 font-medium">
                  s.d {formatRp(voucher.max_discount_amount)}
                </AppText>
              )}

            </View>
            <View>
              <AppText className="text-xs text-slate-400 dark:text-slate-500 tracking-wider">
                Min. Transaksi {formatRp(voucher.min_transaction_amount)}
              </AppText>
            </View>
            <View className="items-start">
              <AppText className="text-xs text-slate-400 dark:text-slate-500 font-light  tracking-wider">
                Berlaku s/d : {formatExpiry(voucher.expired_at)}
              </AppText>

            </View>
          </View>

          {/* Claim button */}
          <TouchableOpacity
            onPress={() => onClaim(voucher.id)}
            disabled={!canClaim || claiming}
            className={`m-auto py-3 rounded-xl items-center h-10 min-w-20 ${canClaim ? 'bg-emerald-600 active:bg-emerald-700' : 'bg-slate-100 dark:bg-slate-700'
              }`}
          >
            {claiming ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <AppText
                className={`font-bold text-sm ${canClaim ? 'text-white' : 'text-slate-400 dark:text-slate-500'
                  }`}
              >
                {isClaimed ? 'Diklaim' : isExpired ? 'Kedaluwarsa' : 'Klaim'}
              </AppText>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ── My Voucher Card ──────────────────────────────────────────
function MyVoucherCard({ item }: { item: VoucherClaimItem }) {
  const isUsed = item.is_used;
  const v = item.voucher;

  return (
    <View className="mb-3 mx-4">
      <View
        className={`bg-white dark:bg-slate-800  overflow-hidden border-l-2 border-dashed  ${v.type === 'percentage'
          ? 'border-blue-700'
          : 'border-emerald-700 dark:border-slate-700'
          } shadow-lg`}
      >

        {/* <View className="p-4">
          <View className="flex-row items-center justify-between mb-1">
            <View className="flex-row items-center gap-2">
              <AppText className="text-lg font-extrabold text-slate-900 dark:text-white">
                {v.formatted_discount}
              </AppText>
            </View>
            <View
              className={`px-2.5 py-1 rounded-full ${isUsed
                ? 'bg-slate-100 dark:bg-slate-700'
                : 'bg-emerald-100 dark:bg-emerald-900/60'
                }`}
            >
              <AppText
                className={`text-xs font-bold ${isUsed ? 'text-slate-500' : 'text-emerald-700 dark:text-emerald-300'
                  }`}
              >
                {isUsed ? 'Sudah Dipakai' : '✦ Siap Pakai'}
              </AppText>
            </View>
          </View>

          <View className="flex-row items-center gap-2 mb-2">
            <View className="bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">
              <AppText className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300">
                {v.code}
              </AppText>
            </View>
            {v.distribution === 'private' && (
              <View className="bg-purple-100 dark:bg-purple-950 px-2 py-0.5 rounded">
                <AppText className="text-xs font-bold text-purple-700 dark:text-purple-300">
                  Privat
                </AppText>
              </View>
            )}
          </View>

          <View className="flex-row justify-between">
            <View>
              <AppText className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                Min. Transaksi
              </AppText>
              <AppText className="text-xs font-bold text-slate-600 dark:text-slate-300">
                {formatRp(v.min_transaction_amount)}
              </AppText>
            </View>
            <View className="items-end">
              <AppText className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                {isUsed ? 'Dipakai pada' : 'Berlaku s/d'}
              </AppText>
              <AppText className="text-xs font-bold text-slate-600 dark:text-slate-300">
                {isUsed ? formatExpiry(item.used_at) : formatExpiry(v.expired_at)}
              </AppText>
            </View>
          </View>
        </View> */}
        <View className="flex-row">
          {/* Header */}
          <View className="flex-row items-start ">
            <View className={`h-24 w-24 flex-col gap-2 items-center justify-center ${v.type === 'percentage'
              ? 'bg-blue-700 '
              : 'bg-emerald-700 '
              }`}>
              <Icon name={'cash-outline'} size={30} color={'white'} />
              <AppText className="text-sm text-white font-medium">
                {v.type === 'percentage'
                  ? `Diskon ${v.percentage}%`
                  : 'Potongan'}
              </AppText>

            </View>
          </View>


          {/* Details row */}
          <View className="flex-col ml-2 mt-2">
            <View className='flex-row'>
              <AppText className="text-sm text-slate-900 font-medium">
                {v.type === 'percentage'
                  ? `Diskon ${v.percentage}% `
                  : 'Potongan'}
              </AppText>
              {v.max_discount_amount && v.type === 'percentage' && (
                <AppText className="text-sm text-slate-900 font-medium">
                  s.d {formatRp(v.max_discount_amount)}
                </AppText>
              )}

            </View>
            <View>
              <AppText className="text-xs text-slate-400 dark:text-slate-500 tracking-wider">
                Min. Transaksi {formatRp(v.min_transaction_amount)}
              </AppText>
            </View>
            <View className="items-start">
              <AppText className="text-xs text-slate-400 dark:text-slate-500 font-light  tracking-wider">
                Berlaku s/d : {formatExpiry(v.expired_at)}
              </AppText>

            </View>
          </View>

          {/* Claim button */}
          <View
              className={` mx-auto mt-2 px-2.5 py-1 h-6 ${isUsed
                ? 'bg-slate-100 dark:bg-slate-700'
                : 'bg-emerald-100 dark:bg-emerald-900/60'
                }`}
            >
              <AppText
                className={`text-xs font-bold ${isUsed ? 'text-slate-500' : 'text-emerald-700 dark:text-emerald-300'
                  }`}
              >
                {isUsed ? 'Sudah Dipakai' : 'Siap Pakai'}
              </AppText>
            </View>
          
        </View>
      </View>
    </View>
  );
}

// ── Main Screen ──────────────────────────────────────────────
export default function VouchersScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(0);

  // Tab 0 state
  const [promoCode, setPromoCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [availableVouchers, setAvailableVouchers] = useState<Voucher[]>([]);
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [claimingId, setClaimingId] = useState<number | null>(null);

  // Tab 1 state
  const [activeVouchers, setActiveVouchers] = useState<VoucherClaimItem[]>([]);
  const [usedVouchers, setUsedVouchers] = useState<VoucherClaimItem[]>([]);
  const [loadingMy, setLoadingMy] = useState(false);
  const [refreshingMy, setRefreshingMy] = useState(false);

  const loadAvailableVouchers = useCallback(async () => {
    setLoadingAvailable(true);
    try {
      const data = await voucherService.getAvailableVouchers();
      setAvailableVouchers(data);
    } catch (e: any) {
      console.log('Failed to load available vouchers:', e.message);
    } finally {
      setLoadingAvailable(false);
    }
  }, []);

  const loadMyVouchers = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshingMy(true);
    else setLoadingMy(true);
    try {
      const [active, used] = await Promise.all([
        voucherService.getMyVouchers('active'),
        voucherService.getMyVouchers('used'),
      ]);
      setActiveVouchers(active);
      setUsedVouchers(used);
    } catch (e: any) {
      console.log('Failed to load my vouchers:', e.message);
    } finally {
      setLoadingMy(false);
      setRefreshingMy(false);
    }
  }, []);

  useEffect(() => {
    loadAvailableVouchers();
  }, []);

  useEffect(() => {
    if (activeTab === 1) loadMyVouchers();
  }, [activeTab]);

  const handleRedeemCode = async () => {
    const code = promoCode.trim().toUpperCase();
    if (!code) {
      Alert.alert('Perhatian', 'Harap masukkan kode promo terlebih dahulu.');
      return;
    }
    setRedeeming(true);
    try {
      const result = await voucherService.claimVoucher({ code });
      Alert.alert(
        'Klaim Berhasil! 🎉',
        `Voucher ${result.voucher.formatted_discount} berhasil ditambahkan ke dompet voucher Anda.`,
        [
          {
            text: 'Lihat Voucher Saya',
            onPress: () => {
              setPromoCode('');
              setActiveTab(1);
            },
          },
          { text: 'OK', onPress: () => setPromoCode('') },
        ]
      );
      loadAvailableVouchers();
    } catch (e: any) {
      const msg =
        e.errors?.code?.[0] || e.errors?.voucher_id?.[0] || e.message || 'Gagal mengklaim voucher.';
      Alert.alert('Klaim Gagal', msg);
    } finally {
      setRedeeming(false);
    }
  };

  const handleClaimById = async (voucherId: number) => {
    setClaimingId(voucherId);
    try {
      const result = await voucherService.claimVoucher({ voucher_id: voucherId });
      Alert.alert(
        'Berhasil Diklaim! 🎉',
        `Voucher ${result.voucher.formatted_discount} berhasil ditambahkan ke dompet Anda.`,
        [
          { text: 'Lihat Voucher Saya', onPress: () => setActiveTab(1) },
          { text: 'OK' },
        ]
      );
      setAvailableVouchers((prev) =>
        prev.map((v) => (v.id === voucherId ? { ...v, is_claimed: true } : v))
      );
    } catch (e: any) {
      const msg = e.errors?.voucher_id?.[0] || e.message || 'Gagal mengklaim voucher.';
      Alert.alert('Klaim Gagal', msg);
    } finally {
      setClaimingId(null);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
        <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
          <Icon name="arrow-back" size={22} color="#374151" />
        </TouchableOpacity>
        <View className="flex-1">
          <AppText className="text-lg font-extrabold text-slate-900 dark:text-white">
            Voucher & Promo Barter
          </AppText>
          <AppText className="text-xs text-slate-500 dark:text-slate-400">
            Hemat selisih pembayaran Rekening Bersama
          </AppText>
        </View>
      </View>

      {/* Segmented Tab */}
      <View className="flex-row mx-4 mt-4 mb-2 bg-slate-200 dark:bg-slate-700 rounded-xl p-1">
        {['Klaim Voucher', 'Voucher Saya'].map((label, idx) => (
          <TouchableOpacity
            key={idx}
            onPress={() => setActiveTab(idx)}
            className={`flex-1 py-2.5 rounded-lg items-center ${activeTab === idx ? 'bg-white dark:bg-slate-800 shadow-sm' : ''
              }`}
          >
            <AppText
              className={`text-sm font-bold ${activeTab === idx
                ? 'text-emerald-700 dark:text-emerald-400'
                : 'text-slate-500 dark:text-slate-400'
                }`}
            >
              {label}
            </AppText>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── TAB 0: Klaim Voucher ─────────────────────────── */}
      {activeTab === 0 && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
        >
          {/* Metode 1: Kode Promo */}
          <View className="mx-4 mt-3 mb-4 bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm">
            <View className="flex-row items-center gap-2 mb-3">
              <View className="flex-1">
                <AppText className="font-bold text-slate-900 dark:text-white text-sm">
                  Punya Kode Promo?
                </AppText>
                <AppText className="text-xs text-slate-500 dark:text-slate-400">
                  Masukkan kode rahasia dari admin atau program spesial
                </AppText>
              </View>
            </View>

            <View className="flex-row gap-2">
              <View className="flex-1 border border-slate-300 dark:border-slate-600 rounded-xl px-3 bg-slate-50 dark:bg-slate-900">
                <TextInput
                  placeholder="Contoh: HEMAT50K"
                  placeholderTextColor="#94a3b8"
                  autoCapitalize="characters"
                  value={promoCode}
                  onChangeText={setPromoCode}
                  onSubmitEditing={handleRedeemCode}
                  returnKeyType="done"
                  className="py-3 font-bold text-base text-slate-900 dark:text-white tracking-widest"
                />
              </View>
              <TouchableOpacity
                onPress={handleRedeemCode}
                disabled={redeeming || !promoCode.trim()}
                className={`px-4 rounded-xl items-center justify-center ${promoCode.trim() ? 'bg-emerald-600' : 'bg-slate-200 dark:bg-slate-700'
                  }`}
              >
                {redeeming ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <AppText
                    className={`font-bold text-sm ${promoCode.trim() ? 'text-white' : 'text-slate-400'
                      }`}
                  >
                    Tukarkan
                  </AppText>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Metode 2: Daftar publik */}
          {loadingAvailable ? (
            <View className="items-center py-10">
              <ActivityIndicator size="large" color="#059669" />
              <AppText className="text-slate-400 mt-3 text-sm">Memuat voucher tersedia…</AppText>
            </View>
          ) : availableVouchers.length === 0 ? (
            <View className="items-center py-12 px-8">
              <AppText className="font-bold text-slate-600 dark:text-slate-300 text-center">
                Belum ada voucher publik
              </AppText>
              <AppText className="text-slate-400 text-sm text-center mt-1">
                Pantau terus — admin mungkin akan merilis promo menarik!
              </AppText>
            </View>
          ) : (
            availableVouchers.map((v) => (
              <AvailableVoucherCard
                key={v.id}
                voucher={v}
                onClaim={handleClaimById}
                claiming={claimingId === v.id}
              />
            ))
          )}
        </ScrollView>
      )}

      {/* ── TAB 1: Voucher Saya ───────────────────────────── */}
      {activeTab === 1 && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshingMy}
              onRefresh={() => loadMyVouchers(true)}
              colors={['#059669']}
              tintColor="#059669"
            />
          }
        >
          {loadingMy ? (
            <View className="items-center py-14">
              <ActivityIndicator size="large" color="#059669" />
              <AppText className="text-slate-400 mt-3 text-sm">Memuat voucher Anda…</AppText>
            </View>
          ) : (
            <>
              <View className="mt-3 mb-2 px-4">
                <AppText className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                  Siap Dipakai ({activeVouchers.length})
                </AppText>
              </View>

              {activeVouchers.length === 0 ? (
                <View className="mx-4 bg-white dark:bg-slate-800 rounded-2xl p-6 items-center border border-slate-200 dark:border-slate-700 mb-4">
                  <AppText className="font-bold text-slate-600 dark:text-slate-300 text-center">
                    Belum ada voucher aktif
                  </AppText>
                  <AppText className="text-slate-400 text-xs text-center mt-1">
                    Klaim voucher dari tab sebelah untuk mendapatkan diskon
                  </AppText>
                  <TouchableOpacity
                    onPress={() => setActiveTab(0)}
                    className="mt-3 bg-emerald-600 px-4 py-2 rounded-lg"
                  >
                    <AppText className="text-white font-bold text-sm">Klaim Voucher</AppText>
                  </TouchableOpacity>
                </View>
              ) : (
                activeVouchers.map((item) => <MyVoucherCard key={item.claim_id} item={item} />)
              )}

              {usedVouchers.length > 0 && (
                <>
                  <View className="mt-4 mb-2 px-4">
                    <AppText className="text-xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      Sudah Dipakai ({usedVouchers.length})
                    </AppText>
                  </View>
                  {usedVouchers.map((item) => (
                    <MyVoucherCard key={item.claim_id} item={item} />
                  ))}
                </>
              )}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

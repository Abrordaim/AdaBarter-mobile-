import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText, Button, Badge, Icon } from '@/components/atoms';
import { useAuth } from '@/context/AuthContext';
import { itemService, BarterItem } from '@/services/itemService';
import { offerService } from '@/services/offerService';

// ─── helpers ──────────────────────────────────────────────────
function formatRp(value: number): string {
  return `Rp ${value.toLocaleString('id-ID')}`;
}

// ─── component ────────────────────────────────────────────────
export default function CreateOfferScreen() {
  const { target_item_id } = useLocalSearchParams<{ target_item_id: string }>();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  const [targetItem, setTargetItem] = useState<BarterItem | null>(null);
  const [myItems, setMyItems] = useState<BarterItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);

  // ── tukar-tambah states (read-only automatic calculation) ──
  const [cashPayer, setCashPayer] = useState<'offerer' | 'target_owner'>('offerer');
  const [autoCalcAvailable, setAutoCalcAvailable] = useState(false);
  const [autoCalcDiff, setAutoCalcDiff] = useState(0);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/(auth)/login');
      return;
    }
    loadData();
  }, [target_item_id, isAuthenticated]);

  const loadData = async () => {
    if (!target_item_id) return;
    setLoading(true);
    try {
      const [target, items] = await Promise.all([
        itemService.getItemDetail(parseInt(target_item_id, 10)),
        itemService.getMyItems(),
      ]);
      setTargetItem(target);
      const activeItems = items.filter((it) => it.status === 'active');
      setMyItems(activeItems);
      if (activeItems.length > 0) {
        setSelectedItemId(activeItems[0].id);
      }
    } catch (e: any) {
      Alert.alert('Gagal Memuat', e.message || 'Gagal memuat informasi barter.', [
        { text: 'Kembali', onPress: () => router.back() },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // ── Auto-calculate tukar tambah whenever item selection changes ──
  useEffect(() => {
    if (!targetItem) return;
    const myPrice = myItems.find((it) => it.id === selectedItemId)?.estimated_price
      ? Number(myItems.find((it) => it.id === selectedItemId)!.estimated_price)
      : null;
    const theirPrice = targetItem.estimated_price ? Number(targetItem.estimated_price) : null;

    if (!myPrice || !theirPrice) {
      setAutoCalcAvailable(false);
      setCashPayer('offerer');
      setAutoCalcDiff(0);
      return;
    }

    setAutoCalcAvailable(true);
    const diff = theirPrice - myPrice;

    if (Math.abs(diff) === 0) {
      setCashPayer('offerer');
      setAutoCalcDiff(0);
    } else if (diff > 0) {
      // Target is more expensive → offerer pays the difference
      setCashPayer('offerer');
      setAutoCalcDiff(diff);
    } else {
      // My item is more expensive → target owner pays the difference
      setCashPayer('target_owner');
      setAutoCalcDiff(Math.abs(diff));
    }
  }, [selectedItemId, targetItem, myItems]);

  const handleSubmit = async () => {
    if (!targetItem || !selectedItemId) {
      Alert.alert('Perhatian', 'Pilih salah satu barang milik Anda untuk ditukarkan.');
      return;
    }

    const hasCashSupplement = autoCalcAvailable && autoCalcDiff > 0;

    setSubmitting(true);
    try {
      await offerService.createOffer({
        offerer_item_id: selectedItemId,
        target_item_id: targetItem.id,
        cash_supplement: hasCashSupplement ? autoCalcDiff : undefined,
        cash_supplement_by: hasCashSupplement ? cashPayer : undefined,
      });

      Alert.alert(
        'Tawaran Terkirim! ',
        'Tawaran barter berhasil dikirimkan kepada pemilik barang. Anda dapat memantau status persetujuan di tab Tukaranku.',
        [{ text: 'Buka Tukaranku', onPress: () => router.replace('/(tabs)/tukaranku') }]
      );
    } catch (e: any) {
      const msg = e.errors?.target_item_id?.[0] || e.message || 'Gagal mengajukan barter.';
      Alert.alert('Pengajuan Barter Gagal', msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white dark:bg-slate-900 justify-center items-center">
        <ActivityIndicator size="large" color="#059669" />
        <AppText variant="caption" className="text-slate-500 mt-3">
          Menyiapkan formulir barter...
        </AppText>
      </SafeAreaView>
    );
  }

  if (!targetItem) return null;

  const selectedItem = myItems.find((it) => it.id === selectedItemId) ?? null;
  const myPrice   = selectedItem?.estimated_price ? Number(selectedItem.estimated_price) : null;
  const theirPrice = targetItem.estimated_price   ? Number(targetItem.estimated_price)   : null;
  const maxPrice   = myPrice && theirPrice ? Math.max(myPrice, theirPrice) : 1;

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-900" edges={['top']}>
      {/* Top Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center"
        >
          <AppText className="text-xl font-bold">‹</AppText>
        </TouchableOpacity>
        <AppText variant="h3" className="font-bold text-slate-800 dark:text-white">
          Ajukan Barter Barang
        </AppText>
        <View className="w-10" />
      </View>

      <ScrollView className="flex-1 px-4 py-4" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Step 1: Target Item Summary */}
        <View className="mb-4">
          <AppText variant="caption" className="text-slate-500 font-bold uppercase tracking-wider mb-2">
            1. Barang yang Anda Inginkan
          </AppText>
          <View className="bg-white dark:bg-slate-800 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 flex-row gap-3 items-center">
            <View className="w-20 h-20 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-700">
              {targetItem.primary_image || targetItem.images?.[0] ? (
                <Image
                  source={{ uri: targetItem.primary_image || targetItem.images[0] }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              ) : (
                <View className="flex-1 items-center justify-center">
                  <AppText className="text-2xl">📦</AppText>
                </View>
              )}
            </View>
            <View className="flex-1">
              <AppText variant="label" className="font-bold text-slate-900 dark:text-white" numberOfLines={2}>
                {targetItem.title}
              </AppText>
              <AppText variant="caption" className="text-brand-600 font-semibold mt-0.5">
                {targetItem.estimated_price
                  ? `Est. Rp ${Number(targetItem.estimated_price).toLocaleString('id-ID')}`
                  : 'Nilai Fleksibel'}
              </AppText>
              <AppText variant="caption" className="text-slate-500 mt-1">
                Pemilik: {targetItem.user?.name || 'User'} ({targetItem.city || 'Indonesia'})
              </AppText>
            </View>
          </View>
        </View>

        {/* Step 2: Choose Your Item to Trade */}
        <View className="mb-5">
          <View className=" mb-2">
            <AppText variant="caption" className="text-slate-500 font-bold uppercase tracking-wider">
              2. Pilih Barang Anda untuk Ditukar *
            </AppText>
            
          </View>

          {myItems.length === 0 ? (
            <View className="bg-amber-50 dark:bg-amber-950/40 p-4 rounded-2xl border border-amber-200 dark:border-amber-800 items-center">
              <AppText className="text-3xl mb-2">📦</AppText>
              <AppText variant="label" className="font-bold text-amber-900 dark:text-amber-200 text-center mb-1">
                Anda Belum Memiliki Barang Barter Aktif
              </AppText>
              <AppText variant="caption" className="text-amber-800 dark:text-amber-300 text-center mb-4">
                Untuk mengajukan barter, Anda harus mengunggah setidaknya 1 barang milik Anda ke etalase.
              </AppText>
              <Button
                title="Upload Barang Sekarang"
                variant="primary"
                onPress={() => router.push('/(tabs)/add-item')}
              />
            </View>
          ) : (
            <View className="gap-2.5">
              {myItems.map((item) => {
                const isSelected = selectedItemId === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => setSelectedItemId(item.id)}
                    className={`p-3 rounded-2xl border flex-row items-center gap-3 ${
                      isSelected
                        ? 'bg-emerald-50 dark:bg-emerald-950 border-brand-600'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <View className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-700">
                      {item.primary_image || item.images?.[0] ? (
                        <Image
                          source={{ uri: item.primary_image || item.images[0] }}
                          className="w-full h-full"
                          resizeMode="cover"
                        />
                      ) : (
                        <View className="flex-1 items-center justify-center">
                          <AppText className="text-xl">📦</AppText>
                        </View>
                      )}
                    </View>

                    <View className="flex-1">
                      <AppText variant="label" className={`font-bold ${isSelected ? 'text-brand-900 dark:text-emerald-100' : 'text-slate-900 dark:text-white'}`} numberOfLines={1}>
                        {item.title}
                      </AppText>
                      <AppText variant="caption" className="text-slate-500 mt-0.5">
                        {item.estimated_price
                          ? `Est. Rp ${Number(item.estimated_price).toLocaleString('id-ID')}`
                          : 'Nilai Fleksibel'} • {item.condition}
                      </AppText>
                    </View>

                    <View
                      style={{
                        width: 22, height: 22, borderRadius: 11, borderWidth: 2,
                        alignItems: 'center', justifyContent: 'center',
                        borderColor: isSelected ? '#059669' : '#cbd5e1',
                        backgroundColor: isSelected ? '#059669' : 'transparent',
                      }}
                    >
                      {isSelected && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#fff' }} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
            
          )}
          <TouchableOpacity onPress={() => router.push('/(tabs)/add-item')}>
              <AppText className=" bg-green-600 text-white w-32 text-sm font-bold px-2 py-1 mt-2 rounded-lg">
                + Upload Barang
              </AppText>
            </TouchableOpacity>
        </View>

        {/* ── Step 3: Kalkulasi Tukar Tambah ─────────────────── */}
        {selectedItem && (
          <View style={{ marginBottom: 20 }}>
            <AppText variant="caption" className="text-slate-500 font-bold uppercase tracking-wider mb-2">
              3. Kalkulasi Tukar Tambah
            </AppText>

            {/* Combined Single Card: Perbandingan Estimasi & Info Tukar Tambah */}
            <View style={{ backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0', padding: 16 }}>
              <AppText style={{ textAlign: 'center', fontSize: 11, fontWeight: '700', color: '#64748b', marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Perbandingan Estimasi Harga
              </AppText>

              {autoCalcAvailable && myPrice && theirPrice ? (
                <>
                  {/* Price bar comparison */}
                  <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                    {/* My item */}
                    <View style={{ flex: 1, alignItems: 'center' }}>
                      <AppText style={{ fontSize: 11, fontWeight: '700', color: '#059669', marginBottom: 4 }}>Barang Anda</AppText>
                      <AppText style={{ fontSize: 13, fontWeight: '800', color: '#059669', marginBottom: 6 }}>{formatRp(myPrice)}</AppText>
                      <View style={{ width: '100%', height: 8, backgroundColor: '#f1f5f9', borderRadius: 4 }}>
                        <View style={{ height: 8, borderRadius: 4, backgroundColor: '#059669', width: `${(myPrice / maxPrice) * 100}%` }} />
                      </View>
                    </View>
                    {/* Divider */}
                    <View style={{ width: 1, backgroundColor: '#e2e8f0', marginVertical: 4 }} />
                    {/* Target item */}
                    <View style={{ flex: 1, alignItems: 'center' }}>
                      <AppText style={{ fontSize: 11, fontWeight: '700', color: '#2563eb', marginBottom: 4 }}>Barang Target</AppText>
                      <AppText style={{ fontSize: 13, fontWeight: '800', color: '#2563eb', marginBottom: 6 }}>{formatRp(theirPrice)}</AppText>
                      <View style={{ width: '100%', height: 8, backgroundColor: '#f1f5f9', borderRadius: 4 }}>
                        <View style={{ height: 8, borderRadius: 4, backgroundColor: '#2563eb', width: `${(theirPrice / maxPrice) * 100}%` }} />
                      </View>
                    </View>
                  </View>

                  {/* Section Divider inside the same card */}
                  <View style={{ height: 1, backgroundColor: '#f1f5f9', marginBottom: 14 }} />

                  {/* Tukar Tambah Calculation Result */}
                  {autoCalcDiff === 0 ? (
                    <View style={{ backgroundColor: '#f0fdf4', borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#bbf7d0' }}>
                      <AppText style={{ fontSize: 13, fontWeight: '700', color: '#15803d' }}>✅ Nilai Kedua Barang Setara</AppText>
                      <AppText style={{ fontSize: 12, color: '#166534', marginTop: 2, textAlign: 'center' }}>
                        Tidak diperlukan uang tambahan. Barter murni sepadan nilainya.
                      </AppText>
                    </View>
                  ) : (
                    <View style={{
                      backgroundColor: cashPayer === 'offerer' ? '#fefce8' : '#eff6ff',
                      borderRadius: 14, padding: 14, borderWidth: 1,
                      borderColor: cashPayer === 'offerer' ? '#fef08a' : '#bfdbfe',
                    }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          {/* <AppText style={{ fontSize: 16 }}>{cashPayer === 'offerer' ? '💰' : '🤝'}</AppText> */}
                          <AppText style={{ fontSize: 12, fontWeight: '700', color: cashPayer === 'offerer' ? '#854d0e' : '#1e40af', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            Uang Tambahan (Tukar Tambah)
                          </AppText>
                        </View>
                        <View style={{
                          backgroundColor: cashPayer === 'offerer' ? '#fef08a' : '#dbeafe',
                          paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8
                        }}>
                          {/* <AppText style={{ fontSize: 11, fontWeight: '700', color: cashPayer === 'offerer' ? '#713f12' : '#1e40af' }}>
                            Selisih Otomatis
                          </AppText> */}
                        </View>
                      </View>

                      {/* Read-only Nominal Display */}
                      <View style={{ marginVertical: 4 }}>
                        <AppText style={{ fontSize: 11, color: '#64748b', fontWeight: '500' }}>
                          Nominal Tambahan:
                        </AppText>
                        <AppText style={{ fontSize: 20, fontWeight: '800', color: cashPayer === 'offerer' ? '#b45309' : '#1d4ed8', marginTop: 2 }}>
                          {formatRp(autoCalcDiff)}
                        </AppText>
                      </View>

                      {/* Single payer indicator (read-only info, no selection) */}
                      <View style={{
                        backgroundColor: '#fff', borderRadius: 10, padding: 10, marginTop: 6,
                        borderWidth: 1, borderColor: cashPayer === 'offerer' ? '#fde047' : '#bfdbfe'
                      }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Icon
                            name={cashPayer === 'offerer' ? "arrow-forward-circle" : "arrow-back-circle"}
                            size={16}
                            color={cashPayer === 'offerer' ? "#b45309" : "#1d4ed8"}
                          />
                          <AppText style={{ fontSize: 13, fontWeight: '700', color: cashPayer === 'offerer' ? '#92400e' : '#1e40af', flex: 1 }}>
                            {cashPayer === 'offerer'
                              ? 'Anda yang menambahkan uang ke pemilik barang target'
                              : 'Pemilik barang target yang menambahkan uang ke Anda'}
                          </AppText>
                        </View>
                        <AppText style={{ fontSize: 11, color: '#64748b', marginTop: 4, lineHeight: 16 }}>
                          {cashPayer === 'offerer'
                            ? `Barang target bernilai lebih tinggi (${formatRp(theirPrice)} vs ${formatRp(myPrice)}). Anda menanggung selisih senilai ${formatRp(autoCalcDiff)}.`
                            : `Barang Anda bernilai lebih tinggi (${formatRp(myPrice)} vs ${formatRp(theirPrice)}). Pemilik barang target akan menanggung selisih senilai ${formatRp(autoCalcDiff)}.`}
                        </AppText>
                      </View>
                    </View>
                  )}
                </>
              ) : (
                <View style={{ backgroundColor: '#f8fafc', borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' }}>
                  <Icon name="information-circle-outline" size={24} color="#94a3b8" />
                  <AppText style={{ fontSize: 12, color: '#64748b', textAlign: 'center', marginTop: 6, lineHeight: 18 }}>
                    Salah satu atau kedua barang belum memiliki estimasi harga.{'\n'}Transaksi diajukan sebagai barter langsung tanpa uang tambahan.
                  </AppText>
                </View>
              )}
            </View>
          </View>
        )}

        {/* ── Step 4: Transaction Summary ──────────────────────── */}
        {selectedItem && (
          <View style={{ backgroundColor: '#f8fafc', borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0', padding: 16, marginBottom: 24 }}>
            <AppText style={{ textAlign: 'center', fontSize: 11, fontWeight: '700', color: '#64748b', marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Ringkasan Proposal Barter
            </AppText>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {/* My item thumbnail */}
              <View style={{ flex: 1, alignItems: 'center' }}>
                <View style={{ width: 60, height: 60, borderRadius: 12, overflow: 'hidden', backgroundColor: '#e2e8f0', marginBottom: 6 }}>
                  {selectedItem.primary_image || selectedItem.images?.[0] ? (
                    <Image source={{ uri: selectedItem.primary_image || selectedItem.images[0] }} style={{ width: 60, height: 60 }} resizeMode="cover" />
                  ) : (
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                      <AppText style={{ fontSize: 24 }}>📦</AppText>
                    </View>
                  )}
                </View>
                <AppText style={{ fontSize: 11, fontWeight: '700', color: '#059669', textAlign: 'center' }} numberOfLines={2}>{selectedItem.title}</AppText>
                <AppText style={{ fontSize: 11, color: myPrice ? '#059669' : '#94a3b8', marginTop: 2 }}>
                  {myPrice ? formatRp(myPrice) : 'Nilai Fleksibel'}
                </AppText>
              </View>

              {/* Center: arrow + cash badge */}
              <View style={{ alignItems: 'center' }}>
                <AppText style={{ fontSize: 24, color: '#059669', fontWeight: '700' }}>⇄</AppText>
                {autoCalcAvailable && autoCalcDiff > 0 ? (
                  <View style={{ backgroundColor: '#fef3c7', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 4, marginTop: 4, borderWidth: 1, borderColor: '#fde68a', alignItems: 'center' }}>
                    <AppText style={{ fontSize: 10, fontWeight: '800', color: '#92400e' }}>+{formatRp(autoCalcDiff)}</AppText>
                    <AppText style={{ fontSize: 9, color: '#78350f' }}>{cashPayer === 'offerer' ? 'dari Anda' : 'dari Pemilik'}</AppText>
                  </View>
                ) : (autoCalcDiff === 0 && autoCalcAvailable) ? (
                  <View style={{ backgroundColor: '#f0fdf4', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 4, marginTop: 4, borderWidth: 1, borderColor: '#bbf7d0' }}>
                    <AppText style={{ fontSize: 9, fontWeight: '800', color: '#15803d', textAlign: 'center' }}>Setara ✓</AppText>
                  </View>
                ) : null}
              </View>

              {/* Target item thumbnail */}
              <View style={{ flex: 1, alignItems: 'center' }}>
                <View style={{ width: 60, height: 60, borderRadius: 12, overflow: 'hidden', backgroundColor: '#e2e8f0', marginBottom: 6 }}>
                  {targetItem.primary_image || targetItem.images?.[0] ? (
                    <Image source={{ uri: targetItem.primary_image || targetItem.images[0] }} style={{ width: 60, height: 60 }} resizeMode="cover" />
                  ) : (
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                      <AppText style={{ fontSize: 24 }}>📦</AppText>
                    </View>
                  )}
                </View>
                <AppText style={{ fontSize: 11, fontWeight: '700', color: '#2563eb', textAlign: 'center' }} numberOfLines={2}>{targetItem.title}</AppText>
                <AppText style={{ fontSize: 11, color: theirPrice ? '#2563eb' : '#94a3b8', marginTop: 2 }}>
                  {theirPrice ? formatRp(theirPrice) : 'Nilai Fleksibel'}
                </AppText>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Floating Bottom Action Bar */}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(255,255,255,0.97)', borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24 }}>
        <Button
          title="Kirim Tawaran Barter Sekarang"
          variant="primary"
          size="lg"
          loading={submitting}
          disabled={!selectedItemId || myItems.length === 0}
          onPress={handleSubmit}
        />
      </View>
    </SafeAreaView>
  );
}


import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, Image, Alert, ActivityIndicator, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText, Button, Badge } from '@/components/atoms';
import { useAuth } from '@/context/AuthContext';
import { itemService, BarterItem } from '@/services/itemService';
import { offerService } from '@/services/offerService';

export default function CreateOfferScreen() {
  const { target_item_id } = useLocalSearchParams<{ target_item_id: string }>();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  const [targetItem, setTargetItem] = useState<BarterItem | null>(null);
  const [myItems, setMyItems] = useState<BarterItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);

  // Cash Supplement (Tukar Tambah) states
  const [includeCash, setIncludeCash] = useState(false);
  const [cashAmount, setCashAmount] = useState('');
  const [cashPayer, setCashPayer] = useState<'offerer' | 'target_owner'>('offerer');

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

  const handleSubmit = async () => {
    if (!targetItem || !selectedItemId) {
      Alert.alert('Perhatian', 'Pilih salah satu barang milik Anda untuk ditukarkan.');
      return;
    }

    let parsedCash: number | undefined = undefined;
    if (includeCash) {
      const cleanCash = cashAmount.replace(/[^0-9]/g, '');
      if (!cleanCash || parseInt(cleanCash, 10) <= 0) {
        Alert.alert('Perhatian', 'Masukkan nominal uang tambahan yang valid.');
        return;
      }
      parsedCash = parseInt(cleanCash, 10);
    }

    setSubmitting(true);
    try {
      await offerService.createOffer({
        offerer_item_id: selectedItemId,
        target_item_id: targetItem.id,
        cash_supplement: parsedCash,
        cash_supplement_by: includeCash ? cashPayer : undefined,
      });

      Alert.alert(
        'Tawaran Terkirim! 🎉',
        'Tawaran barter berhasil dikirimkan kepada pemilik barang. Anda dapat memantau status persetujuan di tab Tukaranku.',
        [
          {
            text: 'Buka Tukaranku',
            onPress: () => router.replace('/(tabs)/tukaranku'),
          },
        ]
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

  const selectedItem = myItems.find((it) => it.id === selectedItemId);

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
                Pemilik: {targetItem.user?.name || 'User'} (📍 {targetItem.city || 'Indonesia'})
              </AppText>
            </View>
          </View>
        </View>

        {/* Step 2: Choose Your Item to Trade */}
        <View className="mb-5">
          <View className="flex-row justify-between items-center mb-2">
            <AppText variant="caption" className="text-slate-500 font-bold uppercase tracking-wider">
              2. Pilih Barang Anda untuk Ditukar *
            </AppText>
            <TouchableOpacity onPress={() => router.push('/(tabs)/add-item')}>
              <AppText variant="caption" className="text-brand-600 font-bold">
                + Upload Barang Baru
              </AppText>
            </TouchableOpacity>
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
                        ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-brand-600 shadow-sm'
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
                      className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                        isSelected ? 'border-brand-600 bg-brand-600' : 'border-slate-300'
                      }`}
                    >
                      {isSelected && <View className="w-2.5 h-2.5 rounded-full bg-white" />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Step 3: Tukar Tambah (Cash Supplement) Feature */}
        <View className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 mb-5">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-2">
              <View className="flex-row items-center gap-1.5">
                <AppText className="text-lg">💵</AppText>
                <AppText variant="label" className="font-bold text-slate-900 dark:text-white">
                  Opsi Tukar Tambah (Uang Tambahan)
                </AppText>
              </View>
              <AppText variant="caption" className="text-slate-500 mt-0.5">
                Sertakan uang tunai jika ada selisih nilai antara kedua barang.
              </AppText>
            </View>

            <TouchableOpacity
              onPress={() => setIncludeCash(!includeCash)}
              className={`w-12 h-6 rounded-full p-0.5 transition-colors ${
                includeCash ? 'bg-brand-600' : 'bg-slate-300 dark:bg-slate-600'
              }`}
            >
              <View
                className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                  includeCash ? 'ml-6' : 'ml-0'
                }`}
              />
            </TouchableOpacity>
          </View>

          {includeCash && (
            <View className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
              <AppText variant="caption" className="text-slate-700 dark:text-slate-300 font-semibold mb-1">
                Nominal Uang Tambahan (Rp) *
              </AppText>
              <TextInput
                placeholder="Contoh: 150000"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
                value={cashAmount}
                onChangeText={setCashAmount}
                className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-2.5 text-base font-bold text-slate-900 dark:text-white mb-3"
              />

              <AppText variant="caption" className="text-slate-700 dark:text-slate-300 font-semibold mb-2">
                Siapa yang membayar uang tambahan?
              </AppText>
              <View className="gap-2">
                <TouchableOpacity
                  onPress={() => setCashPayer('offerer')}
                  className={`p-3 rounded-xl border flex-row items-center justify-between ${
                    cashPayer === 'offerer'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-brand-600'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <AppText className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    🙋 Saya yang menambah uang ke pemilik
                  </AppText>
                  <View
                    className={`w-4 h-4 rounded-full border ${
                      cashPayer === 'offerer' ? 'border-brand-600 bg-brand-600' : 'border-slate-400'
                    }`}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setCashPayer('target_owner')}
                  className={`p-3 rounded-xl border flex-row items-center justify-between ${
                    cashPayer === 'target_owner'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-brand-600'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <AppText className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    🤝 Pemilik barang target yang menambah uang ke saya
                  </AppText>
                  <View
                    className={`w-4 h-4 rounded-full border ${
                      cashPayer === 'target_owner' ? 'border-brand-600 bg-brand-600' : 'border-slate-400'
                    }`}
                  />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Step 4: Proposal Summary Comparison */}
        {selectedItem && (
          <View className="bg-slate-100 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 mb-6">
            <AppText variant="caption" className="text-slate-500 font-bold uppercase tracking-wider mb-2 text-center">
              Ringkasan Transaksi Barter
            </AppText>
            <View className="flex-row items-center justify-between">
              <View className="items-center flex-1">
                <AppText variant="caption" className="text-brand-600 font-bold mb-1">
                  Barang Anda
                </AppText>
                <AppText className="text-xs font-semibold text-center text-slate-800 dark:text-slate-200" numberOfLines={2}>
                  {selectedItem.title}
                </AppText>
              </View>

              <View className="px-3 items-center">
                <AppText className="text-2xl font-bold text-brand-600">⇄</AppText>
                {includeCash && cashAmount && (
                  <View className="bg-amber-100 dark:bg-amber-950 px-2 py-0.5 rounded-full mt-1">
                    <AppText className="text-[10px] text-amber-800 dark:text-amber-200 font-bold">
                      +Rp {parseInt(cashAmount.replace(/[^0-9]/g, '') || '0', 10).toLocaleString('id-ID')}
                    </AppText>
                  </View>
                )}
              </View>

              <View className="items-center flex-1">
                <AppText variant="caption" className="text-blue-600 font-bold mb-1">
                  Barang Target
                </AppText>
                <AppText className="text-xs font-semibold text-center text-slate-800 dark:text-slate-200" numberOfLines={2}>
                  {targetItem.title}
                </AppText>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Floating Bottom Action Bar */}
      <View className="absolute bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 border-t border-slate-200 dark:border-slate-800 px-5 py-3 shadow-lg">
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

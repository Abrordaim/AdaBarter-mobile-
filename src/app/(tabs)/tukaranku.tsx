import React, { useState, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { MainTemplate } from '@/components/templates';
import { AppText, Button, Badge, Avatar, Icon } from '@/components/atoms';
import { useAuth } from '@/context/AuthContext';
import { offerService, BarterOffer } from '@/services/offerService';

export default function TukarankuScreen() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [offers, setOffers] = useState<BarterOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOffers = async (isRefresh = false) => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await offerService.getOffers(activeTab, selectedStatus || undefined);
      setOffers(data || []);
    } catch (e: any) {
      console.log('Error fetching offers:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchOffers();
    }, [activeTab, selectedStatus, isAuthenticated])
  );

  const getStatusBadge = (status: string, hasRated?: boolean) => {
    switch (status) {
      case 'matched':
        return <Badge variant="success" text="Matched" />;
      case 'completed':
        return hasRated ? (
          <Badge variant="success" text="Selesai ⭐" />
        ) : (
          <Badge variant="info" text="Selesai COD" />
        );
      case 'rejected':
        return <Badge variant="error" text="Ditolak" />;
      case 'cancelled':
        return <Badge variant="neutral" text="Dibatalkan" />;
      case 'pending':
      default:
        return <Badge variant="warning" text="Menunggu" />;
    }
  };

  if (!isAuthenticated) {
    return (
      <MainTemplate title="Tukaranku">
        <View className="px-6 py-16 items-center justify-center">
          <View className="w-20 h-20 bg-brand-100 dark:bg-brand-900/30 rounded-full items-center justify-center mb-6">
            <Icon name={'repeat'} size={26} color={'green'} />
          </View>
          <AppText variant="h2" className="text-center font-bold mb-2 text-slate-800 dark:text-white">
            Kelola Transaksi Barter
          </AppText>
          <AppText variant="body" className="text-center text-slate-600 dark:text-slate-400 mb-8 px-4">
            Masuk ke akun Anda untuk meninjau tawaran masuk, memantau tawaran barter yang Anda ajukan, dan membuka chat negosiasi.
          </AppText>
          <Button
            title="Masuk ke Akun"
            variant="primary"
            size="lg"
            onPress={() => router.push('/(auth)/login')}
          />
        </View>
      </MainTemplate>
    );
  }

  const STATUS_FILTERS = [
    { id: null, label: 'Semua' },
    { id: 'pending', label: 'Menunggu' },
    { id: 'matched', label: 'Matched' },
    { id: 'completed', label: 'Selesai' },
    { id: 'rejected', label: 'Ditolak' },
  ];

  return (
    <MainTemplate title="Tukaranku" onRefresh={() => fetchOffers(true)} refreshing={refreshing}>
      {/* Tab Selector: Masuk vs Terkirim */}
      <View className="px-4 pt-3 pb-2 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
        <View className="flex-row bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <TouchableOpacity
            onPress={() => {
              setActiveTab('received');
              setSelectedStatus(null);
            }}
            className={`flex-1 py-2.5 rounded-lg items-center ${
              activeTab === 'received' ? 'bg-white dark:bg-slate-700 shadow-sm' : ''
            }`}
          >
            <AppText
              className={`text-sm font-bold ${
                activeTab === 'received' ? 'text-brand-600 dark:text-brand-400' : 'text-slate-500'
              }`}
            >
              Tawaran Masuk
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setActiveTab('sent');
              setSelectedStatus(null);
            }}
            className={`flex-1 py-2.5 rounded-lg items-center ${
              activeTab === 'sent' ? 'bg-white dark:bg-slate-700 shadow-sm' : ''
            }`}
          >
            <AppText
              className={`text-sm font-bold ${
                activeTab === 'sent' ? 'text-brand-600 dark:text-brand-400' : 'text-slate-500'
              }`}
            >
              Tawaran Terkirim
            </AppText>
          </TouchableOpacity>
        </View>

        {/* Status Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row py-2 mt-1">
          {STATUS_FILTERS.map((f) => {
            const isSelected = selectedStatus === f.id;
            return (
              <TouchableOpacity
                key={f.label}
                onPress={() => setSelectedStatus(f.id)}
                className={`px-3 py-1 rounded-full mr-2 border ${
                  isSelected
                    ? 'bg-brand-600 border-brand-600'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                }`}
              >
                <AppText className={`text-xs font-semibold ${isSelected ? 'text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                  {f.label}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Offers Feed (Simple Compact List) */}
      <View className="px-4 py-3">
        {loading ? (
          <View className="py-20 items-center justify-center">
            <ActivityIndicator size="large" color="#059669" />
            <AppText variant="caption" className="text-slate-500 mt-3">
              Memuat data barter...
            </AppText>
          </View>
        ) : offers.length === 0 ? (
          <View className="py-20 items-center justify-center">
            <Icon name={'repeat'} size={32} color={'#10b981'} className="mb-3" />
            <AppText variant="h3" className="font-bold text-slate-800 dark:text-white text-center mb-1">
              Tidak Ada Penawaran
            </AppText>
            <AppText variant="caption" className="text-slate-500 text-center px-6">
              {activeTab === 'received'
                ? 'Belum ada pengguna yang mengajukan barter untuk barang-barang Anda saat ini.'
                : 'Anda belum mengirimkan tawaran barter ke pengguna lain. Eksplor beranda dan temukan barang impianmu!'}
            </AppText>
          </View>
        ) : (
          <View className="gap-2.5">
            {offers.map((offer) => {
              const otherUser = activeTab === 'received' ? offer.offerer : offer.target_owner;
              const offererItemsCount = offer.offerer_items?.length || (offer.offerer_item ? 1 : 0);
              const offererTitle =
                offer.offerer_items && offer.offerer_items.length > 1
                  ? `${offer.offerer_items[0]?.title} (+${offer.offerer_items.length - 1} lainnya)`
                  : offer.offerer_item?.title || 'Barang';
              const targetTitle = offer.target_item?.title || 'Barang Target';

              const offererImg = offer.offerer_item?.primary_image || offer.offerer_item?.images?.[0];
              const targetImg = offer.target_item?.primary_image || offer.target_item?.images?.[0];

              return (
                <TouchableOpacity
                  key={offer.id}
                  activeOpacity={0.7}
                  onPress={() =>
                    router.push({
                      pathname: '/offer/[id]',
                      params: { id: offer.id.toString() },
                    })
                  }
                  className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-3.5 shadow-sm active:bg-slate-50 dark:active:bg-slate-750"
                >
                  {/* Top Bar: Other User & Date & Status Badge */}
                  <View className="flex-row items-center justify-between mb-2.5 pb-2 border-b border-slate-100 dark:border-slate-700/60">
                    <View className="flex-row items-center gap-2 flex-1 pr-2">
                      <Avatar
                        name={otherUser?.name || 'User'}
                        url={otherUser?.avatar_url || undefined}
                        size="sm"
                      />
                      <View className="flex-1">
                        <AppText variant="label" className="font-bold text-slate-800 dark:text-slate-200 text-xs" numberOfLines={1}>
                          {otherUser?.name || 'Pengguna'}
                        </AppText>
                        <AppText variant="caption" className="text-slate-400 text-[10px]">
                          {offer.created_at
                            ? new Date(offer.created_at).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })
                            : ''}
                        </AppText>
                      </View>
                    </View>
                    {getStatusBadge(offer.status, offer.has_rated)}
                  </View>

                  {/* Middle: Thumbnails + Trade Titles + Chevron */}
                  <View className="flex-row items-center gap-3">
                    {/* Compact Thumbnails */}
                    <View className="flex-row items-center">
                      {/* Left Thumbnail (Offerer Item) */}
                      <View className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 relative">
                        {offererImg ? (
                          <Image source={{ uri: offererImg }} className="w-full h-full" resizeMode="cover" />
                        ) : (
                          <View className="flex-1 items-center justify-center">
                            <AppText className="text-base">📦</AppText>
                          </View>
                        )}
                        {offererItemsCount > 1 && (
                          <View className="absolute bottom-0 right-0 bg-emerald-600 px-2 py-0.5 rounded-md">
                            <AppText className="text-sm text-white font-bold ">{offererItemsCount}</AppText>
                          </View>
                        )}
                      </View>

                      {/* Swap Arrow Indicator */}
                      <View className="mx-1.5 items-center justify-center">
                        <AppText className="text-brand-600 dark:text-emerald-400 font-bold text-sm">⇄</AppText>
                      </View>

                      {/* Right Thumbnail (Target Item) */}
                      <View className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600">
                        {targetImg ? (
                          <Image source={{ uri: targetImg }} className="w-full h-full" resizeMode="cover" />
                        ) : (
                          <View className="flex-1 items-center justify-center">
                            <AppText className="text-base">📦</AppText>
                          </View>
                        )}
                      </View>
                    </View>

                    {/* Trade Info Text */}
                    <View className="flex-1">
                      <AppText variant="label" className="font-bold text-slate-900 dark:text-white text-xs" numberOfLines={1}>
                        {activeTab === 'received' ? offererTitle : `${offererTitle} (Milik Anda)`}
                      </AppText>
                      <AppText variant="caption" className="text-slate-400 text-[11px] mt-0.5" numberOfLines={1}>
                        ditukar: <AppText className="text-slate-700 dark:text-slate-300 font-semibold">{targetTitle}</AppText>
                      </AppText>

                      {/* Cash Supplement Tag if any */}
                      {offer.cash_supplement && Number(offer.cash_supplement) > 0 ? (
                        <View className="flex-row items-center mt-1">
                          <View className="bg-amber-100 dark:bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                            <AppText className="text-sm font-bold text-amber-800 dark:text-amber-200">
                              +Rp {Number(offer.cash_supplement).toLocaleString('id-ID')}
                            </AppText>
                          </View>
                        </View>
                      ) : null}
                    </View>

                    {/* Right Chevron Indicator */}
                    <View className="w-5 items-center justify-center">
                      <AppText className="text-slate-300 dark:text-slate-600 text-lg font-bold">›</AppText>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
    </MainTemplate>
  );
}

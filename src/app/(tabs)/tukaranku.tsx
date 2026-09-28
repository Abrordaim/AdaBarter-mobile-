import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, Image, Alert, ActivityIndicator, Modal, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { MainTemplate } from '@/components/templates';
import { AppText, Button, Badge, Avatar } from '@/components/atoms';
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

  // Reject modal states
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectingOfferId, setRejectingOfferId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

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

  useEffect(() => {
    fetchOffers();
  }, [activeTab, selectedStatus, isAuthenticated]);

  const handleAccept = async (offer: BarterOffer) => {
    Alert.alert(
      'Terima Penawaran Barter? 🤝',
      `Anda menyetujui pertukaran barang ini dengan ${offer.offerer?.name || 'penawar'}. Status akan menjadi Matched dan ruang chat negosiasi akan segera dibuka.`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Ya, Setujui Barter',
          onPress: async () => {
            setActionLoading(true);
            try {
              await offerService.acceptOffer(offer.id);
              Alert.alert(
                'Barter Disepakati (Matched)! 🎉',
                'Ruang chat negosiasi telah dibuka. Silakan diskusikan titik temu (COD) dan waktu barter dengan penawar.',
                [
                  {
                    text: 'Buka Chat Sekarang',
                    onPress: () => router.push({ pathname: '/chat/[offerId]', params: { offerId: offer.id.toString() } }),
                  },
                  {
                    text: 'Tutup',
                    onPress: () => fetchOffers(),
                  },
                ]
              );
            } catch (e: any) {
              Alert.alert('Gagal Menyetujui', e.message || 'Terjadi kesalahan.');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleOpenReject = (offerId: number) => {
    setRejectingOfferId(offerId);
    setRejectionReason('');
    setRejectModalVisible(true);
  };

  const handleConfirmReject = async () => {
    if (!rejectingOfferId) return;
    setActionLoading(true);
    try {
      await offerService.rejectOffer(rejectingOfferId, rejectionReason.trim() || undefined);
      setRejectModalVisible(false);
      Alert.alert('Tawaran Ditolak', 'Penawaran barter telah ditolak.');
      fetchOffers();
    } catch (e: any) {
      Alert.alert('Gagal Menolak', e.message || 'Terjadi kesalahan.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async (offerId: number) => {
    Alert.alert('Batalkan Tawaran?', 'Apakah Anda yakin ingin membatalkan tawaran barter ini?', [
      { text: 'Tidak', style: 'cancel' },
      {
        text: 'Ya, Batalkan',
        style: 'destructive',
        onPress: async () => {
          setActionLoading(true);
          try {
            await offerService.cancelOffer(offerId);
            Alert.alert('Sukses', 'Tawaran barter telah dibatalkan.');
            fetchOffers();
          } catch (e: any) {
            Alert.alert('Gagal Membatalkan', e.message || 'Terjadi kesalahan.');
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  const handleComplete = async (offerId: number) => {
    Alert.alert(
      'Selesaikan Transaksi Barter?',
      'Pastikan Anda dan pihak penukar telah bertemu langsung (COD), memeriksa kondisi fisik barang, dan menuntaskan pertukaran.',
      [
        { text: 'Belum', style: 'cancel' },
        {
          text: 'Ya, Transaksi Selesai',
          onPress: async () => {
            setActionLoading(true);
            try {
              await offerService.completeOffer(offerId);
              Alert.alert('Barter Selesai! ', 'Selamat! Transaksi barter telah berhasil dituntaskan.');
              fetchOffers();
            } catch (e: any) {
              Alert.alert('Gagal Menyelesaikan', e.message || 'Terjadi kesalahan.');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'matched':
        return <Badge variant="success" text=" Matched / Disepakati" />;
      case 'completed':
        return <Badge variant="info" text="Barter Selesai" />;
      case 'rejected':
        return <Badge variant="error" text="✕ Ditolak" />;
      case 'cancelled':
        return <Badge variant="neutral" text="Dibatalkan" />;
      case 'pending':
      default:
        return <Badge variant="warning" text="Menunggu Persetujuan" />;
    }
  };

  if (!isAuthenticated) {
    return (
      <MainTemplate title="Tukaranku">
        <View className="px-6 py-16 items-center justify-center">
          <View className="w-20 h-20 bg-brand-100 dark:bg-brand-900/30 rounded-full items-center justify-center mb-6">
            <AppText className="text-4xl">🔄</AppText>
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

      {/* Offers Feed */}
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
            <AppText className="text-4xl mb-3">📭</AppText>
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
          <View className="gap-4">
            {offers.map((offer) => {
              const otherUser = activeTab === 'received' ? offer.offerer : offer.target_owner;
              const myItem = activeTab === 'received' ? offer.target_item : offer.offerer_item;
              const theirItem = activeTab === 'received' ? offer.offerer_item : offer.target_item;

              return (
                <View
                  key={offer.id}
                  className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm"
                >
                  {/* Card Header */}
                  <View className="p-3.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-700 flex-row items-center justify-between">
                    <View className="flex-row items-center gap-2.5 flex-1 pr-2">
                      <Avatar
                        name={otherUser?.name || 'User'}
                        url={otherUser?.avatar_url || undefined}
                        size="sm"
                      />
                      <View className="flex-1">
                        <AppText variant="label" className="font-bold text-slate-900 dark:text-white" numberOfLines={1}>
                          {otherUser?.name || 'Pengguna'}
                        </AppText>
                        <AppText variant="caption" className="text-slate-400 text-xs">
                          {offer.created_at ? new Date(offer.created_at).toLocaleDateString('id-ID') : ''}
                        </AppText>
                      </View>
                    </View>
                    {getStatusBadge(offer.status)}
                  </View>

                  {/* Card Body: Items Comparison */}
                  <View className="p-4">
                    <View className="flex-row items-center justify-between gap-2">
                      {/* Left: Barang Penawar */}
                      <View className="flex-1 items-center">
                        <View className="w-20 h-20 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-700 mb-1.5 border border-slate-200 dark:border-slate-700">
                          {offer.offerer_item?.primary_image || offer.offerer_item?.images?.[0] ? (
                            <Image
                              source={{ uri: offer.offerer_item?.primary_image || offer.offerer_item?.images?.[0] }}
                              className="w-full h-full"
                              resizeMode="cover"
                            />
                          ) : (
                            <View className="flex-1 items-center justify-center">
                              <AppText className="text-2xl">📦</AppText>
                            </View>
                          )}
                        </View>
                        <AppText variant="caption" className="text-[11px] text-slate-500 font-bold mb-0.5">
                          {activeTab === 'received' ? 'Barang Ditawarkan' : 'Barang Anda'}
                        </AppText>
                        <AppText className="text-xs font-semibold text-center text-slate-800 dark:text-slate-200" numberOfLines={2}>
                          {offer.offerer_item?.title || 'Barang'}
                        </AppText>
                      </View>

                      {/* Middle: Swap Indicator & Cash Badge */}
                      <View className="items-center px-1">
                        <View className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950 items-center justify-center">
                          <AppText className="text-base text-brand-600 font-bold">⇄</AppText>
                        </View>
                        {offer.cash_supplement && (
                          <View className="bg-amber-100 dark:bg-amber-950 px-2 py-0.5 rounded-full mt-1.5">
                            <AppText className="text-[10px] text-amber-800 dark:text-amber-200 font-bold text-center">
                              +Rp {Number(offer.cash_supplement).toLocaleString('id-ID')}
                            </AppText>
                          </View>
                        )}
                      </View>

                      {/* Right: Barang Target */}
                      <View className="flex-1 items-center">
                        <View className="w-20 h-20 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-700 mb-1.5 border border-slate-200 dark:border-slate-700">
                          {offer.target_item?.primary_image || offer.target_item?.images?.[0] ? (
                            <Image
                              source={{ uri: offer.target_item?.primary_image || offer.target_item?.images?.[0] }}
                              className="w-full h-full"
                              resizeMode="cover"
                            />
                          ) : (
                            <View className="flex-1 items-center justify-center">
                              <AppText className="text-2xl">📦</AppText>
                            </View>
                          )}
                        </View>
                        <AppText variant="caption" className="text-[11px] text-slate-500 font-bold mb-0.5">
                          {activeTab === 'received' ? 'Barang Anda' : 'Barang Target'}
                        </AppText>
                        <AppText className="text-xs font-semibold text-center text-slate-800 dark:text-slate-200" numberOfLines={2}>
                          {offer.target_item?.title || 'Barang'}
                        </AppText>
                      </View>
                    </View>

                    {/* Tukar Tambah Clarification */}
                    {offer.cash_supplement && (
                      <View className="mt-3 p-2 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200/60 dark:border-amber-800/60">
                        <AppText variant="caption" className="text-amber-800 dark:text-amber-200 text-center text-xs">
                          {offer.cash_supplement_by === 'offerer'
                            ? `Uang tambahan +Rp ${Number(offer.cash_supplement).toLocaleString('id-ID')} dibayar oleh penawar (${offer.offerer?.name})`
                            : `Uang tambahan +Rp ${Number(offer.cash_supplement).toLocaleString('id-ID')} dibayar oleh pemilik barang target (${offer.target_owner?.name})`}
                        </AppText>
                      </View>
                    )}

                    {/* Rejection Reason Notice */}
                    {offer.status === 'rejected' && offer.rejection_reason && (
                      <View className="mt-3 p-2.5 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800">
                        <AppText variant="caption" className="text-red-700 dark:text-red-300 text-xs">
                          Alasan Penolakan: "{offer.rejection_reason}"
                        </AppText>
                      </View>
                    )}
                  </View>

                  {/* Card Actions Footer */}
                  <View className="p-3 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-700">
                    {/* State 1: Received & Pending */}
                    {activeTab === 'received' && offer.status === 'pending' && (
                      <View className="flex-row gap-2">
                        <View className="flex-1">
                          <Button
                            title="Tolak"
                            variant="secondary"
                            size="sm"
                            onPress={() => handleOpenReject(offer.id)}
                          />
                        </View>
                        <View className="flex-1">
                          <Button
                            title="Terima Barter"
                            variant="primary"
                            size="sm"
                            onPress={() => handleAccept(offer)}
                          />
                        </View>
                      </View>
                    )}

                    {/* State 2: Sent & Pending */}
                    {activeTab === 'sent' && offer.status === 'pending' && (
                      <Button
                        title="Batalkan Tawaran"
                        variant="secondary"
                        size="sm"
                        onPress={() => handleCancel(offer.id)}
                      />
                    )}

                    {/* State 3: Matched -> Negotiate in Chat or Complete */}
                    {offer.status === 'matched' && (
                      <View className="flex-row gap-2">
                        <View className="flex-1">
                          <Button
                            title="Buka Chat"
                            variant="primary"
                            size="sm"
                            onPress={() =>
                              router.push({
                                pathname: '/chat/[offerId]',
                                params: { offerId: offer.id.toString() },
                              })
                            }
                          />
                        </View>
                        <View className="flex-1">
                          <Button
                            title="Selesaikan COD"
                            variant="secondary"
                            size="sm"
                            onPress={() => handleComplete(offer.id)}
                          />
                        </View>
                      </View>
                    )}

                    {/* State 4: Completed */}
                    {offer.status === 'completed' && (
                      <Button
                        title="Lihat Catatan Chat"
                        variant="secondary"
                        size="sm"
                        onPress={() =>
                          router.push({
                            pathname: '/chat/[offerId]',
                            params: { offerId: offer.id.toString() },
                          })
                        }
                      />
                    )}

                    {/* State 5: Rejected / Cancelled */}
                    {(offer.status === 'rejected' || offer.status === 'cancelled') && (
                      <View className="items-center py-1">
                        <AppText variant="caption" className="text-slate-400">
                          Tawaran ini telah selesai dan tidak dapat diubah lagi.
                        </AppText>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* Reject Reason Modal */}
      <Modal
        visible={rejectModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRejectModalVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-center items-center px-6">
          <View className="bg-white dark:bg-slate-800 w-full p-6 rounded-3xl shadow-lg">
            <AppText variant="h3" className="font-bold text-slate-900 dark:text-white mb-2">
              Tolak Tawaran Barter
            </AppText>
            <AppText variant="caption" className="text-slate-500 mb-4">
              Berikan alasan penolakan secara sopan agar penawar memahami preferensi Anda (opsional).
            </AppText>

            <TextInput
              placeholder="Contoh: Maaf, saya sedang mencari tipe lain atau kondisi belum sesuai..."
              placeholderTextColor="#94a3b8"
              value={rejectionReason}
              onChangeText={setRejectionReason}
              multiline
              numberOfLines={3}
              className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl p-3 text-slate-900 dark:text-white mb-5"
            />

            <View className="flex-row gap-3">
              <View className="flex-1">
                <Button
                  title="Batal"
                  variant="secondary"
                  onPress={() => setRejectModalVisible(false)}
                />
              </View>
              <View className="flex-1">
                <Button
                  title="Konfirmasi Tolak"
                  variant="primary"
                  loading={actionLoading}
                  className="bg-red-600"
                  onPress={handleConfirmReject}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </MainTemplate>
  );
}

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { AppText, Button, Badge, Avatar, Icon } from '@/components/atoms';
import { RatingModal, MidtransPaymentWebView, PaymentStatus } from '@/components/organisms';
import { useAuth } from '@/context/AuthContext';
import { offerService, BarterOffer, EscrowStatus } from '@/services/offerService';
import { voucherService, VoucherClaimItem } from '@/services/voucherService';



function formatRp(val: number | string | null | undefined): string {
  if (val === null || val === undefined) return 'Nilai Fleksibel';
  return `Rp ${Number(val).toLocaleString('id-ID')}`;
}

const DISPUTE_REASONS = [
  'Barang tidak sesuai kondisi fisik / foto',
  'Barang rusak / cacat / mati total',
  'Lawan barter tidak hadir / membatalkan sepihak di lokasi',
  'Barang terindikasi tidak original / tiruan',
  'Lainnya',
];

export default function OfferDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  const [offer, setOffer] = useState<BarterOffer | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Escrow actions state
  const [payLoading, setPayLoading] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);

  // Handover Code modal (Receiver)
  const [handoverModalVisible, setHandoverModalVisible] = useState(false);
  const [handoverCodeInput, setHandoverCodeInput] = useState('');

  // Dispute modal
  const [disputeModalVisible, setDisputeModalVisible] = useState(false);
  const [disputeReason, setDisputeReason] = useState(DISPUTE_REASONS[0]);
  const [disputeDescription, setDisputeDescription] = useState('');
  const [disputeEvidence, setDisputeEvidence] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [disputeSubmitting, setDisputeSubmitting] = useState(false);

  // Reject modal
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  // Rating modal
  const [ratingModalVisible, setRatingModalVisible] = useState(false);

  // Voucher picker (for escrow payment discount)
  const [voucherPickerVisible, setVoucherPickerVisible] = useState(false);
  const [myActiveVouchers, setMyActiveVouchers] = useState<VoucherClaimItem[]>([]);
  const [loadingVouchers, setLoadingVouchers] = useState(false);
  const [selectedVoucherClaim, setSelectedVoucherClaim] = useState<VoucherClaimItem | null>(null);

  // Midtrans WebView payment modal
  const [webViewVisible, setWebViewVisible] = useState(false);
  const [snapUrl, setSnapUrl] = useState('');
  const [paymentAmount, setPaymentAmount] = useState<number | undefined>(undefined);

  // Auto-polling setelah pembayaran (menunggu webhook Midtrans diproses backend)
  const [isPolling, setIsPolling] = useState(false);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollAttemptsRef = useRef(0);
  const MAX_POLL_ATTEMPTS = 20; // 20x × 3s = 60 detik max
  const POLL_INTERVAL_MS = 3000;



  const fetchOfferDetail = async (isRefresh = false) => {
    if (!id) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await offerService.getOfferDetail(parseInt(id, 10));
      setOffer(data);
      return data;
    } catch (e: any) {
      Alert.alert('Gagal Memuat', e.message || 'Gagal memuat informasi penawaran barter.', [
        { text: 'Kembali', onPress: () => router.back() },
      ]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ── Polling helpers ──────────────────────────────────────────

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    pollAttemptsRef.current = 0;
    setIsPolling(false);
  }, []);

  /**
   * Mulai polling setelah pembayaran selesai.
   * Setiap 3 detik fetch ulang offer detail — berhenti saat:
   * 1. handover_code tersedia atau status HELD / WAITING_CONFIRMATION / COMPLETED
   * 2. Sudah 20x percobaan (60 detik timeout)
   */
  const startPollingForHandoverCode = useCallback(() => {
    if (!id) return;
    pollAttemptsRef.current = 0;
    setIsPolling(true);

    pollIntervalRef.current = setInterval(async () => {
      pollAttemptsRef.current += 1;

      try {
        const data = await offerService.getOfferDetail(parseInt(id, 10));
        setOffer(data);

        // Webhook sudah diproses → handover_code tersedia atau status sudah tidak WAITING_PAYMENT
        if (
          Boolean(data?.handover_code) ||
          data?.escrow_status === 'HELD' ||
          data?.escrow_status === 'WAITING_CONFIRMATION' ||
          data?.escrow_status === 'COMPLETED'
        ) {
          stopPolling();
          return;
        }
      } catch {
        // abaikan error sementara saat polling
      }

      // Timeout: sudah 60 detik belum update
      if (pollAttemptsRef.current >= MAX_POLL_ATTEMPTS) {
        stopPolling();
        Alert.alert(
          'Membutuhkan Waktu Lebih Lama',
          'Konfirmasi pembayaran sedang diproses. Silakan tarik halaman ke bawah (refresh) untuk memperbarui status secara manual.',
        );
      }
    }, POLL_INTERVAL_MS);
  }, [id, stopPolling]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/(auth)/login');
      return;
    }
    fetchOfferDetail();
    return () => {
      stopPolling();
    };
  }, [id, isAuthenticated]);


  const handleAccept = async () => {
    if (!offer) return;
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
                'Ruang chat negosiasi telah dibuka. Silakan diskusikan titik temu dan waktu barter dengan penawar.',
                [
                  {
                    text: 'Buka Chat Sekarang',
                    onPress: () =>
                      router.replace({
                        pathname: '/chat/[offerId]',
                        params: { offerId: offer.id.toString() },
                      }),
                  },
                  {
                    text: 'Nanti Saja',
                    onPress: () => fetchOfferDetail(true),
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

  const handleOpenReject = () => {
    setRejectionReason('');
    setRejectModalVisible(true);
  };

  const handleConfirmReject = async () => {
    if (!offer) return;
    setActionLoading(true);
    try {
      await offerService.rejectOffer(offer.id, rejectionReason.trim() || undefined);
      setRejectModalVisible(false);
      Alert.alert('Tawaran Ditolak', 'Penawaran barter telah ditolak.');
      fetchOfferDetail(true);
    } catch (e: any) {
      Alert.alert('Gagal Menolak', e.message || 'Terjadi kesalahan.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelOffer = async () => {
    if (!offer) return;
    Alert.alert(
      'Batalkan Tawaran?',
      'Apakah Anda yakin ingin membatalkan pengajuan barter ini?',
      [
        { text: 'Tidak', style: 'cancel' },
        {
          text: 'Ya, Batalkan',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              await offerService.cancelOffer(offer.id);
              Alert.alert('Tawaran Dibatalkan', 'Penawaran barter telah dibatalkan.', [
                { text: 'Kembali', onPress: () => router.back() },
              ]);
            } catch (e: any) {
              Alert.alert('Gagal Membatalkan', e.message || 'Terjadi kesalahan.');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  // ── ESCROW ACTIONS ──────────────────────────────────────────

  const loadActiveVouchers = async (priceDifference: number) => {
    setLoadingVouchers(true);
    try {
      const vouchers = await voucherService.getMyVouchers('active');
      // Filter hanya voucher yang memenuhi min_transaction_amount
      const eligible = vouchers.filter(
        (v) => Number(v.voucher.min_transaction_amount) <= priceDifference
      );
      setMyActiveVouchers(eligible);
    } catch (e: any) {
      console.log('Failed to load vouchers:', e.message);
    } finally {
      setLoadingVouchers(false);
    }
  };

  const handleOpenVoucherPicker = () => {
    if (!offer) return;
    setVoucherPickerVisible(true);
    if (myActiveVouchers.length === 0) {
      loadActiveVouchers(Number(offer.price_difference));
    }
  };

  const handlePayEscrow = async () => {
    if (!offer) return;
    setPayLoading(true);
    try {
      const res = await offerService.payEscrow(offer.id, selectedVoucherClaim?.claim_id);
      if (res.redirect_url) {
        // Simpan URL & nominal lalu buka WebView modal in-app
        setSnapUrl(res.redirect_url);
        setPaymentAmount(res.gross_amount ?? Number(offer.price_difference));
        setWebViewVisible(true);
      } else {
        Alert.alert('Berhasil', 'Snap token pembayaran berhasil dibuat.');
      }
    } catch (e: any) {
      Alert.alert('Pembayaran Gagal', e.message || 'Gagal memulai transaksi Midtrans.');
    } finally {
      setPayLoading(false);
    }
  };

  const handlePaymentFinish = (status: PaymentStatus) => {
    // Tutup WebView
    setWebViewVisible(false);

    if (status === 'success' || status === 'pending') {
      // Langsung mulai polling — banner "Memproses..." akan muncul di halaman
      startPollingForHandoverCode();
    } else if (status === 'error') {
      Alert.alert(
        'Pembayaran Gagal ❌',
        'Terjadi kesalahan saat memproses pembayaran. Silakan coba lagi.',
        [{ text: 'OK' }]
      );
    } else {
      // cancelled — refresh sekali
      fetchOfferDetail(true);
    }
  };



  const handleConfirmPayer = () => {
    if (!offer) return;
    Alert.alert(
      'Konfirmasi Penerimaan Barang? 📦',
      'Apakah Anda sudah bertemu langsung dan menerima barang barter dalam kondisi yang memuaskan?',
      [
        { text: 'Belum', style: 'cancel' },
        {
          text: 'Ya, Sudah Diterima',
          onPress: async () => {
            setConfirmLoading(true);
            try {
              const res = await offerService.confirmReceived(offer.id);
              Alert.alert('Konfirmasi Berhasil', res.offer ? 'Konfirmasi Anda berhasil dicatat.' : 'Barter berhasil dikonfirmasi.');
              fetchOfferDetail(true);
            } catch (e: any) {
              Alert.alert('Gagal Konfirmasi', e.message || 'Terjadi kesalahan.');
            } finally {
              setConfirmLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleSubmitHandoverCode = async () => {
    if (!offer) return;
    if (!handoverCodeInput.trim() || handoverCodeInput.trim().length !== 6) {
      Alert.alert('Perhatian', 'Masukkan 6 digit kode serah terima yang benar.');
      return;
    }

    setConfirmLoading(true);
    try {
      const res = await offerService.confirmReceived(offer.id, handoverCodeInput.trim());
      setHandoverModalVisible(false);
      setHandoverCodeInput('');
      Alert.alert(
        'Barter Selesai! 🎉',
        'Kode serah terima terverifikasi valid! Dana selisih resmi dicairkan ke Dompet Anda.',
        [{ text: 'Lihat Dompet', onPress: () => router.push('/user/wallet') }, { text: 'Tutup' }]
      );
      fetchOfferDetail(true);
    } catch (e: any) {
      Alert.alert('Kode Salah', e.message || 'Gagal memverifikasi kode serah terima.');
    } finally {
      setConfirmLoading(false);
    }
  };

  const handlePickDisputeEvidence = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Izin Ditolak', 'Akses galeri diperlukan untuk melampirkan bukti foto sengketa.');
      return;
    }

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!res.canceled && res.assets[0]) {
      setDisputeEvidence(res.assets[0]);
    }
  };

  const handleSubmitDispute = async () => {
    if (!offer) return;
    if (disputeDescription.trim().length < 10) {
      Alert.alert('Perhatian', 'Tuliskan deskripsi kronologi masalah secara jelas (minimal 10 karakter).');
      return;
    }

    setDisputeSubmitting(true);
    try {
      await offerService.openDispute(
        offer.id,
        {
          reason: disputeReason,
          description: disputeDescription.trim(),
        },
        disputeEvidence
      );
      setDisputeModalVisible(false);
      setDisputeDescription('');
      setDisputeEvidence(null);
      Alert.alert(
        'Sengketa Berhasil Diajukan ⚠️',
        'Pelepasan dana otomatis telah dibekukan. Tim admin AdaBarter akan meninjau laporan dan bukti Anda.'
      );
      fetchOfferDetail(true);
    } catch (e: any) {
      Alert.alert('Gagal Mengajukan Sengketa', e.message || 'Terjadi kesalahan.');
    } finally {
      setDisputeSubmitting(false);
    }
  };

  const getStatusBadge = (status: string, hasRated?: boolean, escrowStatus?: EscrowStatus | null) => {
    if (offer?.payment_method === 'gateway' && escrowStatus) {
      switch (escrowStatus) {
        case 'WAITING_PAYMENT':
          return <Badge variant="warning" text="Menunggu Pembayaran Escrow" />;
        case 'HELD':
          return <Badge variant="info" text="Dana Tertahan (Siap Serah Terima)" />;
        case 'WAITING_CONFIRMATION':
          return <Badge variant="warning" text="Menunggu Konfirmasi" />;
        case 'COMPLETED':
          return <Badge variant="success" text="Selesai (Dana Dicairkan)" />;
        case 'DISPUTED':
          return <Badge variant="error" text="Dalam Sengketa (Dispute)" />;
        case 'REFUNDED':
          return <Badge variant="neutral" text="Dana Dikembalikan (Refund)" />;
        case 'EXPIRED':
          return <Badge variant="neutral" text="Kedaluwarsa" />;
      }
    }

    switch (status) {
      case 'pending':
        return <Badge variant="warning" text="Menunggu Persetujuan" />;
      case 'matched':
        return <Badge variant="info" text="Disepakati (Matched)" />;
      case 'rejected':
        return <Badge variant="error" text="Ditolak" />;
      case 'completed':
        return <Badge variant="success" text={hasRated ? 'Selesai ⭐' : 'Selesai COD'} />;
      case 'cancelled':
        return <Badge variant="neutral" text="Dibatalkan" />;
      default:
        return <Badge variant="neutral" text={status} />;
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white dark:bg-slate-900 justify-center items-center">
        <ActivityIndicator size="large" color="#059669" />
        <AppText variant="caption" className="text-slate-500 mt-3">
          Memuat rincian tawaran barter...
        </AppText>
      </SafeAreaView>
    );
  }

  if (!offer) return null;

  const isOfferer = Boolean(user?.id && offer.offerer?.id && Number(user.id) === Number(offer.offerer.id));
  const isPayer = Boolean(user?.id && offer.payer_id && Number(user.id) === Number(offer.payer_id));
  const isReceiver = Boolean(user?.id && offer.receiver_id && Number(user.id) === Number(offer.receiver_id));
  const isEscrow = offer.payment_method === 'gateway';
  const canViewHandoverCode = Boolean(offer.handover_code && (isPayer || !isReceiver));


  const otherUser = isOfferer ? offer.target_owner : offer.offerer;
  const targetItem = offer.target_item;
  const offeredItems =
    offer.offerer_items && offer.offerer_items.length > 0
      ? offer.offerer_items
      : offer.offerer_item
      ? [offer.offerer_item]
      : [];
  const totalOffererPrice =
    offer.total_offerer_estimated_price ??
    offeredItems.reduce((acc, it) => acc + (Number(it.estimated_price) || 0), 0);

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-900" edges={['top']}>
      {/* Top Header Bar */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center"
        >
          <AppText className="text-xl font-bold">‹</AppText>
        </TouchableOpacity>
        <AppText variant="h3" className="font-bold text-slate-800 dark:text-white">
          Detail Tawaran Barter
        </AppText>
        <View className="w-10" />
      </View>

      <ScrollView
        className="flex-1 px-4 py-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 140 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchOfferDetail(true)}
            colors={['#059669']}
          />
        }
      >
        {/* Status Card Banner */}
        <View className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 mb-4 flex-row items-center justify-between shadow-sm">
          <View>
            <AppText variant="caption" className="text-slate-400 font-semibold mb-1">
              STATUS PENAWARAN
            </AppText>
            <View className="flex-row items-center gap-2">
              {getStatusBadge(offer.status, offer.has_rated, offer.escrow_status)}
            </View>
          </View>
          <AppText variant="caption" className="text-slate-400 text-xs text-right">
            {offer.created_at ? new Date(offer.created_at).toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }) : ''}
          </AppText>
        </View>

        {/* Profile Card Pihak Lawan */}
        <View className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 mb-4 shadow-sm">
          <AppText variant="caption" className="text-slate-400 font-bold uppercase tracking-wider mb-3">
            {isOfferer ? 'Pemilik Barang Target' : 'Penawar Barang'}
          </AppText>
          <View className="flex-row items-center gap-3">
            <Avatar
              name={otherUser?.name || 'User'}
              url={otherUser?.avatar_url || undefined}
              size="md"
            />
            <View className="flex-1">
              <AppText variant="body" className="font-bold text-slate-900 dark:text-white">
                {otherUser?.name || 'Pengguna'}
              </AppText>
              <AppText variant="caption" className="text-slate-500">
                {otherUser?.city || 'Indonesia'}
              </AppText>
            </View>
            {offer.status === 'matched' && (
              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: '/chat/[offerId]',
                    params: { offerId: offer.id.toString() },
                  })
                }
                className="bg-emerald-50 dark:bg-emerald-950/40 px-3 py-2 rounded-xl flex-row items-center gap-1.5 border border-emerald-200 dark:border-emerald-800"
              >
                <Icon name="chatbubble-ellipses-outline" size={16} color="#059669" />
                <AppText className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                  Chat
                </AppText>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Section 1: Barang Penawar */}
        <View className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 mb-2 shadow-sm">
          <View className="flex-row items-center justify-between mb-3">
            <AppText variant="caption" className="text-slate-500 font-bold uppercase tracking-wider">
              {isOfferer ? 'Barang yang Anda Tawarkan' : 'Barang yang Ditawarkan Lawan'}
            </AppText>
            <View className="bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded-full">
              <AppText className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
                {offeredItems.length} Barang
              </AppText>
            </View>
          </View>

          <View className="space-y-2">
            {offeredItems.map((item) => (
              <View
                key={item.id}
                className="flex-row gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-700 items-center mb-1.5"
              >
                <View className="w-16 h-16 rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-600">
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
                  <AppText variant="label" className="font-bold text-slate-900 dark:text-white" numberOfLines={1}>
                    {item.title}
                  </AppText>
                  <AppText variant="caption" className="text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">
                    {formatRp(item.estimated_price)}
                  </AppText>
                  <View className="flex-row items-center gap-2 mt-1">
                    <Badge variant="neutral" text={item.condition || 'Kondisi Baik'} />
                  </View>
                </View>
              </View>
            ))}
          </View>

          {offeredItems.length > 1 && (
            <View className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 flex-row justify-between items-center">
              <AppText variant="caption" className="text-slate-500 font-semibold">
                Total Estimasi Nilai Tawaran:
              </AppText>
              <AppText variant="label" className="font-bold text-brand-600 dark:text-emerald-400">
                {formatRp(totalOffererPrice)}
              </AppText>
            </View>
          )}
        </View>

        {/* Swap Direction Badge */}
        <View className="items-center -my-2 z-10">
          <View className="w-10 h-10 rounded-full bg-emerald-600 items-center justify-center shadow-md mb-2 dark:border-slate-800">
            <AppText className="text-white text-lg font-bold">⇅</AppText>
          </View>
        </View>

        {/* Section 2: Barang Target */}
        <View className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 mb-4 shadow-sm mt-2">
          <View className="flex-row items-center justify-between mb-3">
            <AppText variant="caption" className="text-slate-500 font-bold uppercase tracking-wider">
              {isOfferer ? 'Barang yang Anda Inginkan (Target)' : 'Barang Milik Anda (Target)'}
            </AppText>
          </View>

          {targetItem ? (
            <View className="flex-row gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-700 items-center">
              <View className="w-16 h-16 rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-600">
                {targetItem.primary_image || targetItem.images?.[0] ? (
                  <Image
                    source={{ uri: targetItem.primary_image || targetItem.images[0] }}
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
                <AppText variant="label" className="font-bold text-slate-900 dark:text-white" numberOfLines={1}>
                  {targetItem.title}
                </AppText>
                <AppText variant="caption" className="text-blue-600 dark:text-blue-400 font-bold mt-0.5">
                  {formatRp(targetItem.estimated_price)}
                </AppText>
                <View className="flex-row items-center gap-2 mt-1">
                  <Badge variant="neutral" text={targetItem.condition || 'Kondisi Baik'} />
                </View>
              </View>
            </View>
          ) : (
            <AppText variant="caption" className="text-slate-400">
              Informasi barang target tidak tersedia.
            </AppText>
          )}
        </View>

        {/* ── POLLING BANNER ── tampil saat menunggu webhook Midtrans ── */}
        {isPolling && (
          <View className="bg-emerald-600 rounded-2xl p-4 mb-3 flex-row items-center gap-3 shadow-md">
            <ActivityIndicator size="small" color="#ffffff" />
            <View className="flex-1">
              <AppText className="text-white font-extrabold text-sm">
                Memproses Pembayaran...
              </AppText>
              <AppText className="text-emerald-100 text-xs mt-0.5">
                Menunggu konfirmasi dari Midtrans. Kode serah terima akan muncul otomatis.
              </AppText>
            </View>
          </View>
        )}

        {/* ── ESCROW & FINANCIAL BREAKDOWN CARD ── */}
        {isEscrow && (offer.price_difference ?? 0) > 0 ? (
          <View className="bg-white dark:bg-slate-800 rounded-2xl p-4 border-2 border-emerald-500/40 dark:border-emerald-500/40 mb-4 shadow-sm">
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center gap-2">
                <AppText className="font-bold text-sm text-emerald-900 dark:text-emerald-100">
                  Total pembayaran
                </AppText>
              </View>
              
            </View>

            <View className="bg-emerald-50/70 dark:bg-emerald-950/30 p-3 rounded-xl mb-3 border border-emerald-100 dark:border-emerald-800">
              <View className="flex-row justify-between items-center mb-1">
                <AppText className="text-base text-slate-600 dark:text-slate-400">Selisih Nilai Barter:</AppText>
                <AppText className="text-base font-extrabold text-emerald-700 dark:text-emerald-300">
                  {formatRp(offer.price_difference)}
                </AppText>
              </View>
              <AppText className="text-xs text-slate-500 dark:text-slate-400">
                {isPayer
                  ? `Anda wajib menyetorkan selisih dana ini ke Rekening Bersama Platform.`
                  : `Dana akan diteruskan ke dompet Anda setelah serah terima selesai.`}
              </AppText>
            </View>

            {/* Sub-State A: WAITING_PAYMENT */}
            {offer.escrow_status === 'WAITING_PAYMENT' && (
              <View className="space-y-2">
                {isPayer ? (
                  <View className="bg-amber-50 dark:bg-amber-950/40 p-3.5 rounded-xl border border-amber-200 dark:border-amber-800">
                    <AppText className="text-xs font-bold text-amber-900 dark:text-amber-200 mb-1">
                      Menunggu Pembayaran dari Anda
                    </AppText>
                    <AppText className="text-xs text-amber-800 dark:text-amber-300 mb-3">
                      Silakan selesaikan pembayaran selisih via Midtrans Snap (QRIS, VA Bank, GoPay, dll).
                    </AppText>

                    {/* Voucher selector */}
                    <TouchableOpacity
                      onPress={handleOpenVoucherPicker}
                      className="flex-row items-center justify-between bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-700 rounded-xl px-3 py-2.5 mb-3"
                    >
                      <View className="flex-row items-center gap-2">
                        <AppText className="text-base">🎟️</AppText>
                        {selectedVoucherClaim ? (
                          <View>
                            <AppText className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                              {selectedVoucherClaim.voucher.formatted_discount}
                            </AppText>
                            <AppText className="text-xs text-slate-500">
                              Voucher terpilih
                            </AppText>
                          </View>
                        ) : (
                          <AppText className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                            Gunakan Voucher Diskon
                          </AppText>
                        )}
                      </View>
                      <View className="flex-row items-center gap-1">
                        {selectedVoucherClaim && (
                          <TouchableOpacity
                            onPress={() => setSelectedVoucherClaim(null)}
                            className="mr-1 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700"
                          >
                            <AppText className="text-xs text-slate-500">Hapus</AppText>
                          </TouchableOpacity>
                        )}
                        <Icon name="chevron-forward" size={16} color="#6b7280" />
                      </View>
                    </TouchableOpacity>

                    {/* Discount breakdown */}
                    {selectedVoucherClaim && (() => {
                      const v = selectedVoucherClaim.voucher;
                      const original = Number(offer.price_difference);
                      let discount = 0;
                      if (v.type === 'fixed') {
                        discount = Math.min(Number(v.discount_amount ?? 0), original);
                      } else {
                        discount = Math.floor((original * Number(v.percentage ?? 0)) / 100);
                        if (v.max_discount_amount) {
                          discount = Math.min(discount, Number(v.max_discount_amount));
                        }
                      }
                      const total = Math.max(original - discount, 1000);
                      return (
                        <View className="bg-emerald-50 dark:bg-emerald-950/50 rounded-xl p-3 mb-3 border border-emerald-200 dark:border-emerald-800">
                          <View className="flex-row justify-between mb-1">
                            <AppText className="text-xs text-slate-600 dark:text-slate-300">Selisih Barter</AppText>
                            <AppText className="text-xs font-bold text-slate-700 dark:text-slate-200">{formatRp(original)}</AppText>
                          </View>
                          <View className="flex-row justify-between mb-1">
                            <AppText className="text-xs text-emerald-700 dark:text-emerald-400">Diskon Voucher 🎟️</AppText>
                            <AppText className="text-xs font-bold text-emerald-700 dark:text-emerald-400">-{formatRp(discount)}</AppText>
                          </View>
                          <View className="h-px bg-emerald-200 dark:bg-emerald-700 my-1" />
                          <View className="flex-row justify-between">
                            <AppText className="text-sm font-bold text-slate-900 dark:text-white">Total Bayar</AppText>
                            <AppText className="text-sm font-extrabold text-emerald-700 dark:text-emerald-300">{formatRp(total)}</AppText>
                          </View>
                        </View>
                      );
                    })()}

                    <Button
                      title={selectedVoucherClaim ? `Bayar ${formatRp(Math.max(Number(offer.price_difference) - (() => { const v = selectedVoucherClaim.voucher; const o = Number(offer.price_difference); return v.type === 'fixed' ? Math.min(Number(v.discount_amount ?? 0), o) : Math.min(Math.floor(o * Number(v.percentage ?? 0) / 100), v.max_discount_amount ? Number(v.max_discount_amount) : Infinity); })(), 1000))}` : 'Bayar Selisih Sekarang'}
                      variant="primary"
                      size="md"
                      loading={payLoading}
                      onPress={handlePayEscrow}
                    />
                  </View>
                ) : (
                  <View className="bg-slate-100 dark:bg-slate-700/50 p-3 rounded-xl">
                    <AppText className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                      ⏳ Menunggu pihak pembayar menyelesaikan pembayaran selisih via Rekening Bersama.
                    </AppText>
                  </View>
                )}
              </View>
            )}

            {/* Sub-State: HELD & WAITING_CONFIRMATION (Dana Diamankan di Rekening Bersama) */}
            {(offer.escrow_status === 'HELD' || offer.escrow_status === 'WAITING_CONFIRMATION') && (
              <View className="space-y-3">
                {/* Header status */}
                <View className="bg-emerald-50 dark:bg-emerald-950/40 p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800">
                  <View className="flex-row items-center gap-2 mb-1">
                    <Icon name="shield-checkmark" size={18} color="#059669" />
                    <AppText className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                      Dana Selisih Aman Tertahan di Rekening Bersama
                    </AppText>
                  </View>
                  <AppText className="text-[11px] text-emerald-800 dark:text-emerald-300">
                    Dana selisih Rp {Number(offer.price_difference).toLocaleString('id-ID')} telah dibayar dan diamankan oleh platform. Silakan kedua pihak bertemu langsung untuk serah terima fisik barang.
                  </AppText>
                  {offer.confirm_deadline_at && (
                    <View className="mt-2 pt-2 border-t border-emerald-200/60 dark:border-emerald-800/60 flex-row items-center gap-1">
                      <Icon name="time-outline" size={13} color="#059669" />
                      <AppText className="text-[10px] text-emerald-700 dark:text-emerald-300">
                        Batas konfirmasi otomatis: {new Date(offer.confirm_deadline_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </AppText>
                    </View>
                  )}
                </View>

                {/* ── UNTUK PEMBAYAR (PAYER): KARTU KODE SERAH TERIMA INLINE (TANPA MODAL) ── */}
                {canViewHandoverCode && (
                  <View className="bg-slate-900 dark:bg-slate-950 p-4 rounded-2xl border border-slate-700 shadow-md">
                    <View className="flex-row items-center justify-between mb-2">
                      <View className="flex-row items-center gap-1.5">
                        <AppText className="text-base">🔑</AppText>
                        <AppText className="text-emerald-400 text-xs font-bold uppercase tracking-wider">
                          Kode Serah Terima Anda
                        </AppText>
                      </View>
                      <View className="bg-emerald-950/90 px-2 py-0.5 rounded border border-emerald-500/40">
                        <AppText className="text-[10px] font-bold text-emerald-300">RAHASIA</AppText>
                      </View>
                    </View>

                    {offer.handover_code ? (
                      <View className="bg-slate-800/90 rounded-xl py-3 px-4 my-2 items-center justify-center border border-slate-700">
                        <AppText
                          selectable
                          className="text-white text-3xl font-mono font-black tracking-[8px]"
                        >
                          {offer.handover_code}
                        </AppText>
                      </View>
                    ) : (
                      <View className="bg-slate-800/60 rounded-xl py-3 px-4 my-2 items-center justify-center">
                        <ActivityIndicator size="small" color="#10b981" />
                        <AppText className="text-slate-400 text-xs mt-1">
                          Memuat kode serah terima...
                        </AppText>
                      </View>
                    )}

                    <AppText className="text-slate-300 text-[11px] text-center mt-1 leading-4">
                      Tunjukkan / berikan kode 6 digit ini kepada lawan barter <AppText className="font-bold text-white">{otherUser?.name || 'lawan barter'}</AppText> HANYA setelah Anda bertemu langsung dan menerima barang barter dalam kondisi sesuai.
                    </AppText>

                    {offer.payer_confirmed_at && (
                      <View className="mt-3 pt-2 border-t border-slate-800 flex-row items-center justify-center gap-1.5">
                        <Icon name="checkmark-circle" size={14} color="#10b981" />
                        <AppText className="text-emerald-400 text-xs font-semibold">
                          Anda sudah mengonfirmasi penerimaan barang
                        </AppText>
                      </View>
                    )}
                  </View>
                )}

                {/* ── UNTUK PENERIMA (RECEIVER): FORM VERIFIKASI KODE INLINE (TANPA MODAL) ── */}
                {isReceiver && (
                  <View className="bg-emerald-50/80 dark:bg-emerald-950/40 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800">
                    <View className="flex-row items-center gap-2 mb-1.5">
                      <AppText className="text-base">📦</AppText>
                      <AppText className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                        Verifikasi Kode dari Pembayar
                      </AppText>
                    </View>
                    <AppText className="text-[11px] text-slate-600 dark:text-slate-300 mb-3 leading-4">
                      Minta 6 digit kode rahasia dari <AppText className="font-bold text-slate-900 dark:text-white">{otherUser?.name || 'pembayar'}</AppText> setelah Anda menyerahkan barang. Masukkan kode di bawah untuk mencairkan dana:
                    </AppText>

                    {offer.receiver_confirmed_at ? (
                      <View className="bg-emerald-100 dark:bg-emerald-900/50 p-3 rounded-xl flex-row items-center gap-2">
                        <Icon name="checkmark-circle" size={16} color="#059669" />
                        <AppText className="text-xs font-bold text-emerald-800 dark:text-emerald-200">
                          Kode telah berhasil diverifikasi! Dana telah dicairkan.
                        </AppText>
                      </View>
                    ) : (
                      <View className="flex-row gap-2">
                        <View className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl px-3 justify-center">
                          <TextInput
                            placeholder="6 digit kode"
                            placeholderTextColor="#94a3b8"
                            keyboardType="number-pad"
                            maxLength={6}
                            value={handoverCodeInput}
                            onChangeText={setHandoverCodeInput}
                            className="font-mono font-bold text-center text-lg text-slate-900 dark:text-white py-2 tracking-[4px]"
                          />
                        </View>
                        <TouchableOpacity
                          onPress={handleSubmitHandoverCode}
                          disabled={confirmLoading || handoverCodeInput.trim().length !== 6}
                          className={`px-4 rounded-xl items-center justify-center ${
                            handoverCodeInput.trim().length === 6 ? 'bg-emerald-600' : 'bg-slate-200 dark:bg-slate-700'
                          }`}
                        >
                          {confirmLoading ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <AppText
                              className={`font-bold text-xs ${
                                handoverCodeInput.trim().length === 6 ? 'text-white' : 'text-slate-400'
                              }`}
                            >
                              Verifikasi
                            </AppText>
                          )}
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                )}

                {/* ── TOMBOL AKSI ── */}
                <View className="flex-row gap-2 pt-1">
                  {isPayer && !offer.payer_confirmed_at && (
                    <View className="flex-1">
                      <Button
                        title="Konfirmasi Terima Barang"
                        variant="primary"
                        size="sm"
                        loading={confirmLoading}
                        onPress={handleConfirmPayer}
                      />
                    </View>
                  )}
                  <View className={isPayer && !offer.payer_confirmed_at ? 'flex-1' : 'w-full'}>
                    <Button
                      title="Ajukan Masalah (Dispute)"
                      variant="secondary"
                      size="sm"
                      onPress={() => setDisputeModalVisible(true)}
                    />
                  </View>
                </View>
              </View>
            )}

            {/* Sub-State D: DISPUTED */}
            {offer.escrow_status === 'DISPUTED' && (
              <View className="bg-red-50 dark:bg-red-950/40 p-3.5 rounded-xl border border-red-200 dark:border-red-900">
                <View className="flex-row items-center gap-1.5 mb-1">
                  <Icon name="alert-circle" size={18} color="#dc2626" />
                  <AppText className="text-xs font-bold text-red-900 dark:text-red-200">
                    Transaksi Dalam Mediasi Sengketa (Dispute)
                  </AppText>
                </View>
                <AppText className="text-[11px] text-red-800 dark:text-red-300">
                  Pelepasan otomatis telah dibekukan. Tim admin AdaBarter sedang meninjau keluhan kedua belah pihak.
                </AppText>
                {offer.dispute && (
                  <View className="mt-2 pt-2 border-t border-red-200 dark:border-red-800">
                    <AppText className="text-[11px] font-bold text-red-900">Alasan: {offer.dispute.reason}</AppText>
                    <AppText className="text-[10px] text-red-700 mt-0.5">{offer.dispute.description}</AppText>
                  </View>
                )}
              </View>
            )}

            {/* Sub-State E: COMPLETED */}
            {offer.escrow_status === 'COMPLETED' && (
              <View className="bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800 flex-row items-center gap-2">
                <Icon name="checkmark-done-circle" size={20} color="#059669" />
                <View className="flex-1">
                  <AppText className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                    Barter Selesai & Dana Dilepaskan
                  </AppText>
                  <AppText className="text-[10px] text-emerald-700 dark:text-emerald-300">
                    Dana selisih telah dikreditkan ke dompet penerima secara aman.
                  </AppText>
                </View>
              </View>
            )}

            {/* Sub-State F: REFUNDED */}
            {offer.escrow_status === 'REFUNDED' && (
              <View className="bg-slate-100 dark:bg-slate-700/50 p-3 rounded-xl flex-row items-center gap-2">
                <Icon name="return-down-back" size={20} color="#64748b" />
                <View className="flex-1">
                  <AppText className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Dana Selisih Telah Dikembalikan (Refund)
                  </AppText>
                  <AppText className="text-[10px] text-slate-500">
                    Dana telah dikembalikan penuh ke dompet pembayar.
                  </AppText>
                </View>
              </View>
            )}
          </View>
        ) : (
          /* COD Card (Fallback jika COD) */
          <View className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 mb-6 shadow-sm">
            <AppText variant="caption" className="text-slate-500 font-bold uppercase tracking-wider mb-3">
              Rincian Tukar Tambah (Selisih Nilai)
            </AppText>

            {offer.cash_supplement && Number(offer.cash_supplement) > 0 ? (
              <View
                className={`p-3.5 rounded-xl border ${
                  offer.cash_supplement_by === 'offerer'
                    ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800'
                    : 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800'
                }`}
              >
                <View className="flex-row items-center justify-between mb-1">
                  <AppText className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Uang Tambahan (COD):
                  </AppText>
                  <AppText
                    className={`text-base font-extrabold ${
                      offer.cash_supplement_by === 'offerer'
                        ? 'text-amber-800 dark:text-amber-300'
                        : 'text-blue-800 dark:text-blue-300'
                    }`}
                  >
                    +{formatRp(offer.cash_supplement)}
                  </AppText>
                </View>

                <View className="flex-row items-center gap-1.5 mt-2 pt-2 border-t border-amber-200/60 dark:border-amber-800/60">
                  <Icon
                    name="information-circle"
                    size={16}
                    color={offer.cash_supplement_by === 'offerer' ? '#b45309' : '#1d4ed8'}
                  />
                  <AppText className="text-xs font-medium text-slate-700 dark:text-slate-200 flex-1 leading-relaxed">
                    {offer.cash_supplement_by === 'offerer'
                      ? isOfferer
                        ? `Anda membayar uang tambahan ${formatRp(offer.cash_supplement)} kepada pemilik barang target saat transaksi COD tunai.`
                        : `Penawar (${offer.offerer?.name}) membayar uang tambahan ${formatRp(offer.cash_supplement)} kepada Anda saat transaksi COD tunai.`
                      : isOfferer
                      ? `Pemilik barang target (${offer.target_owner?.name}) membayar uang tambahan ${formatRp(offer.cash_supplement)} kepada Anda saat transaksi COD tunai.`
                      : `Anda membayar uang tambahan ${formatRp(offer.cash_supplement)} kepada penawar saat transaksi COD tunai.`}
                  </AppText>
                </View>
              </View>
            ) : (
              <View className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800/60 flex-row items-center gap-2">
                <Icon name="checkmark-circle" size={18} color="#059669" />
                <AppText className="text-xs text-emerald-800 dark:text-emerald-300 font-medium flex-1">
                  Barter murni sepadan nilai atau fleksibel tanpa uang tambahan.
                </AppText>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Floating Bottom Action Bar */}
      <View className="absolute bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 border-t border-slate-200 dark:border-slate-800 px-4 py-3 pb-6">
        {/* State 1: Received & Pending */}
        {!isOfferer && offer.status === 'pending' && (
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Button
                title="Tolak Tawaran"
                variant="secondary"
                size="md"
                disabled={actionLoading}
                onPress={handleOpenReject}
              />
            </View>
            <View className="flex-1">
              <Button
                title="Terima Barter"
                variant="primary"
                size="md"
                loading={actionLoading}
                onPress={handleAccept}
              />
            </View>
          </View>
        )}

        {/* State 2: Sent & Pending */}
        {isOfferer && offer.status === 'pending' && (
          <Button
            title="Batalkan Tawaran Barter"
            size="md"
            loading={actionLoading}
            onPress={handleCancelOffer}
            className="bg-red-600"
          />
        )}

        {/* State 3: Matched */}
        {offer.status === 'matched' && (
          <View className="flex-row gap-2">
            <View className="flex-1">
              <Button
                title="Buka Chat Barter"
                variant="primary"
                size="md"
                onPress={() =>
                  router.push({
                    pathname: '/chat/[offerId]',
                    params: { offerId: offer.id.toString() },
                  })
                }
              />
            </View>
            {isEscrow && (
              <TouchableOpacity
                onPress={() => router.push('/user/wallet')}
                className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 items-center justify-center border border-slate-200 dark:border-slate-700"
              >
                <Icon name="wallet-outline" size={20} color="#059669" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* State 4: Completed */}
        {offer.status === 'completed' && (
          offer.has_rated ? (
            <View className="p-2.5 bg-emerald-50 dark:bg-emerald-950 rounded-xl items-center">
              <AppText className="text-xs text-brand-600 dark:text-emerald-300 font-bold">
                Transaksi Selesai & Telah Dinilai ⭐
              </AppText>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => setRatingModalVisible(true)}
              className="bg-amber-500 active:bg-amber-600 py-3 rounded-xl items-center flex-row justify-center gap-2 shadow-sm"
            >
              <Icon name="star" size={16} color="#ffffff" />
              <AppText className="text-sm font-bold text-white">
                Beri Penilaian (Rating) Transaksi
              </AppText>
            </TouchableOpacity>
          )
        )}

        {/* State 5: Rejected or Cancelled */}
        {(offer.status === 'rejected' || offer.status === 'cancelled') && (
          <Button
            title="Kembali ke Tukaranku"
            variant="secondary"
            size="md"
            onPress={() => router.back()}
          />
        )}
      </View>

      {/* Handover Code Modal (Receiver) */}
      <Modal
        visible={handoverModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setHandoverModalVisible(false)}
      >
        <View className="flex-1 bg-black/60 justify-center items-center px-4">
          <View className="bg-white dark:bg-slate-800 rounded-3xl p-5 w-full max-w-sm shadow-2xl">
            <AppText variant="h3" className="font-bold text-slate-900 dark:text-white mb-1">
              Verifikasi Kode Serah Terima
            </AppText>
            <AppText variant="caption" className="text-slate-500 mb-4">
              Mintalah 6 digit kode rahasia dari pihak pembayar setelah Anda menyerahkan barang.
            </AppText>

            <TextInput
              value={handoverCodeInput}
              onChangeText={setHandoverCodeInput}
              placeholder="000000"
              keyboardType="number-pad"
              maxLength={6}
              className="bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl py-3 text-center text-3xl font-mono font-bold tracking-widest text-slate-900 dark:text-white mb-4"
            />

            <View className="flex-row gap-2">
              <View className="flex-1">
                <Button
                  title="Batal"
                  variant="ghost"
                  size="sm"
                  onPress={() => {
                    setHandoverModalVisible(false);
                    setHandoverCodeInput('');
                  }}
                />
              </View>
              <View className="flex-1">
                <Button
                  title="Verifikasi"
                  variant="primary"
                  size="sm"
                  loading={confirmLoading}
                  onPress={handleSubmitHandoverCode}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Dispute Modal */}
      <Modal
        visible={disputeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDisputeModalVisible(false)}
      >
        <View className="flex-1 bg-black/60 justify-center items-center px-4">
          <View className="bg-white dark:bg-slate-800 rounded-3xl p-5 w-full max-w-sm shadow-2xl">
            <AppText variant="h3" className="font-bold text-slate-900 dark:text-white mb-1">
              Ajukan Masalah (Dispute)
            </AppText>
            <AppText variant="caption" className="text-slate-500 mb-3">
              Laporkan kendala transaksi serah terima. Pelepasan dana otomatis akan dibekukan.
            </AppText>

            {/* Reason selector */}
            <AppText className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Kategori Masalah
            </AppText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-1.5 mb-3">
              {DISPUTE_REASONS.map((r) => (
                <TouchableOpacity
                  key={r}
                  onPress={() => setDisputeReason(r)}
                  className={`px-3 py-1.5 rounded-xl border mr-1.5 ${
                    disputeReason === r
                      ? 'bg-red-600 border-red-600'
                      : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <AppText
                    className={`text-xs font-bold ${
                      disputeReason === r ? 'text-white' : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {r}
                  </AppText>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Description */}
            <AppText className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Kronologi / Penjelasan Masalah
            </AppText>
            <TextInput
              value={disputeDescription}
              onChangeText={setDisputeDescription}
              placeholder="Ceritakan kendala yang terjadi secara detail (min 10 karakter)..."
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-900 dark:text-white text-xs mb-3 min-h-[70px]"
            />

            {/* Photo picker */}
            <TouchableOpacity
              onPress={handlePickDisputeEvidence}
              className="border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-3 mb-4 items-center justify-center flex-row gap-2"
            >
              <Icon name="camera-outline" size={18} color="#059669" />
              <AppText className="text-xs text-emerald-700 dark:text-emerald-300 font-semibold">
                {disputeEvidence ? 'Foto Bukti Terpilih ✓' : 'Lampirkan Foto Bukti (Opsional)'}
              </AppText>
            </TouchableOpacity>

            <View className="flex-row gap-2">
              <View className="flex-1">
                <Button
                  title="Batal"
                  variant="ghost"
                  size="sm"
                  onPress={() => setDisputeModalVisible(false)}
                />
              </View>
              <View className="flex-1">
                <Button
                  title="Kirim Laporan"
                  variant="primary"
                  size="sm"
                  loading={disputeSubmitting}
                  onPress={handleSubmitDispute}
                  className="bg-red-600"
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Reject Reason Modal */}
      <Modal
        visible={rejectModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRejectModalVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-center items-center px-4">
          <View className="bg-white dark:bg-slate-800 rounded-3xl p-5 w-full max-w-sm">
            <AppText variant="h3" className="font-bold text-slate-900 dark:text-white mb-2">
              Tolak Tawaran Barter
            </AppText>
            <AppText variant="caption" className="text-slate-500 mb-4">
              Berikan alasan penolakan secara sopan agar penawar memahaminya (opsional).
            </AppText>

            <TextInput
              value={rejectionReason}
              onChangeText={setRejectionReason}
              placeholder="Contoh: Kurang cocok dengan barang yang ditawarkan..."
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-900 dark:text-white text-sm mb-4 min-h-[80px]"
            />

            <View className="flex-row gap-2">
              <View className="flex-1">
                <Button
                  title="Batal"
                  variant="ghost"
                  size="sm"
                  onPress={() => setRejectModalVisible(false)}
                />
              </View>
              <View className="flex-1">
                <Button
                  title="Tolak Tawaran"
                  variant="primary"
                  size="sm"
                  loading={actionLoading}
                  onPress={handleConfirmReject}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Voucher Picker Modal */}
      <Modal
        visible={voucherPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setVoucherPickerVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white dark:bg-slate-800 rounded-t-3xl p-5 max-h-[75%]">
            {/* Handle */}
            <View className="w-10 h-1 bg-slate-300 dark:bg-slate-600 rounded-full self-center mb-4" />

            <View className="flex-row items-center justify-between mb-4">
              <View>
                <AppText className="text-base font-extrabold text-slate-900 dark:text-white">
                  Pilih Voucher Diskon 🎟️
                </AppText>
                <AppText className="text-xs text-slate-500 dark:text-slate-400">
                  Hanya voucher yang memenuhi min. transaksi ditampilkan
                </AppText>
              </View>
              <TouchableOpacity
                onPress={() => setVoucherPickerVisible(false)}
                className="p-2 bg-slate-100 dark:bg-slate-700 rounded-full"
              >
                <Icon name="close" size={18} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {loadingVouchers ? (
              <View className="items-center py-10">
                <ActivityIndicator size="large" color="#059669" />
                <AppText className="text-slate-400 mt-2 text-sm">Memuat voucher…</AppText>
              </View>
            ) : myActiveVouchers.length === 0 ? (
              <View className="items-center py-10 px-4">
                <AppText className="text-4xl mb-2">🎫</AppText>
                <AppText className="font-bold text-slate-600 dark:text-slate-300 text-center">
                  Tidak ada voucher yang tersedia
                </AppText>
                <AppText className="text-slate-400 text-xs text-center mt-1">
                  Klaim voucher terlebih dahulu melalui menu Voucher &amp; Promo Diskon di profil Anda.
                </AppText>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {myActiveVouchers.map((item) => {
                  const isSelected = selectedVoucherClaim?.claim_id === item.claim_id;
                  return (
                    <TouchableOpacity
                      key={item.claim_id}
                      onPress={() => {
                        setSelectedVoucherClaim(isSelected ? null : item);
                        setVoucherPickerVisible(false);
                      }}
                      className={`flex-row items-center p-3 rounded-2xl mb-2 border ${
                        isSelected
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500'
                          : 'bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600'
                      }`}
                    >
                      <View className="flex-1">
                        <AppText className="text-sm font-extrabold text-slate-900 dark:text-white">
                          {item.voucher.formatted_discount}
                        </AppText>
                        <View className="flex-row items-center gap-2 mt-0.5">
                          <View className="bg-slate-100 dark:bg-slate-600 px-1.5 py-0.5 rounded">
                            <AppText className="text-xs font-mono font-bold text-slate-500 dark:text-slate-300">
                              {item.voucher.code}
                            </AppText>
                          </View>
                          <AppText className="text-xs text-slate-400">
                            Min. {`Rp ${Number(item.voucher.min_transaction_amount).toLocaleString('id-ID')}`}
                          </AppText>
                        </View>
                      </View>
                      <View
                        className={`w-5 h-5 rounded-full border-2 items-center justify-center ${
                          isSelected
                            ? 'bg-emerald-600 border-emerald-600'
                            : 'border-slate-300 dark:border-slate-500'
                        }`}
                      >
                        {isSelected && (
                          <Icon name="checkmark" size={12} color="#fff" />
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            <View className="mt-4">
              <Button
                title="Tutup"
                variant="secondary"
                onPress={() => setVoucherPickerVisible(false)}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Midtrans Payment WebView (in-app modal) */}
      {webViewVisible && Boolean(snapUrl) && (
        <MidtransPaymentWebView
          snapUrl={snapUrl}
          amount={paymentAmount}
          onPaymentFinish={handlePaymentFinish}
          onClose={() => {
            setWebViewVisible(false);
            fetchOfferDetail(true);
          }}
        />
      )}

      {/* Rating Modal */}

      <RatingModal
        visible={ratingModalVisible}
        offerId={offer.id}
        targetUser={
          otherUser
            ? {
                id: otherUser.id,
                name: otherUser.name,
                avatar_url: otherUser.avatar_url,
                city: otherUser.city,
              }
            : null
        }
        onClose={() => setRatingModalVisible(false)}
        onSuccess={() => {
          setRatingModalVisible(false);
          fetchOfferDetail(true);
        }}
      />
    </SafeAreaView>
  );
}

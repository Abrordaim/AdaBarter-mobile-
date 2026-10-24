import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText, Avatar, Badge, Icon, Button } from '@/components/atoms';
import { useAuth } from '@/context/AuthContext';
import { userService, PublicUserProfile } from '@/services/userService';
import { ratingService, Rating } from '@/services/ratingService';
import { reportService } from '@/services/reportService';
import { BarterItem } from '@/services/itemService';
import { ItemCard } from '@/components/molecules';
import * as ImagePicker from 'expo-image-picker';

function formatRp(val: number | string | null | undefined): string {
  if (val === null || val === undefined) return 'Nilai Fleksibel';
  return `Rp ${Number(val).toLocaleString('id-ID')}`;
}

export default function UserPublicProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  const [userProfile, setUserProfile] = useState<PublicUserProfile | null>(null);
  const [items, setItems] = useState<BarterItem[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [ratingsTotal, setRatingsTotal] = useState<number>(0);

  const [activeTab, setActiveTab] = useState<'reviews' | 'items'>('items');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Report User State
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportReason, setReportReason] = useState<string>('');
  const [reportDescription, setReportDescription] = useState<string>('');
  const [reportEvidenceAsset, setReportEvidenceAsset] = useState<any>(null);
  const [submittingReport, setSubmittingReport] = useState<boolean>(false);

  const userReportReasons = [
    { value: 'penipuan', label: 'Indikasi Penipuan / Scam' },
    { value: 'pelecehan', label: 'Pelecehan / Kata Kasar' },
    { value: 'akun_palsu', label: 'Akun Palsu / Bot / Spam' },
    { value: 'pelanggaran_barter', label: 'Pelanggaran Aturan Barter' },
    { value: 'lainnya', label: 'Alasan Lainnya' },
  ];

  const isOwner = !!(user && userProfile && user.id === userProfile.id);

  const openReportModal = () => {
    if (!isAuthenticated) {
      Alert.alert(
        'Perlu Masuk Akun',
        'Anda harus masuk terlebih dahulu untuk melaporkan akun pengguna.',
        [
          { text: 'Nanti', style: 'cancel' },
          { text: 'Masuk Sekarang', onPress: () => router.push('/(auth)/login') },
        ]
      );
      return;
    }
    if (isOwner) {
      Alert.alert('Perhatian', 'Anda tidak dapat melaporkan akun sendiri.');
      return;
    }
    setReportReason('');
    setReportDescription('');
    setReportEvidenceAsset(null);
    setReportModalVisible(true);
  };

  const pickEvidence = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Izin Ditolak', 'Diperlukan izin akses galeri untuk melampirkan bukti.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'] as any,
        allowsEditing: false,
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setReportEvidenceAsset(result.assets[0]);
      }
    } catch (e: any) {
      Alert.alert('Gagal Memilih Foto', e.message);
    }
  };

  const handleSubmitReport = async () => {
    if (!userProfile) return;
    if (!reportReason) {
      Alert.alert('Perhatian', 'Silakan pilih alasan laporan terlebih dahulu.');
      return;
    }
    if (!reportDescription.trim() || reportDescription.trim().length < 10) {
      Alert.alert('Perhatian', 'Keterangan keluhan minimal 10 karakter.');
      return;
    }

    setSubmittingReport(true);
    try {
      await reportService.createReport(
        {
          reportable_type: 'user',
          reportable_id: userProfile.id,
          reason: reportReason,
          description: reportDescription.trim(),
        },
        reportEvidenceAsset
      );
      setReportModalVisible(false);
      Alert.alert(
        'Laporan Terkirim ',
        'Terima kasih! Laporan akun telah diterima oleh tim Admin AdaBarter dan akan segera ditinjau.'
      );
    } catch (e: any) {
      Alert.alert('Gagal Mengirim Laporan', e.message || 'Terjadi kesalahan, coba lagi.');
    } finally {
      setSubmittingReport(false);
    }
  };

  const loadData = async (isRefresh = false) => {
    if (!id) return;
    const userId = parseInt(id, 10);
    if (isNaN(userId)) return;

    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [profileRes, ratingsRes] = await Promise.all([
        userService.getPublicProfile(userId),
        ratingService.getUserRatings(userId),
      ]);

      setUserProfile(profileRes.user);
      setItems(profileRes.items || []);
      setRatings(ratingsRes.ratings || []);
      setRatingsTotal(ratingsRes.pagination?.total ?? (ratingsRes.ratings?.length || 0));
    } catch (e: any) {
      Alert.alert('Gagal Memuat Profil', e.message || 'Terjadi kesalahan saat memuat profil pengguna.', [
        { text: 'Kembali', onPress: () => router.back() },
      ]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white dark:bg-slate-900 justify-center items-center">
        <ActivityIndicator size="large" color="#059669" />
        <AppText variant="caption" className="text-slate-500 mt-3">
          Memuat profil pengguna...
        </AppText>
      </SafeAreaView>
    );
  }

  if (!userProfile) return null;



  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-900" edges={['top']}>
      {/* Top Header Bar */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-emerald-600 dark:bg-slate-900  dark:border-slate-800">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center"
        >
          <AppText className="text-xl font-bold">‹</AppText>
        </TouchableOpacity>
        <AppText variant="h3" className="font-bold text-slate-50 dark:text-white">
          Profil Pengguna
        </AppText>
        {!isOwner ? (
          <TouchableOpacity
            onPress={openReportModal}
            className="w-10 h-10 rounded-full bg-red-500/20 items-center justify-center border border-red-300/40"
          >
            <Icon name="flag-outline" size={18} color="#ffffff" />
          </TouchableOpacity>
        ) : (
          <View className="w-10" />
        )}
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadData(true)}
            colors={['#059669']}
          />
        }
      >
        {/* Profile Hero Card (Catatan: Sesuai permintaan, tidak menampilkan badge VIP) */}
        <View className="bg-white dark:bg-slate-800 p-5 border-b border-slate-100 dark:border-slate-700 items-center rounded-b-xl ">
          <Avatar
            name={userProfile.name}
            url={userProfile.avatar_url || undefined}
            size="lg"
          />

          <AppText variant="h2" className="font-bold text-slate-900 dark:text-white mt-2 text-center">
            {userProfile.name}
          </AppText>

          <View className="flex-row justify-center items-center gap-4 mt-4 " >
            <View className="flex-col items-center gap-1 w-20">
              <Icon name="star" size={14} color="#eab308" />
              <AppText className="text-sm text-slate-500">
                {userProfile.average_rating ? userProfile.average_rating.toFixed(1) : '-'}
              </AppText>
            </View>

            <View className="w-1 h-2 rounded-full bg-slate-300 dark:bg-slate-600" />
            <View className="flex-col items-center gap-1 ">
              <Icon name="location-outline" size={14} color="#64748b" />
              <AppText className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                {userProfile.regency_name || userProfile.city || 'Indonesia'}
              </AppText>
            </View>



          </View>


        </View>

        {/* Tab Switcher: Ulasan vs Barang Barter */}
        <View className="px-4 mt-4">
          <View className="flex-row bg-emerald-100 dark:bg-slate-800 p-1 rounded-2xl mb-4 border border-emerald-200 dark:border-slate-700">
            <TouchableOpacity
              onPress={() => setActiveTab('items')}
              className={`flex-1 py-2.5 rounded-xl items-center ${activeTab === 'items' ? 'bg-emerald-600 dark:bg-slate-700 shadow-sm' : ''
                }`}
            >
              <AppText
                className={`text-xs font-bold ${activeTab === 'items' ? 'text-slate-50' : 'text-slate-500'
                  }`}
              >
                Barang Barter ({items.length})
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveTab('reviews')}
              className={`flex-1 py-2.5 rounded-xl items-center ${activeTab === 'reviews' ? 'bg-emerald-600 dark:bg-slate-700 shadow-sm' : ''
                }`}
            >
              <AppText
                className={`text-xs font-bold ${activeTab === 'reviews' ? 'text-slate-50' : 'text-slate-500'
                  }`}
              >
                Ulasan ({ratingsTotal})
              </AppText>
            </TouchableOpacity>


          </View>
        </View>

        {/* Tab 1: Ulasan & Rating List */}
        {activeTab === 'reviews' && (
          <View className="px-4 gap-3">
            {ratings.length === 0 ? (
              <View className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 items-center justify-center">
                {/* <Icon name="star-outline" size={36} color="#94a3b8" /> */}
                <AppText variant="label" className="font-bold text-slate-800 dark:text-white mt-3">
                  Belum Ada Ulasan
                </AppText>
                <AppText variant="caption" className="text-slate-400 text-center mt-1">
                  Pengguna ini belum memiliki riwayat ulasan dari transaksi barter sebelumnya.
                </AppText>
              </View>
            ) : (
              ratings.map((rating) => {
                const dateStr = rating.created_at
                  ? new Date(rating.created_at).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })
                  : '';

                return (
                  <View
                    key={rating.id}
                    className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm"
                  >
                    {/* Reviewer Header */}
                    <View className="flex-row items-center justify-between mb-2">
                      <View className="flex-row items-center gap-2.5 flex-1 pr-2">
                        <Avatar
                          name={rating.rater?.name || 'User'}
                          url={rating.rater?.avatar_url || undefined}
                          size="sm"
                        />
                        <View className="flex-1">
                          <AppText variant="label" className="font-bold text-slate-900 dark:text-white text-xs" numberOfLines={1}>
                            {rating.rater?.name || 'Pengguna'}
                          </AppText>
                          <AppText className="text-slate-400 text-xs">
                            {dateStr}
                          </AppText>
                        </View>
                      </View>

                      {/* Stars */}
                      <View className="flex-row items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Icon
                            key={star}
                            name={star <= rating.rating ? 'star' : 'star-outline'}
                            size={14}
                            color={star <= rating.rating ? '#eab308' : '#cbd5e1'}
                          />
                        ))}
                      </View>
                    </View>

                    {/* Review Comment */}
                    {rating.comment ? (
                      <AppText className="text-slate-700 dark:text-slate-300 text-xs leading-5 mt-1 bg-slate-50 dark:bg-slate-750 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700">
                        "{rating.comment}"
                      </AppText>
                    ) : (
                      <AppText variant="caption" className="text-slate-400 italic text-[11px] mt-1">
                        Memberikan rating {rating.rating} bintang tanpa ulasan tertulis.
                      </AppText>
                    )}
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* Tab 2: Barang Barter Lainnya */}
        {activeTab === 'items' && (
          <View className="px-4 gap-3">
            {items.length === 0 ? (
              <View className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 items-center justify-center">
                <AppText className="text-3xl mb-2">📦</AppText>
                <AppText variant="label" className="font-bold text-slate-800 dark:text-white">
                  Tidak Ada Barang Aktif
                </AppText>
                <AppText variant="caption" className="text-slate-400 text-center mt-1">
                  Pengguna ini sedang tidak memiliki barang lain yang dipajang untuk barter.
                </AppText>
              </View>
            ) : (
              <View className='px-3 flex-row flex-wrap'>

                {items.map((item) => (
                  <View key={item.id} className="w-1/2 p-1.5">
                    <ItemCard
                      title={item.title}
                      location={item.location}
                      city={item.city}
                      condition={item.condition}
                      estimatedPrice={item.estimated_price}
                      imageUrl={item.primary_image || item.images?.[0]}
                      // isBoosted={item.is_boosted}
                      desiredItems={item.desired_items}
                      onPress={() => {
                        router.push({
                          pathname: '/item/[id]',
                          params: { id: item.id.toString() },
                        });
                      }}
                    />
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Report Modal */}
      <Modal
        visible={reportModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setReportModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%' }}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Header */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
                <View>
                  <View className='flex-row gap-2'>
                    <Icon name={'alert'} size={20} color={'red'} className=' bg-red-200 rounded-full p-1 border border-red-500'/>
                    <AppText variant="h3" className="font-bold text-slate-900">Laporkan Pengguna</AppText>
                  </View>
                  <AppText variant="caption" className="text-slate-500 mt-0.5" numberOfLines={1}>{userProfile?.name}</AppText>
                </View>
                <TouchableOpacity onPress={() => setReportModalVisible(false)} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}>
                  <AppText className="text-slate-500 font-bold text-sm">✕</AppText>
                </TouchableOpacity>
              </View>

              {/* Alasan Laporan */}
              <AppText variant="label" className="mb-2 text-slate-700">Alasan Laporan *</AppText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {userReportReasons.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => setReportReason(opt.value)}
                    style={{
                      paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1,
                      backgroundColor: reportReason === opt.value ? '#ef4444' : '#f8fafc',
                      borderColor: reportReason === opt.value ? '#ef4444' : '#e2e8f0',
                    }}
                  >
                    <AppText style={{ fontSize: 13, fontWeight: '500', color: reportReason === opt.value ? '#fff' : '#334155' }}>
                      {opt.label}
                    </AppText>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Keterangan */}
              <AppText variant="label" className="mb-1 text-slate-700">Keterangan / Kronologi *</AppText>
              <View style={{ borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#fff', marginBottom: 4, minHeight: 90 }}>
                <TextInput
                  value={reportDescription}
                  onChangeText={setReportDescription}
                  placeholder="Ceritakan indikasi pelanggaran atau kronologi kejadian (min. 10 karakter)..."
                  placeholderTextColor="#94a3b8"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  maxLength={1000}
                  style={{ color: '#0f172a', fontSize: 14, minHeight: 80 }}
                />
              </View>
              <AppText variant="caption" className="text-slate-400 text-right mb-4">{reportDescription.length}/1000</AppText>

              {/* Bukti Foto */}
              <AppText variant="label" className="mb-2 text-slate-700">Bukti Foto / Tangkapan Layar (Opsional)</AppText>
              {reportEvidenceAsset ? (
                <View style={{ position: 'relative', marginBottom: 16 }}>
                  <Image source={{ uri: reportEvidenceAsset.uri }} style={{ width: '100%', height: 140, borderRadius: 12 }} resizeMode="cover" />
                  <TouchableOpacity onPress={() => setReportEvidenceAsset(null)} style={{ position: 'absolute', top: 8, right: 8, width: 28, height: 28, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}>
                    <AppText className="text-white text-xs font-bold">✕</AppText>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity onPress={pickEvidence} style={{ borderWidth: 2, borderStyle: 'dashed', borderColor: '#cbd5e1', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 16 }}>
                  <Icon name="image-outline" size={28} color="#94a3b8" />
                  <AppText variant="caption" className="text-slate-400 mt-1">Lampirkan bukti tangkapan layar jika ada</AppText>
                </TouchableOpacity>
              )}

              {/* Action Buttons */}
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 8, marginBottom: 16 }}>
                <View style={{ flex: 1 }}>
                  <Button title="Batal" variant="secondary" onPress={() => setReportModalVisible(false)} disabled={submittingReport} />
                </View>
                <View style={{ flex: 1 }}>
                  <Button title="Kirim Laporan" variant="primary" loading={submittingReport} onPress={handleSubmitReport} />
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

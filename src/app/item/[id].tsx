import React, { useState, useEffect } from 'react';
import { View, ScrollView, Image, TouchableOpacity, ActivityIndicator, Alert, Dimensions, Share, Text, Modal, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { AppText, Button, Badge, Avatar, Icon, Input } from '@/components/atoms';
import { useAuth } from '@/context/AuthContext';
import { itemService, BarterItem } from '@/services/itemService';
import { reportService } from '@/services/reportService';
import { bannerService, Banner } from '@/services/bannerService';
import { BannerCarousel } from '@/components/organisms';


export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [banners, setBanners] = useState<Banner[]>([]);


  const [item, setItem] = useState<BarterItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Report modal state
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [reportEvidenceAsset, setReportEvidenceAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [submittingReport, setSubmittingReport] = useState(false);

  const screenWidth = Dimensions.get('window').width;

  const fetchItemDetail = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await itemService.getItemDetail(parseInt(id, 10));
      const banner = await bannerService.getBanners('detail_page');

      setItem(data);
      setBanners(banner)
    } catch (e: any) {
      Alert.alert('Gagal Memuat', e.message || 'Barang tidak ditemukan atau sudah tidak aktif.', [
        { text: 'Kembali', onPress: () => router.back() },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // const fetchBanner = async () => {
  //   try {
  //     const
  //   } catch (e) {}
  // }
   

  useEffect(() => {
    fetchItemDetail();
  }, [id]);

  const handleShare = async () => {
    if (!item) return;
    try {
      await Share.share({
        message: `Lihat barang barter ini di AdaBarter: "${item.title}" di ${item.city || 'Indonesia'}. Tertarik menukarnya?`,
      });
    } catch (e) {
      console.log('Error sharing:', e);
    }
  };

  const handleBarterPress = () => {
    if (!item) return;

    if (!isAuthenticated) {
      Alert.alert(
        'Perlu Masuk Akun',
        'Anda harus masuk atau mendaftar terlebih dahulu untuk mengajukan tawaran barter.',
        [
          { text: 'Nanti', style: 'cancel' },
          { text: 'Masuk Sekarang', onPress: () => router.push('/(auth)/login') },
        ]
      );
      return;
    }

    if (item.user?.id === user?.id) {
      Alert.alert('Perhatian', 'Ini adalah barang milik Anda sendiri.');
      return;
    }

    router.push({
      pathname: '/offer/create',
      params: { target_item_id: item.id.toString() },
    });
  };

  const openReportModal = () => {
    if (!isAuthenticated) {
      Alert.alert(
        'Perlu Masuk Akun',
        'Anda harus masuk terlebih dahulu untuk melaporkan barang.',
        [
          { text: 'Nanti', style: 'cancel' },
          { text: 'Masuk Sekarang', onPress: () => router.push('/(auth)/login') },
        ]
      );
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
        mediaTypes: 'images' as any,
        allowsEditing: false,
        quality: 0.8,
      });
      if (!result.canceled && result.assets.length > 0) {
        setReportEvidenceAsset(result.assets[0]);
      }
    } catch (e: any) {
      Alert.alert('Gagal Memilih Foto', e.message);
    }
  };

  const handleSubmitReport = async () => {
    if (!item) return;
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
          reportable_type: 'item',
          reportable_id: item.id,
          reason: reportReason,
          description: reportDescription.trim(),
        },
        reportEvidenceAsset
      );
      setReportModalVisible(false);
      Alert.alert(
        'Laporan Terkirim ✅',
        'Terima kasih! Laporan Anda telah diterima oleh tim Admin AdaBarter dan akan segera ditindaklanjuti.'
      );
    } catch (e: any) {
      Alert.alert('Gagal Mengirim Laporan', e.message || 'Terjadi kesalahan, coba lagi.');
    } finally {
      setSubmittingReport(false);
    }
  };

  const getConditionInfo = (cond: string) => {
    switch (cond) {
      case 'baru':
      case 'Baru':
        return { variant: 'success' as const, label: 'Kondisi: Baru' };
      case 'bekas_seperti_baru':
      case 'Bekas Seperti Baru':
        return { variant: 'info' as const, label: 'Kondisi: Seperti Baru (95-99%)' };
      case 'bekas_baik':
      case 'Bekas Baik':
        return { variant: 'neutral' as const, label: 'Kondisi: Baik / Pemakaian Normal' };
      default:
        return { variant: 'warning' as const, label: 'Kondisi: Layak Pakai' };
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white dark:bg-slate-900 justify-center items-center">
        <ActivityIndicator size="large" color="#059669" />
        <AppText variant="caption" className="text-slate-500 mt-3">
          Memuat detail barang...
        </AppText>
      </SafeAreaView>
    );
  }

  if (!item) {
    return null;
  }

  const isOwner = user?.id === item.user?.id;
  const images = item.images && item.images.length > 0 ? item.images : (item.primary_image ? [item.primary_image] : []);
  const condInfo = getConditionInfo(item.condition);

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-900" edges={['top']}>
      {/* Floating Top Nav Buttons */}
      <View className="flex-row items-center justify-between px-4 py-2 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center"
        >
          {/* <AppText className="text-xl font-bold">‹</AppText> */}
          <Icon name={'arrow-back'} size={24} />
        </TouchableOpacity>

        <AppText variant="label" className="font-bold text-slate-800 dark:text-white" numberOfLines={1}>
          Detail Barang Barter
        </AppText>

        <View className="flex-row items-center gap-2">
          <TouchableOpacity
            onPress={handleShare}
            className="w-10 h-10 rounded-full bg-green-50 dark:bg-slate-800 items-center justify-center"
          >
            {/* <AppText className="text-lg">📤</AppText> */}
            <Icon name={'share-social'} size={18} color={'green'}/>
          </TouchableOpacity>

          {!isOwner && (
            <TouchableOpacity
              onPress={openReportModal}
              className="w-10 h-10 rounded-full bg-red-50   items-center justify-center"
            >
              <Icon name="flag-outline" size={18} color="#ef4444" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>
        {/* Photo Gallery Carousel */}
        <View className="relative bg-slate-200 dark:bg-slate-800 w-full" style={{ height: screenWidth * 0.85 }}>
          {images.length > 0 ? (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                const newIndex = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
                setActiveImageIndex(newIndex);
              }}
            >
              {images.map((uri, idx) => (
                <Image
                  key={idx}
                  source={{ uri }}
                  style={{ width: screenWidth, height: screenWidth * 0.85 }}
                  resizeMode="cover"
                />
              ))}
            </ScrollView>
          ) : (
            <View className="flex-1 items-center justify-center">
              <AppText className="text-slate-400">Tidak ada foto</AppText>
            </View>
          )}

          {/* Dots Indicator */}
          {images.length > 1 && (
            <View className="absolute bottom-3 left-0 right-0 flex-row justify-center gap-1.5">
              {images.map((_, idx) => (
                <View
                  key={idx}
                  className={`h-2 rounded-full ${idx === activeImageIndex ? 'w-5 bg-brand-600' : 'w-2 bg-white/70'
                    }`}
                />
              ))}
            </View>
          )}

          {/* Boosted Flag */}
          {item.is_boosted && (
            <View className="absolute top-3 left-3 bg-amber-500 px-3 py-1 rounded-full flex-row items-center gap-1 shadow-sm">
              <AppText className="text-xs text-white font-bold">⚡ Pinned & Prioritas</AppText>
            </View>
          )}
        </View>

        {/* Core Product Information Card */}
        <View className="bg-white dark:bg-slate-800 p-5 border-b border-slate-100 dark:border-slate-800">
          <View className="flex-row items-center gap-2 mb-2">
            <Badge variant={condInfo.variant} text={condInfo.label} />
            {item.category?.name && (
              <View className="bg-slate-100 dark:bg-slate-700 px-2.5 py-0.5 rounded-full">
                <AppText className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                  {item.category.icon ? `${item.category.icon} ` : ''}{item.category.name}
                </AppText>
              </View>
            )}
          </View>

          <AppText variant="h2" className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            {item.title}
          </AppText>

          {item.estimated_price ? (
            <View className="flex-row items-baseline gap-2 mb-3">
              <AppText className="text-2xl font-extrabold text-brand-600 dark:text-brand-400">
                Rp {Number(item.estimated_price).toLocaleString('id-ID')}
              </AppText>
              <AppText variant="caption" className="text-slate-400 text-xs">
                (Estimasi nilai untuk Tukar Tambah)
              </AppText>
            </View>
          ) : (
            <AppText className="text-lg font-bold text-brand-600 dark:text-brand-400 mb-3">
              Nilai Barter Fleksibel
            </AppText>
          )}

          <View className="flex-row items-center gap-4 pt-3 border-t border-slate-100 dark:border-slate-700">
            <View className="flex-row items-center gap-1">
              <AppText className="text-sm"><Icon name="location-outline" size={12} color='black' /></AppText>
              <AppText variant="caption" className="text-slate-600 dark:text-slate-400 font-medium">
                {item.city ? `${item.city}${item.location ? `, ${item.location}` : ''}` : 'Indonesia'}
              </AppText>
            </View>
            <View className="flex-row items-center gap-1">
              <AppText className="text-sm"><Icon name="time-outline" size={12} color='black' /></AppText>
              <AppText variant="caption" className="text-slate-500">
                {item.created_at ? new Date(item.created_at).toLocaleDateString('id-ID') : 'Baru saja'}
              </AppText>
            </View>
          </View>
        </View>

        {/* Desired Items Box (PRD Feature: Kriteria Barter yang Diinginkan Pemilik) */}
        <View className="m-4 bg-emerald-50 dark:bg-emerald-950/40 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800">
          <View className="flex-row items-center gap-2 mb-1.5">
            {/* <AppText className="text-xl">🔄</AppText> */}
            <AppText variant="h3" className="font-bold text-emerald-900 dark:text-emerald-100 text-base">
              Kriteria Barter yang Dicari Pemilik
            </AppText>
          </View>
          <AppText className="text-emerald-800 dark:text-emerald-200 text-sm leading-5">
            {item.desired_items || 'Pemilik terbuka untuk berbagai jenis penawaran barang yang sepadan nilainya.'}
          </AppText>
        </View>

        {/* Description Section */}
        <View className="bg-white dark:bg-slate-800 p-5 mb-4 border-y border-slate-100 dark:border-slate-800">
          <AppText variant="h3" className="font-bold text-slate-900 dark:text-white mb-2">
            Deskripsi Barang
          </AppText>
          <AppText className="text-slate-700 dark:text-slate-300 text-sm leading-6">
            {item.description}
          </AppText>
        </View>

        {/* Owner Profile Card */}
        {item.user && (
          <View className="mx-4 p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
            <AppText variant="caption" className="text-slate-400 font-bold mb-3 uppercase tracking-wider">
              Pemilik Barang
            </AppText>
            <View className="flex-row items-center gap-3">
              <Avatar
                name={item.user.name}
                url={item.user.avatar_url || undefined}
                size="md"
              />
              <View className="flex-1">
                <View className="flex-row items-center gap-1.5">
                  <AppText variant="label" className="font-bold text-slate-900 dark:text-white">
                    {item.user.name}
                  </AppText>
                  {item.user.is_vip && <Badge variant="warning" text="VIP" />}
                </View>
                <AppText variant="caption" className="text-slate-500 mt-0.5 flex flex-row items-center ">
                  <Icon name="location-outline" size={12} color="black" />
                  <Text className='text-center'>
                    {item.user.city || item.city || 'Domisili belum diatur'}
                  </Text>
                </AppText>
              </View>
            </View>
          </View>
        )}
        {/* Promotional & Commercial Banners */}
              {banners.length > 0 && (
                <BannerCarousel data={banners} />
              )}
      </ScrollView>

      {/* Floating Bottom Action Bar with Prominent "Ajukan Barter" Button (PRD Requirement) */}
      <View className="absolute bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 border-t border-slate-200 dark:border-slate-800 px-5 py-3 shadow-lg">
        {isOwner ? (
          <View className="py-1">
            <AppText variant="caption" className="text-slate-500 font-medium mb-2 text-center">
              ✨ Ini adalah barang barter yang Anda unggah {item.is_boosted ? '• (⚡ Sedang Di-Boost)' : ''}
            </AppText>
            <View className="flex-row gap-2">
              <View className="flex-1">
                <Button
                  title="⚡ Boost Barang"
                  variant="primary"
                  size="md"
                  className="bg-amber-500 active:bg-amber-600"
                  onPress={() => router.push({ pathname: '/monetization/boost', params: { item_id: item.id.toString() } })}
                />
              </View>
              <View className="flex-1">
                <Button
                  title="Lihat di Tukaranku"
                  variant="secondary"
                  size="md"
                  onPress={() => router.push('/(tabs)/tukaranku')}
                />
              </View>
            </View>
          </View>
        ) : (
          <View className="flex-row items-center gap-3">
            <View className="flex-1">
              <Button
                title="Ajukan Barter"
                variant="primary"
                size="lg"
                className="w-full bg-brand-600 shadow-md py-3.5"
                onPress={handleBarterPress}
              />
            </View>
          </View>
        )}
      </View>

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
                  <AppText variant="h3" className="font-bold text-slate-900">🚩 Laporkan Barang</AppText>
                  <AppText variant="caption" className="text-slate-500 mt-0.5" numberOfLines={1}>{item?.title}</AppText>
                </View>
                <TouchableOpacity onPress={() => setReportModalVisible(false)} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}>
                  <AppText className="text-slate-500 font-bold text-sm">✕</AppText>
                </TouchableOpacity>
              </View>

              {/* Alasan Laporan */}
              <AppText variant="label" className="mb-2 text-slate-700">Alasan Laporan *</AppText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {[
                  { value: 'penipuan', label: '🚨 Penipuan' },
                  { value: 'barang_terlarang', label: '🚫 Barang Terlarang' },
                  { value: 'deskripsi_palsu', label: '📝 Deskripsi Palsu' },
                  { value: 'pelecehan', label: '😡 Pelecehan/Spam' },
                  { value: 'lainnya', label: '❓ Lainnya' },
                ].map((opt) => (
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
                  placeholder="Ceritakan kronologi kejadian secara singkat (min. 10 karakter)..."
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
              <AppText variant="label" className="mb-2 text-slate-700">Bukti Foto (Opsional)</AppText>
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
                  <AppText variant="caption" className="text-slate-400 mt-1">Lampirkan screenshot sebagai bukti</AppText>
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

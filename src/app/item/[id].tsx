import React, { useState, useEffect } from 'react';
import { View, ScrollView, Image, TouchableOpacity, ActivityIndicator, Alert, Dimensions, Share, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText, Button, Badge, Avatar, Icon } from '@/components/atoms';
import { useAuth } from '@/context/AuthContext';
import { itemService, BarterItem } from '@/services/itemService';

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  const [item, setItem] = useState<BarterItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const screenWidth = Dimensions.get('window').width;

  const fetchItemDetail = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await itemService.getItemDetail(parseInt(id, 10));
      setItem(data);
    } catch (e: any) {
      Alert.alert('Gagal Memuat', e.message || 'Barang tidak ditemukan atau sudah tidak aktif.', [
        { text: 'Kembali', onPress: () => router.back() },
      ]);
    } finally {
      setLoading(false);
    }
  };

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
          <AppText className="text-xl font-bold">‹</AppText>
        </TouchableOpacity>

        <AppText variant="label" className="font-bold text-slate-800 dark:text-white" numberOfLines={1}>
          Detail Barang Barter
        </AppText>

        <TouchableOpacity
          onPress={handleShare}
          className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center"
        >
          <AppText className="text-lg">📤</AppText>
        </TouchableOpacity>
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
              <AppText className="text-6xl mb-2">📦</AppText>
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
    </SafeAreaView>
  );
}

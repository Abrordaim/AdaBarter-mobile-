import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, Image, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { MainTemplate } from '@/components/templates';
import { AppText, Button, Input, Icon, Badge } from '@/components/atoms';
import { useAuth } from '@/context/AuthContext';
import { itemService } from '@/services/itemService';
import { categoryService, Category } from '@/services/categoryService';

const CONDITIONS = [
  { id: 'baru', label: 'Baru', desc: 'Barang gres belum pernah dipakai' },
  { id: 'bekas_seperti_baru', label: 'Seperti Baru', desc: 'Mulus 95-99% tanpa cacat' },
  { id: 'bekas_baik', label: 'Kondisi Baik', desc: 'Fungsi normal, ada bekas pakai minor' },
  { id: 'bekas_layak_pakai', label: 'Layak Pakai', desc: 'Fungsi normal, tanda pemakaian terlihat' },
];

export default function AddItemScreen() {
  const router = useRouter();
  const { user, isAuthenticated, refreshUser } = useAuth();

  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [condition, setCondition] = useState('bekas_baik');
  const [desiredItems, setDesiredItems] = useState('');
  const [estimatedPrice, setEstimatedPrice] = useState('');
  const [city, setCity] = useState(user?.city || '');
  const [location, setLocation] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [imageAssets, setImageAssets] = useState<ImagePicker.ImagePickerAsset[]>([]);

  const [loading, setLoading] = useState(false);
  const [fetchingCategories, setFetchingCategories] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (user?.city && !city) {
      setCity(user.city);
    }
  }, [user]);

  const fetchCategories = async () => {
    setFetchingCategories(true);
    try {
      const data = await categoryService.getCategories();
      setCategories(data);
      if (data.length > 0 && !selectedCategory) {
        setSelectedCategory(data[0].id);
      }
    } catch (e) {
      console.log('Failed to fetch categories:', e);
    } finally {
      setFetchingCategories(false);
    }
  };

  const pickImages = async () => {
    if (images.length >= 5) {
      Alert.alert('Batas Foto', 'Maksimal 5 foto per barang.');
      return;
    }

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Izin Ditolak', 'Aplikasi membutuhkan izin akses galeri untuk mengunggah foto.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images' as any,
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: 5 - images.length,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newUris = result.assets.map((asset) => asset.uri);
        setImages((prev) => [...prev, ...newUris].slice(0, 5));
        // Store full asset info for upload
        setImageAssets((prev) => [...prev, ...result.assets].slice(0, 5));
      }
    } catch (e: any) {
      console.log('Error picking images:', e);
      Alert.alert('Gagal Memilih Foto', e.message || 'Terjadi kesalahan saat membuka galeri.');
    }
  };

  const removeImage = (indexToRemove: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
    setImageAssets((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Perhatian', 'Nama barang wajib diisi.');
      return;
    }

    if (!selectedCategory) {
      Alert.alert('Perhatian', 'Pilih salah satu kategori barang.');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Perhatian', 'Deskripsi barang wajib diisi.');
      return;
    }

    if (imageAssets.length === 0) {
      Alert.alert('Foto Barang Wajib', 'Unggah minimal 1 foto barang yang ingin Anda barter.');
      return;
    }

    setLoading(true);
    try {
      await itemService.createItem(
        {
          category_id: selectedCategory,
          title: title.trim(),
          description: description.trim(),
          condition,
          desired_items: desiredItems.trim() || undefined,
          estimated_price: estimatedPrice ? parseFloat(estimatedPrice.replace(/[^0-9]/g, '')) : undefined,
          city: city.trim() || undefined,
          location: location.trim() || undefined,
        },
        imageAssets
      );

      await refreshUser();

      Alert.alert(
        'Barang Berhasil Diunggah! 🎉',
        'Barang Anda kini telah tayang di etalase barter dan dapat ditemukan oleh pengguna lain di sekitar Anda.',
        [
          {
            text: 'Lihat di Beranda',
            onPress: () => {
              // Reset form
              setTitle('');
              setDescription('');
              setDesiredItems('');
              setEstimatedPrice('');
              setLocation('');
              setImages([]);
              setImageAssets([]);
              router.replace('/(tabs)');
            },
          },
        ]
      );
    } catch (e: any) {
      const msg = e.errors?.quota?.[0] || e.message || 'Gagal mengunggah barang.';
      Alert.alert('Gagal Mengunggah', msg);
    } finally {
      setLoading(false);
    }
  };

  // If not authenticated, prompt to login
  if (!isAuthenticated) {
    return (
      <MainTemplate title="Upload Barang">
        <View className="px-6 py-12 items-center justify-center">
          <View className="w-20 h-20 bg-brand-100 dark:bg-brand-900/30 rounded-full items-center justify-center mb-6">
            <AppText className="text-4xl">📦</AppText>
          </View>
          <AppText variant="h2" className="text-center font-bold mb-2 text-slate-800 dark:text-white">
            Masuk untuk Mengunggah
          </AppText>
          <AppText variant="body" className="text-center text-slate-600 dark:text-slate-400 mb-8 px-4">
            Anda perlu masuk ke akun terlebih dahulu untuk mengunggah barang dan memulai pertukaran.
          </AppText>
          <View className="w-full gap-3">
            <Button
              title="Masuk ke Akun"
              variant="primary"
              size="lg"
              onPress={() => router.push('/(auth)/login')}
            />
          </View>
        </View>
      </MainTemplate>
    );
  }

  const remainingQuota = user?.remaining_quota ?? 0;
  const isVip = user?.is_vip ?? false;
  const canPost = user?.can_post ?? true;

  return (
    <MainTemplate title="Upload Barang Barter">
      <View className="px-4 py-4">
        {/* Quota Notice Banner */}
        <View className={`p-4 rounded-xl border mb-5 ${
          !canPost && !isVip
            ? 'bg-amber-50 dark:bg-amber-950 border-amber-300 dark:border-amber-800'
            : 'bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800'
        }`}>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <AppText className="text-lg">{canPost || isVip ? '✨' : '⚠️'}</AppText>
              <AppText variant="label" className={canPost || isVip ? 'text-emerald-900 dark:text-emerald-200 font-bold' : 'text-amber-900 dark:text-amber-200 font-bold'}>
                {isVip
                  ? 'VIP: Kuota Posting Tanpa Batas'
                  : `Sisa Kuota Posting: ${remainingQuota} barang aktif`}
              </AppText>
            </View>
            {!canPost && !isVip && (
              <TouchableOpacity
                onPress={() => router.push('/(tabs)/profile')}
                className="bg-amber-600 px-3 py-1 rounded-full"
              >
                <AppText className="text-xs text-white font-bold">Klaim Kuota</AppText>
              </TouchableOpacity>
            )}
          </View>
          {!canPost && !isVip && (
            <AppText variant="caption" className="text-amber-800 dark:text-amber-300 mt-2">
              Batas kuota posting gratis Anda (3 barang) telah terpenuhi. Silakan klaim voucher di menu Akunku untuk menambah kuota.
            </AppText>
          )}
        </View>

        {/* Section 1: Photos */}
        <View className="mb-6">
          <AppText variant="label" className="mb-2 text-slate-800 dark:text-white font-bold">
            Foto Barang (Maksimal 5 foto) <AppText className="text-red-500">*</AppText>
          </AppText>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-3">
            {/* Add Photo Button */}
            {images.length < 5 && (
              <TouchableOpacity
                onPress={pickImages}
                className="w-24 h-24 rounded-xl border-2 border-dashed border-brand-500 bg-brand-50/50 dark:bg-slate-800 items-center justify-center"
              >
                <Icon name="plus-circle" size={28} color="#059669" />
                <AppText variant="caption" className="text-brand-600 font-medium mt-1">
                  Tambah Foto
                </AppText>
              </TouchableOpacity>
            )}

            {/* Photo Previews */}
            {images.map((uri, index) => (
              <View key={index} className="relative w-24 h-24 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                <Image source={{ uri }} className="w-full h-full" resizeMode="cover" />
                {index === 0 && (
                  <View className="absolute bottom-0 left-0 right-0 bg-brand-600/80 py-0.5 items-center">
                    <AppText className="text-[10px] text-white font-bold">Utama</AppText>
                  </View>
                )}
                <TouchableOpacity
                  onPress={() => removeImage(index)}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-600 items-center justify-center shadow-sm"
                >
                  <AppText className="text-white text-xs font-bold leading-none">✕</AppText>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Section 2: Basic Info */}
        <View className="mb-4">
          <Input
            label="Nama Barang *"
            placeholder="Contoh: Sepeda Lipat Polygon Urbano 3"
            value={title}
            onChangeText={setTitle}
          />
        </View>

        {/* Category Selector */}
        <View className="mb-5">
          <AppText variant="label" className="mb-2 text-slate-700 dark:text-slate-300">
            Kategori Barang *
          </AppText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => setSelectedCategory(cat.id)}
                  className={`px-4 py-2 rounded-xl flex-row items-center gap-1.5 border ${
                    isSelected
                      ? 'bg-brand-600 border-brand-600'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {cat.icon && <AppText className="text-sm">{cat.icon}</AppText>}
                  <AppText
                    className={`text-sm font-medium ${
                      isSelected ? 'text-white font-bold' : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {cat.name}
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Condition Selector */}
        <View className="mb-5">
          <AppText variant="label" className="mb-2 text-slate-700 dark:text-slate-300">
            Kondisi Barang *
          </AppText>
          <View className="gap-2">
            {CONDITIONS.map((cond) => {
              const isSelected = condition === cond.id;
              return (
                <TouchableOpacity
                  key={cond.id}
                  onPress={() => setCondition(cond.id)}
                  className={`p-3 rounded-xl border flex-row items-center justify-between ${
                    isSelected
                      ? 'bg-brand-50 dark:bg-brand-950 border-brand-600'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <View>
                    <AppText className={`font-semibold ${isSelected ? 'text-brand-700 dark:text-brand-300' : 'text-slate-800 dark:text-slate-200'}`}>
                      {cond.label}
                    </AppText>
                    <AppText variant="caption" className="text-slate-500 dark:text-slate-400">
                      {cond.desc}
                    </AppText>
                  </View>
                  <View
                    className={`w-5 h-5 rounded-full border-2 items-center justify-center ${
                      isSelected ? 'border-brand-600 bg-brand-600' : 'border-slate-400'
                    }`}
                  >
                    {isSelected && <View className="w-2 h-2 rounded-full bg-white" />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Section 3: Barter Preferences & Valuation */}
        <View className="mb-4">
          <Input
            label="Barang yang Diinginkan (Kriteria Tukar)"
            placeholder="Contoh: Gitar akustik, smartphone Android sekelas, atau drone"
            value={desiredItems}
            onChangeText={setDesiredItems}
            multiline
            numberOfLines={2}
          />
        </View>

        <View className="mb-4">
          <Input
            label="Estimasi Nilai Barang (Opsional, untuk acuan Tukar Tambah)"
            placeholder="Contoh: 1500000"
            value={estimatedPrice}
            onChangeText={setEstimatedPrice}
            keyboardType="numeric"
          />
        </View>

        {/* Section 4: Location (Hyperlocal) */}
        <View className="flex-row gap-3 mb-4">
          <View className="flex-1">
            <Input
              label="Kota Domisili *"
              placeholder="Contoh: Surabaya"
              value={city}
              onChangeText={setCity}
            />
          </View>
          <View className="flex-1">
            <Input
              label="Area / Kecamatan"
              placeholder="Contoh: Gubeng"
              value={location}
              onChangeText={setLocation}
            />
          </View>
        </View>

        {/* Section 5: Description */}
        <View className="mb-6">
          <Input
            label="Deskripsi Lengkap Barang *"
            placeholder="Jelaskan spesifikasi, kelengkapan (box, charger, dll), dan riwayat pemakaian barang secara jujur..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Submit Button */}
        <View className="mb-10">
          <Button
            title={canPost || isVip ? "Unggah Barang ke Etalase" : "Kuota Habis — Klaim Voucher"}
            variant="primary"
            size="lg"
            loading={loading}
            disabled={!canPost && !isVip}
            onPress={handleSubmit}
          />
        </View>
      </View>
    </MainTemplate>
  );
}

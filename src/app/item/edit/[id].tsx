import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { MainTemplate } from '@/components/templates';
import { AppText, Button, Input, Icon } from '@/components/atoms';
import { useAuth } from '@/context/AuthContext';
import { itemService, BarterItem } from '@/services/itemService';
import { categoryService, Category } from '@/services/categoryService';
import { API_BASE_URL } from '@/services/api';

const CONDITIONS = [
  { id: 'baru', label: 'Baru', desc: 'Barang gres belum pernah dipakai' },
  { id: 'bekas_seperti_baru', label: 'Seperti Baru', desc: 'Mulus 95-99% tanpa cacat' },
  { id: 'bekas_baik', label: 'Kondisi Baik', desc: 'Fungsi normal, ada bekas pakai minor' },
  { id: 'bekas_layak_pakai', label: 'Layak Pakai', desc: 'Fungsi normal, tanda pemakaian terlihat' },
];

export default function EditItemScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const rawId = Array.isArray(params.id) ? params.id[0] : params.id;
  const itemId = parseInt(rawId || '0', 10);
  const { refreshUser } = useAuth();

  const [item, setItem] = useState<BarterItem | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [fetchingData, setFetchingData] = useState(true);

  // Form fields
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [condition, setCondition] = useState('bekas_baik');
  const [desiredItems, setDesiredItems] = useState('');
  const [estimatedPrice, setEstimatedPrice] = useState('');
  const [city, setCity] = useState('');
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  // New images to add
  const [newImageAssets, setNewImageAssets] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [itemId]);

  const loadData = async () => {
    if (!itemId) return;
    setFetchingData(true);
    try {
      const [itemData, cats] = await Promise.all([
        itemService.getItemDetail(itemId),
        categoryService.getCategories(),
      ]);
      setItem(itemData);
      setCategories(cats);

      setTitle(itemData.title);
      setDescription(itemData.description);
      setCondition(itemData.condition);
      setDesiredItems(itemData.desired_items || '');
      setEstimatedPrice(itemData.estimated_price ? itemData.estimated_price.toString() : '');
      setCity(itemData.city || '');
      setLocation(itemData.location || '');
      setStatus(itemData.status === 'inactive' ? 'inactive' : 'active');
      setSelectedCategory(itemData.category?.id ?? null);
    } catch (e: any) {
      Alert.alert('Gagal', 'Tidak dapat memuat data barang.');
      router.back();
    } finally {
      setFetchingData(false);
    }
  };

  const pickNewImages = async () => {
    if (newImageAssets.length >= 5) {
      Alert.alert('Batas Foto', 'Maksimal 5 foto baru per pengeditan.');
      return;
    }
    try {
      const { status: permStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permStatus !== 'granted') {
        Alert.alert('Izin Ditolak', 'Aplikasi membutuhkan izin akses galeri.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images' as any,
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: 5 - newImageAssets.length,
      });
      if (!result.canceled && result.assets.length > 0) {
        setNewImageAssets((prev) => [...prev, ...result.assets].slice(0, 5));
      }
    } catch (e: any) {
      Alert.alert('Gagal Memilih Foto', e.message || 'Terjadi kesalahan.');
    }
  };

  const removeNewImage = (index: number) => {
    setNewImageAssets((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Perhatian', 'Nama barang wajib diisi.');
      return;
    }
    if (!selectedCategory) {
      Alert.alert('Perhatian', 'Pilih kategori barang.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Perhatian', 'Deskripsi barang wajib diisi.');
      return;
    }

    setLoading(true);
    try {
      await itemService.updateItem(
        itemId,
        {
          category_id: selectedCategory,
          title: title.trim(),
          description: description.trim(),
          condition,
          desired_items: desiredItems.trim() || undefined,
          estimated_price: estimatedPrice ? parseFloat(estimatedPrice.replace(/[^0-9]/g, '')) : undefined,
          city: city.trim() || undefined,
          location: location.trim() || undefined,
          status,
        },
        newImageAssets
      );

      await refreshUser();

      Alert.alert('Berhasil!', 'Informasi barang berhasil diperbarui.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert('Gagal Menyimpan', e.message || 'Gagal memperbarui barang.');
    } finally {
      setLoading(false);
    }
  };

  if (fetchingData) {
    return (
      <MainTemplate title="Edit Barang">
        <View className="flex-1 items-center justify-center py-20">
          <ActivityIndicator size="large" color="#059669" />
          <AppText variant="caption" className="text-slate-500 mt-3">Memuat data barang...</AppText>
        </View>
      </MainTemplate>
    );
  }

  return (
    <MainTemplate title="Edit Barang">
      <ScrollView className="px-4 py-4" showsVerticalScrollIndicator={false}>

        {/* Foto Saat Ini */}
        {item && item.images && item.images.length > 0 && (
          <View className="mb-5">
            <AppText variant="label" className="font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Foto Saat Ini
            </AppText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-2">
                {item.images.map((img, i) => {
                  const imageUrl = img.startsWith('http')
                    ? img
                    : `${API_BASE_URL.replace('/api', '')}/storage/${img}`;
                  return (
                    <Image
                      key={i}
                      source={{ uri: imageUrl }}
                      style={{ width: 96, height: 96, borderRadius: 12, backgroundColor: '#e2e8f0' }}
                      resizeMode="cover"
                    />
                  );
                })}
              </View>
            </ScrollView>
            <AppText variant="caption" className="text-slate-500 mt-1">
              Foto lama tetap tersimpan. Tambah foto baru di bawah jika diperlukan.
            </AppText>
          </View>
        )}

        {/* Tambah Foto Baru */}
        <View className="mb-5">
          <AppText variant="label" className="font-semibold text-slate-700 dark:text-slate-300 mb-2">
            Tambah Foto Baru <AppText className="text-slate-400">(Opsional)</AppText>
          </AppText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-2">
              {newImageAssets.map((asset, index) => (
                <View key={index} className="relative">
                  <Image
                    source={{ uri: asset.uri }}
                    style={{ width: 96, height: 96, borderRadius: 12, backgroundColor: '#e2e8f0' }}
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    onPress={() => removeNewImage(index)}
                    style={{
                      position: 'absolute', top: -8, right: -8,
                      width: 24, height: 24, borderRadius: 12,
                      backgroundColor: '#ef4444',
                      alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <AppText className="text-white text-xs font-bold">✕</AppText>
                  </TouchableOpacity>
                </View>
              ))}
              {newImageAssets.length < 5 && (
                <TouchableOpacity
                  onPress={pickNewImages}
                  style={{
                    width: 96, height: 96, borderRadius: 12,
                    borderWidth: 2, borderStyle: 'dashed', borderColor: '#059669',
                    backgroundColor: '#ecfdf5',
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Icon name="add" size={28} color="#059669" />
                  <AppText variant="caption" className="text-brand-600 text-[10px] mt-0.5 text-center">
                    Tambah Foto
                  </AppText>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </View>

        {/* Kategori */}
        <View className="mb-4">
          <AppText variant="label" className="font-semibold text-slate-700 dark:text-slate-300 mb-2">
            Kategori <AppText className="text-red-500">*</AppText>
          </AppText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-2">
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => setSelectedCategory(cat.id)}
                  className={`px-4 py-2 rounded-full border ${
                    selectedCategory === cat.id
                      ? 'bg-brand-600 border-brand-600'
                      : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600'
                  }`}
                >
                  <AppText
                    variant="caption"
                    className={selectedCategory === cat.id
                      ? 'text-white font-bold'
                      : 'text-slate-700 dark:text-slate-300'}
                  >
                    {cat.name}
                  </AppText>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Nama Barang */}
        <View className="mb-4">
          <Input
            label="Nama Barang"
            placeholder="Contoh: Sepeda gunung Polygon Xtrada 5"
            value={title}
            onChangeText={setTitle}
            maxLength={255}
          />
        </View>

        {/* Deskripsi */}
        <View className="mb-4">
          <Input
            label="Deskripsi Barang"
            placeholder="Ceritakan kondisi detail, kelengkapan, dan keistimewaan barang Anda..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Kondisi */}
        <View className="mb-4">
          <AppText variant="label" className="font-semibold text-slate-700 dark:text-slate-300 mb-2">
            Kondisi Barang <AppText className="text-red-500">*</AppText>
          </AppText>
          <View className="gap-2">
            {CONDITIONS.map((c) => (
              <TouchableOpacity
                key={c.id}
                onPress={() => setCondition(c.id)}
                className={`p-3 rounded-xl border ${
                  condition === c.id
                    ? 'bg-brand-50 dark:bg-brand-950/30 border-brand-500'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                }`}
              >
                <AppText
                  className={`font-semibold text-sm ${
                    condition === c.id
                      ? 'text-brand-700 dark:text-brand-300'
                      : 'text-slate-800 dark:text-slate-200'
                  }`}
                >
                  {c.label}
                </AppText>
                <AppText variant="caption" className="text-slate-500 mt-0.5">{c.desc}</AppText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Status */}
        <View className="mb-4">
          <AppText variant="label" className="font-semibold text-slate-700 dark:text-slate-300 mb-2">
            Status Barang
          </AppText>
          <View className="flex-row gap-3">
            {(['active', 'inactive'] as const).map((s) => (
              <TouchableOpacity
                key={s}
                onPress={() => setStatus(s)}
                className={`flex-1 py-3 rounded-xl border items-center ${
                  status === s
                    ? s === 'active'
                      ? 'bg-brand-600 border-brand-600'
                      : 'bg-slate-500 border-slate-500'
                    : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600'
                }`}
              >
                <AppText
                  className={`font-semibold text-sm ${
                    status === s ? 'text-white' : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {s === 'active' ? 'Aktif' : 'Nonaktif'}
                </AppText>
                <AppText
                  variant="caption"
                  className={`${status === s ? 'text-white' : 'text-slate-500'} text-[10px]`}
                >
                  {s === 'active' ? 'Tampil di etalase' : 'Sembunyikan sementara'}
                </AppText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Barang Diinginkan */}
        <View className="mb-4">
          <Input
            label="Barang yang Diinginkan (Opsional)"
            placeholder="Contoh: Laptop gaming, kamera mirrorless..."
            value={desiredItems}
            onChangeText={setDesiredItems}
            multiline
            numberOfLines={2}
          />
        </View>

        {/* Estimasi Harga */}
        <View className="mb-4">
          <Input
            label="Estimasi Nilai Barang (Opsional)"
            placeholder="Contoh: 1500000"
            value={estimatedPrice}
            onChangeText={setEstimatedPrice}
            keyboardType="numeric"
          />
        </View>

        {/* Kota */}
        <View className="mb-4">
          <Input
            label="Kota "
            placeholder="Contoh: Jakarta Selatan"
            value={city}
            onChangeText={setCity}
          />
        </View>

        {/* Lokasi */}
        <View className="mb-6">
          <Input
            label="Lokasi Detail (Opsional)"
            placeholder="Contoh: Kebayoran Baru, Jakarta Selatan"
            value={location}
            onChangeText={setLocation}
          />
        </View>

        {/* Action Buttons */}
        <View className="flex-row gap-3 mb-8">
          <View className="flex-1">
            <Button
              title="Batal"
              variant="secondary"
              onPress={() => router.back()}
              disabled={loading}
            />
          </View>
          <View className="flex-1">
            <Button
              title="Simpan"
              variant="primary"
              loading={loading}
              onPress={handleSave}
            />
          </View>
        </View>
      </ScrollView>
    </MainTemplate>
  );
}

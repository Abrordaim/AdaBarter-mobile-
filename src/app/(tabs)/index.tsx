import React, { useState, useEffect, useCallback } from 'react';
import { View, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { MainTemplate } from '@/components/templates';
import { AppText, Button, Icon, Badge, } from '@/components/atoms';
import { SearchBar, ItemCard } from '@/components/molecules';
import { BannerCarousel, FilterBar } from '@/components/organisms';
import { useAuth } from '@/context/AuthContext';
import { itemService, BarterItem } from '@/services/itemService';
import { categoryService, Category } from '@/services/categoryService';
import { bannerService, Banner } from '@/services/bannerService';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [items, setItems] = useState<BarterItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedCondition, setSelectedCondition] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);

  // Hyperlocal City Picker Modal
  const [cityModalVisible, setCityModalVisible] = useState(false);
  const [cityInput, setCityInput] = useState('');

  const fetchItems = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const response = await itemService.getItems({
        search: searchQuery.trim() || undefined,
        category_id: selectedCategoryId || undefined,
        condition: selectedCondition || undefined,
        city: selectedCity || undefined,
        per_page: 20,
      });
      setItems(response.items || []);
    } catch (e: any) {
      console.log('Error fetching items:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchInitialData = async () => {
    try {
      const [cats, bans] = await Promise.all([
        categoryService.getCategories().catch(() => []),
        bannerService.getBanners('home_top').catch(() => []),
      ]);
      setCategories(cats);
      setBanners(bans);
    } catch (e) {
      console.log('Error fetching initial data:', e);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchItems();
  }, [searchQuery, selectedCategoryId, selectedCondition, selectedCity]);

  const handleRefresh = () => {
    fetchInitialData();
    fetchItems(true);
  };

  const handleClearFilters = () => {
    setSelectedCategoryId(null);
    setSelectedCondition(null);
    setSelectedCity(null);
    setSearchQuery('');
  };

  const handleApplyCity = () => {
    if (cityInput.trim()) {
      setSelectedCity(cityInput.trim());
    } else {
      setSelectedCity(null);
    }
    setCityModalVisible(false);
  };

  return (
    <MainTemplate
      title="AdaBarter"
      onRefresh={handleRefresh}
      refreshing={refreshing}
      headerContent={
        <View className="bg-brand-600 px-4 pt-3 pb-4 shadow-sm">
          {/* Top Brand Bar */}
          <View className="flex-row items-center justify-between mb-3">
            <View>
              <View className="flex-row items-center gap-1.5">
                {/* <AppText className="text-xl">🔄</AppText> */}
                <AppText variant="h2" className="text-white font-extrabold tracking-tight">
                  AdaBarter
                </AppText>
              </View>
              <AppText className="text-emerald-100 text-xs mt-0.5">
                Tukar Barang Layak Pakai Tanpa Uang
              </AppText>
            </View>

            {/* Hyperlocal Location Pill */}
            <TouchableOpacity
              onPress={() => {
                setCityInput(selectedCity || '');
                setCityModalVisible(true);
              }}
              className="bg-emerald-700/80 border border-emerald-500/60 px-3 py-1.5 rounded-full flex-row items-center gap-1"
            >
              {/* <AppText className="text-xs">📍</AppText> */}
              <AppText className="text-xs text-white font-bold" numberOfLines={1}>
                {selectedCity || user?.city || 'Semua Kota'}
              </AppText>
              <AppText className="text-[10px] text-emerald-200">▾</AppText>
            </TouchableOpacity>
          </View>

          {/* Active Search Mode */}
          <SearchBar
            placeholder="Cari barang, merek, atau barang impian..."
            onSearch={(text) => setSearchQuery(text)}
          />
        </View>
      }
    >
      {/* Promotional & Commercial Banners */}
      {banners.length > 0 && (
        <BannerCarousel data={banners} />
      )}

      {/* Categories & Filter Chips (Passive Search Mode) */}
      <FilterBar
        categories={categories}
        selectedCategoryId={selectedCategoryId}
        onSelectCategory={setSelectedCategoryId}
        selectedCondition={selectedCondition}
        onSelectCondition={setSelectedCondition}
        selectedCity={selectedCity}
        onClearFilters={handleClearFilters}
        className="mt-2"
      />

      {/* Catalog Feed Title & Stats */}
      <View className="px-4 flex-row items-center justify-between mb-3">
        <View className="flex-row items-center gap-2">
          <AppText variant="h3" className="font-bold text-slate-900 dark:text-white">
            Katalog Barter Terbaru
          </AppText>
          <View className="bg-brand-100 dark:bg-brand-950 px-2 py-0.5 rounded-full">
            <AppText className="text-xs text-brand-700 dark:text-brand-300 font-bold">
              {items.length} Barang
            </AppText>
          </View>
        </View>

        {selectedCity && (
          <TouchableOpacity onPress={() => setSelectedCity(null)}>
            <AppText variant="caption" className="text-brand-600 font-medium">
              Lihat Nasional
            </AppText>
          </TouchableOpacity>
        )}
      </View>

      {/* Loading Indicator */}
      {loading ? (
        <View className="py-20 items-center justify-center">
          <ActivityIndicator size="large" color="#059669" />
          <AppText variant="caption" className="text-slate-500 mt-3">
            Memuat katalog barter...
          </AppText>
        </View>
      ) : items.length === 0 ? (
        /* Empty State */
        <View className="py-16 px-6 items-center justify-center">
          <View className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full items-center justify-center mb-4">
            <AppText className="text-3xl text-blue-700">
              <Icon name="search" size={24} color='black'/>
            </AppText>
          </View>
          <AppText variant="h3" className="text-center font-bold text-slate-800 dark:text-white mb-1">
            Tidak Ada Barang Ditemukan
          </AppText>
          <AppText variant="body" className="text-center text-slate-500 dark:text-slate-400 mb-6">
            {searchQuery || selectedCategoryId || selectedCondition || selectedCity
              ? 'Coba ganti kata kunci pencarian atau reset filter untuk melihat barang lainnya.'
              : 'Belum ada barang barter yang diunggah saat ini. Jadilah yang pertama mengunggah!'}
          </AppText>
          {(searchQuery || selectedCategoryId || selectedCondition || selectedCity) ? (
            <Button
              title="Reset Semua Filter"
              variant="secondary"
              onPress={handleClearFilters}
            />
          ) : (
            <Button
              title="Upload Barang Sekarang"
              variant="primary"
              onPress={() => router.push('/(tabs)/add-item')}
            />
          )}
        </View>
      ) : (
        /* 2-Column Responsive Items Grid */
        <View className="px-3 flex-row flex-wrap">
          {items.map((item) => (
            <View key={item.id} className="w-1/2 p-1.5">
              <ItemCard
                title={item.title}
                location={item.location}
                city={item.city}
                condition={item.condition}
                estimatedPrice={item.estimated_price}
                imageUrl={item.primary_image || item.images?.[0]}
                isBoosted={item.is_boosted}
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

      {/* Hyperlocal City Selection Modal */}
      <Modal
        visible={cityModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCityModalVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-center items-center px-6">
          <View className="bg-white dark:bg-slate-800 w-full p-6 rounded-3xl shadow-lg">
            <View className="items-center mb-4">
              <View className="w-12 h-12  dark:bg-emerald-950 rounded-full items-center justify-center mb-2">
                <AppText className="text-2xl"><Icon name={'location'} size={24} color={'green'}/></AppText>
              </View>
              <AppText variant="h3" className="font-bold text-center text-slate-900 dark:text-white">
                Filter Wilayah Lokal (COD)
              </AppText>
              <AppText variant="caption" className="text-center text-slate-500 dark:text-slate-400 mt-1">
                Barter lebih mudah dan aman dengan mencari barang di kota atau sekitar area tempat tinggalmu.
              </AppText>
            </View>

            <View className="border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-2.5 mb-4 bg-slate-50 dark:bg-slate-900">
              <TextInput
                placeholder="Ketik nama kota (misal: Surabaya, Jakarta)"
                placeholderTextColor="#94a3b8"
                value={cityInput}
                onChangeText={setCityInput}
                className="text-slate-900 dark:text-white font-medium text-base"
                autoFocus
              />
            </View>

            <View className="flex-row gap-3">
              <View className="flex-1">
                <Button
                  title="Semua Kota"
                  variant="secondary"
                  onPress={() => {
                    setSelectedCity(null);
                    setCityModalVisible(false);
                  }}
                />
              </View>
              <View className="flex-1">
                <Button
                  title="Terapkan"
                  variant="primary"
                  onPress={handleApplyCity}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </MainTemplate>
  );
}

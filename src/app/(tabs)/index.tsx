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
  const [cities, setCities] = useState<string[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [citySearch, setCitySearch] = useState('');

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

  const fetchCities = async () => {
    setCitiesLoading(true);
    try {
      const data = await itemService.getCities();
      setCities(data);
    } catch (e) {
      console.log('Error fetching cities:', e);
    } finally {
      setCitiesLoading(false);
    }
  };

  const openCityModal = () => {
    setCitySearch('');
    setCityModalVisible(true);
    fetchCities();
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
              onPress={openCityModal}
              className="bg-emerald-700/80 border border-emerald-500/60 px-3 py-1.5 rounded-full flex-row items-center gap-1"
            >
              <Icon name="location-outline" size={12} color="white" />
              <AppText className="text-xs text-white font-bold" numberOfLines={1}>
                {selectedCity || 'Semua Kota'}
              </AppText>
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

      {/* Hyperlocal City Selection Modal — Dynamic list from DB */}
      <Modal
        visible={cityModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCityModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%' }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
              <View>
                <AppText variant="h3" className="font-bold text-slate-900">Pilih Kota</AppText>
                <AppText variant="caption" className="text-slate-500 mt-0.5">Tampilkan barang barter dari kota tertentu</AppText>
              </View>
              <TouchableOpacity
                onPress={() => setCityModalVisible(false)}
                style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}
              >
                <AppText className="text-slate-500 font-bold text-sm">✕</AppText>
              </TouchableOpacity>
            </View>

            {/* Search box */}
            <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 }}>
                <Icon name="search-outline" size={16} color="#94a3b8" />
                <TextInput
                  value={citySearch}
                  onChangeText={setCitySearch}
                  placeholder="Cari nama kota..."
                  placeholderTextColor="#94a3b8"
                  style={{ flex: 1, marginLeft: 8, fontSize: 14, color: '#0f172a' }}
                />
                {citySearch.length > 0 && (
                  <TouchableOpacity onPress={() => setCitySearch('')}>
                    <AppText className="text-slate-400 text-sm font-bold">✕</AppText>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* "Semua Kota" option */}
            <TouchableOpacity
              onPress={() => { setSelectedCity(null); setCityModalVisible(false); }}
              style={{
                flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14,
                marginHorizontal: 16, marginBottom: 4, borderRadius: 12,
                backgroundColor: selectedCity === null ? '#ecfdf5' : '#f8fafc',
                borderWidth: 1,
                borderColor: selectedCity === null ? '#6ee7b7' : '#e2e8f0',
              }}
            >
              <Icon name="globe-outline" size={18} color={selectedCity === null ? '#059669' : '#94a3b8'} />
              <AppText style={{ marginLeft: 12, fontSize: 15, fontWeight: '600', color: selectedCity === null ? '#059669' : '#334155' }}>
                Semua Kota
              </AppText>
              {selectedCity === null && (
                <View style={{ marginLeft: 'auto' }}>
                  <Icon name="checkmark-circle" size={18} color="#059669" />
                </View>
              )}
            </TouchableOpacity>

            {/* City list */}
            {citiesLoading ? (
              <View style={{ paddingVertical: 32, alignItems: 'center' }}>
                <ActivityIndicator size="small" color="#059669" />
                <AppText variant="caption" className="text-slate-400 mt-2">Memuat daftar kota...</AppText>
              </View>
            ) : (
              <FlatList
                data={cities.filter(c => c.toLowerCase().includes(citySearch.toLowerCase()))}
                keyExtractor={(item) => item}
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32, paddingTop: 4 }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={
                  <View style={{ paddingVertical: 32, alignItems: 'center' }}>
                    <AppText className="text-slate-400 text-sm">
                      {citySearch ? `Tidak ada kota "${citySearch}" di katalog saat ini.` : 'Belum ada kota tersedia saat ini.'}
                    </AppText>
                  </View>
                }
                renderItem={({ item: cityName }) => {
                  const isSelected = selectedCity === cityName;
                  return (
                    <TouchableOpacity
                      onPress={() => { setSelectedCity(cityName); setCityModalVisible(false); }}
                      style={{
                        flexDirection: 'row', alignItems: 'center', paddingVertical: 13,
                        paddingHorizontal: 16, marginBottom: 6, borderRadius: 12,
                        backgroundColor: isSelected ? '#ecfdf5' : '#fff',
                        borderWidth: 1,
                        borderColor: isSelected ? '#6ee7b7' : '#e2e8f0',
                      }}
                    >
                      <Icon name="location-outline" size={16} color={isSelected ? '#059669' : '#94a3b8'} />
                      <AppText style={{ marginLeft: 10, fontSize: 14, fontWeight: isSelected ? '700' : '500', color: isSelected ? '#059669' : '#334155', flex: 1 }}>
                        {cityName}
                      </AppText>
                      {isSelected && <Icon name="checkmark-circle" size={18} color="#059669" />}
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>
    </MainTemplate>
  );
}

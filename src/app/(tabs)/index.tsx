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
import { regionService, Province, Regency } from '@/services/regionService';

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

  // Hierarchical Region filter states
  const [selectedProvinceId, setSelectedProvinceId] = useState<number | null>(null);
  const [selectedProvinceName, setSelectedProvinceName] = useState<string | null>(null);
  const [selectedRegencyId, setSelectedRegencyId] = useState<number | null>(null);
  const [selectedRegencyName, setSelectedRegencyName] = useState<string | null>(null);

  // Region Selection Modal states
  const [regionModalVisible, setRegionModalVisible] = useState(false);
  const [modalStep, setModalStep] = useState<'province' | 'regency'>('province');
  const [tempProvince, setTempProvince] = useState<Province | null>(null);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [regencies, setRegencies] = useState<Regency[]>([]);
  const [regionLoading, setRegionLoading] = useState(false);
  const [regionSearch, setRegionSearch] = useState('');

  const fetchItems = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const response = await itemService.getItems({
        search: searchQuery.trim() || undefined,
        category_id: selectedCategoryId || undefined,
        condition: selectedCondition || undefined,
        province_id: selectedProvinceId || undefined,
        regency_id: selectedRegencyId || undefined,
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

  const fetchProvinces = async () => {
    if (provinces.length > 0) return;
    setRegionLoading(true);
    try {
      const data = await regionService.getProvinces();
      setProvinces(data);
    } catch (e) {
      console.log('Error fetching provinces:', e);
    } finally {
      setRegionLoading(false);
    }
  };

  const fetchRegencies = async (provinceId: number) => {
    setRegionLoading(true);
    try {
      const data = await regionService.getRegencies(provinceId);
      setRegencies(data);
    } catch (e) {
      console.log('Error fetching regencies:', e);
    } finally {
      setRegionLoading(false);
    }
  };

  const openRegionModal = () => {
    setRegionSearch('');
    if (selectedProvinceId && selectedProvinceName) {
      setTempProvince({ id: selectedProvinceId, name: selectedProvinceName, code: '' });
      setModalStep('regency');
      fetchRegencies(selectedProvinceId);
    } else {
      setModalStep('province');
      fetchProvinces();
    }
    setRegionModalVisible(true);
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchItems();
  }, [searchQuery, selectedCategoryId, selectedCondition, selectedProvinceId, selectedRegencyId]);

  const handleRefresh = () => {
    fetchInitialData();
    fetchItems(true);
  };

  const handleClearFilters = () => {
    setSelectedCategoryId(null);
    setSelectedCondition(null);
    setSelectedProvinceId(null);
    setSelectedProvinceName(null);
    setSelectedRegencyId(null);
    setSelectedRegencyName(null);
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
              onPress={openRegionModal}
              className="bg-emerald-700/80 border border-emerald-500/60 px-3 py-1.5 rounded-full flex-row items-center gap-1 max-w-[150px]"
            >
              <Icon name="location-outline" size={12} color="white" />
              <AppText className="text-xs text-white font-bold" numberOfLines={1}>
                {selectedRegencyName || selectedProvinceName || 'Semua Wilayah'}
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
        selectedCity={selectedRegencyName || selectedProvinceName || null}
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

        {(selectedProvinceName || selectedRegencyName) && (
          <TouchableOpacity
            onPress={() => {
              setSelectedProvinceId(null);
              setSelectedProvinceName(null);
              setSelectedRegencyId(null);
              setSelectedRegencyName(null);
            }}
          >
            <AppText variant="caption" className="text-brand-600 font-medium">
              Lihat Nasional ({selectedRegencyName || selectedProvinceName} ✕)
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
              <Icon name="search" size={24} color='black' />
            </AppText>
          </View>
          <AppText variant="h3" className="text-center font-bold text-slate-800 dark:text-white mb-1">
            Tidak Ada Barang Ditemukan
          </AppText>
          <AppText variant="body" className="text-center text-slate-500 dark:text-slate-400 mb-6">
            {searchQuery || selectedCategoryId || selectedCondition || selectedRegencyName || selectedProvinceName
              ? 'Coba ganti kata kunci pencarian atau reset filter untuk melihat barang lainnya.'
              : 'Belum ada barang barter yang diunggah saat ini. Jadilah yang pertama mengunggah!'}
          </AppText>
          {(searchQuery || selectedCategoryId || selectedCondition || selectedRegencyName || selectedProvinceName) ? (
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
                city={item.regency_name || item.city}
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

      {/* Hyperlocal Region Selection Modal (Provinsi → Kabupaten/Kota) */}
      <Modal
        visible={regionModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setRegionModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '82%', minHeight: '55%' }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 18, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                {modalStep === 'regency' ? (
                  <TouchableOpacity
                    onPress={() => {
                      setModalStep('province');
                      setRegionSearch('');
                      fetchProvinces();
                    }}
                    style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}
                  >
                    <Icon name="arrow-back" size={16} color="#059669" />
                    <AppText style={{ fontSize: 13, color: '#059669', fontWeight: '600', marginLeft: 4 }}>
                      Kembali ke Provinsi
                    </AppText>
                  </TouchableOpacity>
                ) : null}
                <AppText variant="h3" className="font-bold text-slate-900">
                  {modalStep === 'province' ? 'Pilih Provinsi' : `Pilih Kab/Kota (${tempProvince?.name})`}
                </AppText>
                <AppText variant="caption" className="text-slate-500 mt-0.5">
                  {modalStep === 'province' ? 'Filter barang barter per wilayah provinsi' : 'Pilih kabupaten/kota atau tampilkan se-provinsi'}
                </AppText>
              </View>
              <TouchableOpacity
                onPress={() => setRegionModalVisible(false)}
                style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}
              >
                <AppText className="text-slate-500 font-bold text-sm">✕</AppText>
              </TouchableOpacity>
            </View>

            {/* Search box */}
            <View style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 }}>
                <Icon name="search-outline" size={16} color="#94a3b8" />
                <TextInput
                  value={regionSearch}
                  onChangeText={setRegionSearch}
                  placeholder={modalStep === 'province' ? 'Cari provinsi...' : 'Cari kabupaten / kota...'}
                  placeholderTextColor="#94a3b8"
                  style={{ flex: 1, marginLeft: 8, fontSize: 14, color: '#0f172a' }}
                />
                {regionSearch.length > 0 && (
                  <TouchableOpacity onPress={() => setRegionSearch('')}>
                    <AppText className="text-slate-400 text-sm font-bold">✕</AppText>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Top Option Button */}
            {modalStep === 'province' ? (
              /* "Semua Wilayah (Nasional)" */
              <TouchableOpacity
                onPress={() => {
                  setSelectedProvinceId(null);
                  setSelectedProvinceName(null);
                  setSelectedRegencyId(null);
                  setSelectedRegencyName(null);
                  setRegionModalVisible(false);
                }}
                style={{
                  flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 13,
                  marginHorizontal: 16, marginBottom: 8, borderRadius: 12,
                  backgroundColor: !selectedProvinceId ? '#ecfdf5' : '#f8fafc',
                  borderWidth: 1,
                  borderColor: !selectedProvinceId ? '#6ee7b7' : '#e2e8f0',
                }}
              >
                <Icon name="globe-outline" size={18} color={!selectedProvinceId ? '#059669' : '#94a3b8'} />
                <AppText style={{ marginLeft: 12, fontSize: 14, fontWeight: '600', color: !selectedProvinceId ? '#059669' : '#334155' }}>
                  Semua Wilayah (Nasional)
                </AppText>
                {!selectedProvinceId && (
                  <View style={{ marginLeft: 'auto' }}>
                    <Icon name="checkmark-circle" size={18} color="#059669" />
                  </View>
                )}
              </TouchableOpacity>
            ) : (
              /* "Semua di Provinsi [Nama]" */
              <TouchableOpacity
                onPress={() => {
                  if (tempProvince) {
                    setSelectedProvinceId(tempProvince.id);
                    setSelectedProvinceName(tempProvince.name);
                    setSelectedRegencyId(null);
                    setSelectedRegencyName(null);
                  }
                  setRegionModalVisible(false);
                }}
                style={{
                  flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 13,
                  marginHorizontal: 16, marginBottom: 8, borderRadius: 12,
                  backgroundColor: selectedProvinceId === tempProvince?.id && !selectedRegencyId ? '#ecfdf5' : '#f8fafc',
                  borderWidth: 1,
                  borderColor: selectedProvinceId === tempProvince?.id && !selectedRegencyId ? '#6ee7b7' : '#e2e8f0',
                }}
              >
                <Icon name="map-outline" size={18} color="#059669" />
                <AppText style={{ marginLeft: 12, fontSize: 14, fontWeight: '600', color: '#059669' }}>
                  Semua di {tempProvince?.name}
                </AppText>
                {selectedProvinceId === tempProvince?.id && !selectedRegencyId && (
                  <View style={{ marginLeft: 'auto' }}>
                    <Icon name="checkmark-circle" size={18} color="#059669" />
                  </View>
                )}
              </TouchableOpacity>
            )}

            {/* Content List */}
            {regionLoading ? (
              <View style={{ paddingVertical: 32, alignItems: 'center' }}>
                <ActivityIndicator size="small" color="#059669" />
                <AppText variant="caption" className="text-slate-400 mt-2">
                  Memuat data wilayah...
                </AppText>
              </View>
            ) : modalStep === 'province' ? (
              <FlatList
                data={provinces.filter(p => p.name.toLowerCase().includes(regionSearch.toLowerCase()))}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => {
                  const isSelected = selectedProvinceId === item.id;
                  return (
                    <TouchableOpacity
                      onPress={() => {
                        setTempProvince(item);
                        setModalStep('regency');
                        setRegionSearch('');
                        fetchRegencies(item.id);
                      }}
                      style={{
                        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                        paddingVertical: 13, paddingHorizontal: 16, marginBottom: 6, borderRadius: 12,
                        backgroundColor: isSelected ? '#ecfdf5' : '#fff',
                        borderWidth: 1,
                        borderColor: isSelected ? '#6ee7b7' : '#e2e8f0',
                      }}
                    >
                      <AppText style={{ fontSize: 14, fontWeight: isSelected ? '700' : '500', color: isSelected ? '#059669' : '#334155' }}>
                        {item.name}
                      </AppText>
                      <Icon name="chevron-forward" size={16} color={isSelected ? '#059669' : '#94a3b8'} />
                    </TouchableOpacity>
                  );
                }}
              />
            ) : (
              <FlatList
                data={regencies.filter(r => r.name.toLowerCase().includes(regionSearch.toLowerCase()))}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => {
                  const isSelected = selectedRegencyId === item.id;
                  return (
                    <TouchableOpacity
                      onPress={() => {
                        if (tempProvince) {
                          setSelectedProvinceId(tempProvince.id);
                          setSelectedProvinceName(tempProvince.name);
                        }
                        setSelectedRegencyId(item.id);
                        setSelectedRegencyName(item.name);
                        setRegionModalVisible(false);
                      }}
                      style={{
                        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                        paddingVertical: 13, paddingHorizontal: 16, marginBottom: 6, borderRadius: 12,
                        backgroundColor: isSelected ? '#ecfdf5' : '#fff',
                        borderWidth: 1,
                        borderColor: isSelected ? '#6ee7b7' : '#e2e8f0',
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 8 }}>
                        <Icon name="location-outline" size={16} color={isSelected ? '#059669' : '#94a3b8'} />
                        <AppText style={{ marginLeft: 10, fontSize: 14, fontWeight: isSelected ? '700' : '500', color: isSelected ? '#059669' : '#334155' }}>
                          {item.name}
                        </AppText>
                      </View>
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

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  TouchableOpacity,
  Modal,
  TextInput,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { AppText, Icon } from '@/components/atoms';
import { regionService, Province, Regency, District } from '@/services/regionService';

export interface RegionValue {
  provinceId: number | null;
  provinceName: string | null;
  regencyId: number | null;
  regencyName: string | null;
  districtId: number | null;
  districtName: string | null;
}

export interface RegionPickerProps {
  label?: string;
  provinceId?: number | null;
  provinceName?: string | null;
  regencyId?: number | null;
  regencyName?: string | null;
  districtId?: number | null;
  districtName?: string | null;
  onChange: (region: RegionValue) => void;
  showDistrict?: boolean;
  required?: boolean;
  error?: string;
}

type PickerType = 'province' | 'regency' | 'district' | null;

export const RegionPicker: React.FC<RegionPickerProps> = ({
  label = 'Lokasi Wilayah',
  provinceId = null,
  provinceName = null,
  regencyId = null,
  regencyName = null,
  districtId = null,
  districtName = null,
  onChange,
  showDistrict = true,
  required = false,
  error,
}) => {
  const [activeModal, setActiveModal] = useState<PickerType>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [provinces, setProvinces] = useState<Province[]>([]);
  const [regencies, setRegencies] = useState<Regency[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);

  const [loading, setLoading] = useState(false);

  // In-memory cache for fast switching
  const [regencyCache, setRegencyCache] = useState<Record<number, Regency[]>>({});
  const [districtCache, setDistrictCache] = useState<Record<number, District[]>>({});

  // Fetch provinces when modal opens for province
  const openProvinceModal = async () => {
    setActiveModal('province');
    setSearchQuery('');
    if (provinces.length === 0) {
      setLoading(true);
      try {
        const data = await regionService.getProvinces();
        setProvinces(data);
      } catch (e) {
        console.log('Failed to fetch provinces:', e);
      } finally {
        setLoading(false);
      }
    }
  };

  // Fetch regencies when modal opens for regency
  const openRegencyModal = async () => {
    if (!provinceId) return;
    setActiveModal('regency');
    setSearchQuery('');

    if (regencyCache[provinceId]) {
      setRegencies(regencyCache[provinceId]);
      return;
    }

    setLoading(true);
    try {
      const data = await regionService.getRegencies(provinceId);
      setRegencies(data);
      setRegencyCache(prev => ({ ...prev, [provinceId]: data }));
    } catch (e) {
      console.log('Failed to fetch regencies:', e);
    } finally {
      setLoading(false);
    }
  };

  // Fetch districts when modal opens for district
  const openDistrictModal = async () => {
    if (!regencyId) return;
    setActiveModal('district');
    setSearchQuery('');

    if (districtCache[regencyId]) {
      setDistricts(districtCache[regencyId]);
      return;
    }

    setLoading(true);
    try {
      const data = await regionService.getDistricts(regencyId);
      setDistricts(data);
      setDistrictCache(prev => ({ ...prev, [regencyId]: data }));
    } catch (e) {
      console.log('Failed to fetch districts:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProvince = (prov: Province) => {
    onChange({
      provinceId: prov.id,
      provinceName: prov.name,
      regencyId: null,
      regencyName: null,
      districtId: null,
      districtName: null,
    });
    setRegencies([]);
    setDistricts([]);
    setActiveModal(null);
  };

  const handleSelectRegency = (reg: Regency) => {
    onChange({
      provinceId,
      provinceName,
      regencyId: reg.id,
      regencyName: reg.name,
      districtId: null,
      districtName: null,
    });
    setDistricts([]);
    setActiveModal(null);
  };

  const handleSelectDistrict = (dist: District) => {
    onChange({
      provinceId,
      provinceName,
      regencyId,
      regencyName,
      districtId: dist.id,
      districtName: dist.name,
    });
    setActiveModal(null);
  };

  // Filtered list based on search query
  const filteredItems = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (activeModal === 'province') {
      return q ? provinces.filter(p => p.name.toLowerCase().includes(q)) : provinces;
    }
    if (activeModal === 'regency') {
      return q ? regencies.filter(r => r.name.toLowerCase().includes(q)) : regencies;
    }
    if (activeModal === 'district') {
      return q ? districts.filter(d => d.name.toLowerCase().includes(q)) : districts;
    }
    return [];
  }, [activeModal, searchQuery, provinces, regencies, districts]);

  const modalTitle =
    activeModal === 'province'
      ? 'Pilih Provinsi'
      : activeModal === 'regency'
      ? 'Pilih Kabupaten / Kota'
      : 'Pilih Kecamatan';

  return (
    <View className="mb-4">
      {label && (
        <AppText variant="label" className="text-slate-700 dark:text-slate-300 mb-1.5 font-medium">
          {label} {required && <AppText className="text-red-500">*</AppText>}
        </AppText>
      )}

      {/* 1. Provinsi Selector */}
      <TouchableOpacity
        onPress={openProvinceModal}
        activeOpacity={0.7}
        className="flex-row items-center justify-between bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3.5 py-3 rounded-xl mb-2"
      >
        <View className="flex-1 pr-2">
          <AppText variant="caption" className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
            Provinsi
          </AppText>
          <AppText
            numberOfLines={1}
            className={`text-sm mt-0.5 ${provinceName ? 'text-slate-900 dark:text-white font-medium' : 'text-slate-400'}`}
          >
            {provinceName || 'Pilih Provinsi...'}
          </AppText>
        </View>
        <Icon name="chevron-forward" size={16} color="#94a3b8" />
      </TouchableOpacity>

      {/* 2. Kabupaten / Kota Selector */}
      <TouchableOpacity
        onPress={openRegencyModal}
        disabled={!provinceId}
        activeOpacity={0.7}
        className={`flex-row items-center justify-between border px-3.5 py-3 rounded-xl mb-2 ${
          provinceId
            ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
            : 'bg-slate-50 dark:bg-slate-850 border-slate-100 dark:border-slate-800 opacity-60'
        }`}
      >
        <View className="flex-1 pr-2">
          <AppText variant="caption" className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
            Kabupaten / Kota
          </AppText>
          <AppText
            numberOfLines={1}
            className={`text-sm mt-0.5 ${regencyName ? 'text-slate-900 dark:text-white font-medium' : 'text-slate-400'}`}
          >
            {provinceId ? regencyName || 'Pilih Kabupaten / Kota...' : 'Pilih provinsi terlebih dahulu'}
          </AppText>
        </View>
        <Icon name="chevron-forward" size={16} color={provinceId ? '#94a3b8' : '#cbd5e1'} />
      </TouchableOpacity>

      {/* 3. Kecamatan Selector (Optional) */}
      {showDistrict && (
        <TouchableOpacity
          onPress={openDistrictModal}
          disabled={!regencyId}
          activeOpacity={0.7}
          className={`flex-row items-center justify-between border px-3.5 py-3 rounded-xl ${
            regencyId
              ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
              : 'bg-slate-50 dark:bg-slate-850 border-slate-100 dark:border-slate-800 opacity-60'
          }`}
        >
          <View className="flex-1 pr-2">
            <AppText variant="caption" className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
              Kecamatan
            </AppText>
            <AppText
              numberOfLines={1}
              className={`text-sm mt-0.5 ${districtName ? 'text-slate-900 dark:text-white font-medium' : 'text-slate-400'}`}
            >
              {regencyId ? districtName || 'Pilih Kecamatan...' : 'Pilih kab/kota terlebih dahulu'}
            </AppText>
          </View>
          <Icon name="chevron-forward" size={16} color={regencyId ? '#94a3b8' : '#cbd5e1'} />
        </TouchableOpacity>
      )}

      {error && (
        <AppText variant="caption" className="text-red-500 mt-1">
          {error}
        </AppText>
      )}

      {/* Search & Select Bottom Sheet Modal */}
      <Modal
        visible={activeModal !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setActiveModal(null)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white dark:bg-slate-900 rounded-t-3xl max-h-[80%] min-h-[50%] p-4 pb-8">
            {/* Modal Header */}
            <View className="flex-row items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
              <AppText variant="h3" className="font-bold text-slate-900 dark:text-white">
                {modalTitle}
              </AppText>
              <TouchableOpacity
                onPress={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center"
              >
                <AppText className="text-slate-500 font-bold">✕</AppText>
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View className="flex-row items-center bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-2 mb-3">
              <Icon name="search-outline" size={18} color="#94a3b8" />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={`Cari ${activeModal === 'province' ? 'provinsi' : activeModal === 'regency' ? 'kabupaten / kota' : 'kecamatan'}...`}
                placeholderTextColor="#94a3b8"
                className="flex-1 ml-2 text-slate-900 dark:text-white text-sm py-1"
                autoFocus
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Icon name="close-circle" size={16} color="#94a3b8" />
                </TouchableOpacity>
              )}
            </View>

            {/* Content List */}
            {loading ? (
              <View className="flex-1 justify-center items-center py-12">
                <ActivityIndicator size="large" color="#059669" />
                <AppText variant="caption" className="text-slate-400 mt-2">
                  Memuat data wilayah...
                </AppText>
              </View>
            ) : (
              <FlatList
                data={filteredItems}
                keyExtractor={(item: any) => item.id.toString()}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <View className="py-12 items-center">
                    <AppText className="text-2xl mb-1">🔍</AppText>
                    <AppText variant="caption" className="text-slate-400 text-center">
                      {searchQuery
                        ? `Tidak ada hasil untuk "${searchQuery}"`
                        : 'Tidak ada data wilayah tersedia.'}
                    </AppText>
                  </View>
                }
                renderItem={({ item }: { item: any }) => {
                  const isSelected =
                    (activeModal === 'province' && provinceId === item.id) ||
                    (activeModal === 'regency' && regencyId === item.id) ||
                    (activeModal === 'district' && districtId === item.id);

                  return (
                    <TouchableOpacity
                      onPress={() => {
                        if (activeModal === 'province') handleSelectProvince(item);
                        else if (activeModal === 'regency') handleSelectRegency(item);
                        else if (activeModal === 'district') handleSelectDistrict(item);
                      }}
                      className={`flex-row items-center justify-between py-3 px-3.5 rounded-xl mb-1 ${
                        isSelected
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-white dark:bg-slate-900'
                      }`}
                    >
                      <AppText
                        className={`text-sm ${
                          isSelected ? 'font-bold text-emerald-700 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        {item.name}
                      </AppText>
                      {isSelected && (
                        <Icon name="checkmark" size={18} color="#059669" />
                      )}
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

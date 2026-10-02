import React from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { AppText } from '../atoms';
import { Category } from '@/services/categoryService';

export interface FilterBarProps {
  categories: Category[];
  selectedCategoryId: number | null;
  onSelectCategory: (categoryId: number | null) => void;
  selectedCondition: string | null;
  onSelectCondition: (condition: string | null) => void;
  selectedCity: string | null;
  onClearFilters: () => void;
  className?: string;
}

const CONDITIONS = [
  { id: 'baru', label: 'Baru' },
  { id: 'bekas_seperti_baru', label: 'Seperti Baru' },
  { id: 'bekas_baik', label: 'Baik' },
  { id: 'bekas_layak_pakai', label: 'Layak Pakai' },
];

export const FilterBar: React.FC<FilterBarProps> = ({
  categories,
  selectedCategoryId,
  onSelectCategory,
  selectedCondition,
  onSelectCondition,
  selectedCity,
  onClearFilters,
  className = '',
}) => {
  const hasActiveFilters = selectedCategoryId !== null || selectedCondition !== null || selectedCity !== null;

  return (
    <View className={`mb-3 ${className}`}>
      {/* Category Horizontal Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        className="flex-row py-1"
      >
        <TouchableOpacity
          onPress={() => onSelectCategory(null)}
          className={`px-4 py-2 rounded-full mr-2 flex-row items-center border ${
            selectedCategoryId === null
              ? 'bg-brand-600 border-brand-600'
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
          }`}
        >
          <AppText
            className={`text-xs font-bold ${
              selectedCategoryId === null ? 'text-white' : 'text-slate-700 dark:text-slate-300'
            }`}
          >
            Semua Kategori
          </AppText>
        </TouchableOpacity>

        {categories.map((cat) => {
          const isSelected = selectedCategoryId === cat.id;
          return (
            <TouchableOpacity
              key={cat.id}
              onPress={() => onSelectCategory(isSelected ? null : cat.id)}
              className={`px-3.5 py-2 rounded-full mr-2 flex-row items-center gap-1 border ${
                isSelected
                  ? 'bg-brand-600 border-brand-600'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
              }`}
            >
              {cat.icon && <AppText className="text-xs">{cat.icon}</AppText>}
              <AppText
                className={`text-xs font-medium ${
                  isSelected ? 'text-white font-bold' : 'text-slate-700 dark:text-slate-300'
                }`}
              >
                {cat.name}
              </AppText>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Condition & Active Filter Badges */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        className="flex-row py-1 mt-1"
      >
        {selectedCity && (
          <View className="bg-brand-100 dark:bg-brand-950 px-2.5 py-1 rounded-full mr-2 flex-row items-center gap-1 border border-brand-300 dark:border-brand-800">
            <AppText className="text-[11px] text-brand-800 dark:text-brand-300 font-medium">
              📍 {selectedCity}
            </AppText>
          </View>
        )}

        {CONDITIONS.map((cond) => {
          const isSelected = selectedCondition === cond.id;
          return (
            <TouchableOpacity
              key={cond.id}
              onPress={() => onSelectCondition(isSelected ? null : cond.id)}
              className={`px-2.5 py-1 rounded-full mr-2 border ${
                isSelected
                  ? 'bg-slate-800 dark:bg-white border-slate-800 dark:border-white'
                  : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
              }`}
            >
              <AppText
                className={`text-[11px] font-medium ${
                  isSelected
                    ? 'text-white dark:text-slate-900 font-bold'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {cond.label}
              </AppText>
            </TouchableOpacity>
          );
        })}

        {hasActiveFilters && (
          <TouchableOpacity
            onPress={onClearFilters}
            className="px-2.5 py-1 rounded-full border border-red-200 bg-red-50 dark:bg-red-950/40"
          >
            <AppText className="text-[11px] text-red-600 dark:text-red-400 font-medium">
              ✕ Reset
            </AppText>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
};

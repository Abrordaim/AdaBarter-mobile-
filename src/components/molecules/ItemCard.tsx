import React from 'react';
import { View, TouchableOpacity, Image, Text } from 'react-native';
import { AppText, Badge, Icon } from '../atoms';

export interface ItemCardProps {
  title: string;
  location?: string | null;
  city?: string | null;
  condition: string;
  estimatedPrice?: number | string | null;
  imageUrl?: string | null;
  isBoosted?: boolean;
  desiredItems?: string | null;
  onPress?: () => void;
  className?: string;
}

export const ItemCard: React.FC<ItemCardProps> = ({
  title,
  location,
  city,
  condition,
  estimatedPrice,
  imageUrl,
  isBoosted = false,
  desiredItems,
  onPress,
  className = '',
}) => {
  const getConditionInfo = (cond: string): { variant: 'success' | 'info' | 'neutral' | 'warning'; label: string } => {
    switch (cond) {
      case 'baru':
      case 'Baru':
        return { variant: 'success', label: 'Baru' };
      case 'bekas_seperti_baru':
      case 'Bekas Seperti Baru':
        return { variant: 'info', label: 'Mulus' };
      case 'bekas_baik':
      case 'Bekas Baik':
        return { variant: 'neutral', label: 'Baik' };
      case 'bekas_layak_pakai':
      case 'Bekas Layak Pakai':
      default:
        return { variant: 'warning', label: 'Layak' };
    }
  };

  const formatPrice = (price?: number | string | null) => {
    if (!price) return null;
    const num = typeof price === 'string' ? parseFloat(price) : price;
    if (isNaN(num)) return null;
    return `Est. Rp ${num.toLocaleString('id-ID')}`;
  };

  const condInfo = getConditionInfo(condition);
  const displayLocation = city || location || 'Indonesia';

  return (
    <TouchableOpacity
      className={`bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-sm border border-slate-100 dark:border-slate-700/80 active:opacity-85 ${className}`}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View className="h-36 bg-slate-100 dark:bg-slate-700 w-full relative">
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} className="w-full h-full" resizeMode="cover" />
        ) : (
          <View className="flex-1 items-center justify-center p-2">
            <AppText className="text-3xl mb-1">📦</AppText>
            <AppText variant="caption" className="text-slate-400 text-xs">
              Tanpa Foto
            </AppText>
          </View>
        )}

        {/* Boosted / Featured Ribbon Badge */}
        {isBoosted && (
          <View className="absolute top-2 left-2 bg-amber-500 px-2 py-0.5 rounded-full flex-row items-center gap-1 shadow-sm">
            <AppText className="text-[10px] text-white font-bold">⚡ Pinned</AppText>
          </View>
        )}

        {/* Condition pill over image */}
        <View className="absolute bottom-2 left-2">
          <Badge variant={condInfo.variant} text={condInfo.label} />
        </View>
      </View>

      <View className="p-3">
        <AppText variant="label" className="font-bold text-sm text-slate-900 dark:text-white mb-1" numberOfLines={1}>
          {title}
        </AppText>

        {formatPrice(estimatedPrice) ? (
          <AppText variant="caption" className="text-brand-600 dark:text-brand-400 font-bold mb-1">
            {formatPrice(estimatedPrice)}
          </AppText>
        ) : (
          <AppText variant="caption" className="text-slate-500 dark:text-slate-400 mb-1">
            Nilai Fleksibel
          </AppText>
        )}

        {desiredItems && (
          <View className="bg-brand-50/70 dark:bg-brand-950/30 px-2 py-1 rounded-md mb-2">
            <AppText variant="caption" numberOfLines={1} className="text-brand-800 dark:text-brand-300 text-[11px]">
              Cari: {desiredItems}
            </AppText>
          </View>
        )}

        <View className="flex-row items-center justify-between  border-t border-slate-100 dark:border-slate-700/50">
          <AppText variant="caption" numberOfLines={1} className="text-slate-500 dark:text-slate-400 text-xs flex-col" >
            <Icon name="location-outline" size={16} color="black" />
            <Text className=''>
              {displayLocation}
            </Text>
          </AppText>
        </View>
      </View>
    </TouchableOpacity>
  );
};

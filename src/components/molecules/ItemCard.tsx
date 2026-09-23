import React from 'react';
import { View, TouchableOpacity, Image } from 'react-native';
import { AppText, Badge } from '../atoms';

export interface ItemCardProps {
  title: string;
  location: string;
  condition: 'Baru' | 'Bekas Seperti Baru' | 'Bekas Baik' | 'Bekas Layak Pakai';
  estimatedPrice: string;
  imageUrl?: string;
  onPress?: () => void;
  className?: string;
}

export const ItemCard: React.FC<ItemCardProps> = ({
  title,
  location,
  condition,
  estimatedPrice,
  imageUrl,
  onPress,
  className = '',
}) => {
  const getConditionVariant = (cond: string) => {
    if (cond === 'Baru') return 'success';
    if (cond.includes('Seperti Baru')) return 'info';
    if (cond.includes('Baik')) return 'neutral';
    return 'warning';
  };

  return (
    <TouchableOpacity 
      className={`bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-sm border border-slate-100 dark:border-slate-700 w-[160px] ${className}`}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View className="h-[120px] bg-slate-200 dark:bg-slate-700 w-full">
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} className="w-full h-full" resizeMode="cover" />
        ) : (
          <View className="flex-1 items-center justify-center">
            <AppText className="text-slate-400">No Image</AppText>
          </View>
        )}
      </View>
      <View className="p-3">
        <AppText variant="label" className="mb-1" numberOfLines={1}>{title}</AppText>
        <AppText variant="caption" className="mb-2 text-brand-600 font-medium">{estimatedPrice}</AppText>
        
        <View className="flex-row items-center mb-2">
          <AppText variant="caption" numberOfLines={1} className="flex-1">{location}</AppText>
        </View>

        <Badge variant={getConditionVariant(condition)} text={condition} />
      </View>
    </TouchableOpacity>
  );
};

import React from 'react';
import { View, ScrollView, Image, Dimensions, TouchableOpacity, Linking } from 'react-native';
import { AppText } from '../atoms';

export interface BannerItem {
  id: string | number;
  imageUrl?: string | null;
  image_url?: string | null;
  title: string;
  redirect_url?: string | null;
  advertiser_name?: string | null;
}

export interface BannerCarouselProps {
  data: BannerItem[];
  className?: string;
}

export const BannerCarousel: React.FC<BannerCarouselProps> = ({ data, className = '' }) => {
  const width = Math.min(Dimensions.get('window').width - 32, 600);

  if (!data || data.length === 0) {
    return null;
  }

  const handlePress = (item: BannerItem) => {
    if (item.redirect_url) {
      Linking.openURL(item.redirect_url).catch(() => {});
    }
  };

  return (
    <View className={`my-3 ${className}`}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={width + 12}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: 16 }}
      >
        {data.map((item) => {
          const img = item.image_url || item.imageUrl;
          return (
            <TouchableOpacity
              key={item.id}
              activeOpacity={item.redirect_url ? 0.85 : 1}
              onPress={() => handlePress(item)}
              className="rounded-2xl overflow-hidden bg-brand-50 dark:bg-slate-800 mr-3 border border-emerald-100 dark:border-slate-700 shadow-sm"
              style={{ width, height: 140 }}
            >
              {img ? (
                <Image source={{ uri: img }} className="w-full h-full" resizeMode="cover" />
              ) : (
                <View className="flex-1 justify-center p-4 bg-emerald-600">
                  <View className="bg-emerald-700/60 self-start px-2 py-0.5 rounded-full mb-1">
                    <AppText className="text-[10px] text-emerald-100 font-bold">
                      {item.advertiser_name || 'AdaBarter Info'}
                    </AppText>
                  </View>
                  <AppText variant="h3" className="text-white font-bold mb-1" numberOfLines={2}>
                    {item.title}
                  </AppText>
                  <AppText variant="caption" className="text-emerald-100">
                    Tukar barang impianmu secara lokal tanpa uang tunai!
                  </AppText>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

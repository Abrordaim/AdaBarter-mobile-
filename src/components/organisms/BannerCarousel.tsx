import React from 'react';
import { View, ScrollView, Image, Dimensions } from 'react-native';
import { AppText } from '../atoms';

export interface BannerCarouselProps {
  data: Array<{ id: string; imageUrl?: string; title: string }>;
  className?: string;
}

export const BannerCarousel: React.FC<BannerCarouselProps> = ({ data, className = '' }) => {
  const width = Dimensions.get('window').width - 32; // Screen width minus padding

  return (
    <View className={`mt-4 mb-2 ${className}`}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        snapToInterval={width + 16} // Width + margin
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: 16 }}
      >
        {data.map((item, index) => (
          <View 
            key={item.id} 
            className="rounded-xl overflow-hidden bg-brand-100 dark:bg-brand-900 mr-4"
            style={{ width, height: 160 }}
          >
            {item.imageUrl ? (
              <Image source={{ uri: item.imageUrl }} className="w-full h-full" resizeMode="cover" />
            ) : (
              <View className="flex-1 items-center justify-center p-4">
                <AppText variant="h2" className="text-brand-600 dark:text-brand-400 text-center font-bold">
                  {item.title}
                </AppText>
                <AppText className="text-brand-800 dark:text-brand-200 mt-2">
                  Promo Spesial Barter!
                </AppText>
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

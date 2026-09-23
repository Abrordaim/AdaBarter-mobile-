import React from 'react';
import { View, Image, ImageSourcePropType } from 'react-native';
import { AppText } from './AppText';

export interface AvatarProps {
  source?: ImageSourcePropType | { uri: string };
  url?: string;
  name?: string;
  initials?: string;
  size?: 'sm' | 'md' | 'lg';
  isOnline?: boolean;
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  source,
  url,
  name,
  initials,
  size = 'md',
  isOnline = false,
  className = '',
}) => {
  const imageSource = source || (url ? { uri: url } : undefined);
  const displayInitials = initials || (name ? name.substring(0, 2).toUpperCase() : undefined);
  const getSizeStyles = () => {
    if (size === 'sm') return 'w-8 h-8 rounded-full';
    if (size === 'lg') return 'w-16 h-16 rounded-2xl';
    return 'w-12 h-12 rounded-xl'; // md
  };

  const getOnlineIndicatorStyles = () => {
    if (size === 'sm') return 'w-2.5 h-2.5 -right-0.5 -bottom-0.5';
    if (size === 'lg') return 'w-4 h-4 -right-1 -bottom-1';
    return 'w-3 h-3 -right-0.5 -bottom-0.5';
  };

  return (
    <View className="relative">
      <View className={`bg-slate-200 dark:bg-slate-700 items-center justify-center overflow-hidden ${getSizeStyles()} ${className}`}>
        {imageSource ? (
          <Image source={imageSource} className="w-full h-full" resizeMode="cover" />
        ) : (
          <AppText className={`font-semibold text-slate-500 dark:text-slate-300 ${size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-xs' : 'text-base'}`}>
            {displayInitials ? displayInitials.substring(0, 2).toUpperCase() : '?'}
          </AppText>
        )}
      </View>
      
      {isOnline && (
        <View className={`absolute bg-green-500 rounded-full border-2 border-white dark:border-slate-900 ${getOnlineIndicatorStyles()}`} />
      )}
    </View>
  );
};

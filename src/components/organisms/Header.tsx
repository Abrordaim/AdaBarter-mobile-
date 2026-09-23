import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { AppText, Icon } from '../atoms';

export interface HeaderProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  className?: string;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  showBack = false,
  onBack,
  rightAction,
  className = '',
}) => {
  return (
    <View className={`flex-row items-center justify-between px-4 py-3 bg-brand-600 ${className}`}>
      <View className="flex-row items-center flex-1">
        {showBack && (
          <TouchableOpacity onPress={onBack} className="mr-3 p-1">
            <Icon name="back" size={24} color="#ffffff" />
          </TouchableOpacity>
        )}
        <AppText variant="h3" className="text-white font-bold" numberOfLines={1}>
          {title}
        </AppText>
      </View>
      
      {rightAction && (
        <View className="ml-3">
          {rightAction}
        </View>
      )}
    </View>
  );
};

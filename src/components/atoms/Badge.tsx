import React from 'react';
import { View } from 'react-native';
import { AppText } from './AppText';

export interface BadgeProps {
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral';
  text: string;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ variant = 'neutral', text, className = '' }) => {
  const getStyles = () => {
    switch (variant) {
      case 'success': return { bg: 'bg-green-100', text: 'text-green-800' };
      case 'warning': return { bg: 'bg-yellow-100', text: 'text-yellow-800' };
      case 'error': return { bg: 'bg-red-100', text: 'text-red-800' };
      case 'info': return { bg: 'bg-blue-100', text: 'text-blue-800' };
      default: return { bg: 'bg-slate-100', text: 'text-slate-800' };
    }
  };

  const styles = getStyles();

  return (
    <View className={`px-2 py-0.5 rounded-full self-start ${styles.bg} ${className}`}>
      <AppText className={`text-xs font-medium ${styles.text}`}>{text}</AppText>
    </View>
  );
};

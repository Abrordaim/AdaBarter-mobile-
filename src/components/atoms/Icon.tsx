import React from 'react';
import { ColorValue, View } from 'react-native';
import { AppText } from './AppText';

export interface IconProps {
  name: string;
  size?: number;
  color?: ColorValue | string;
  className?: string;
}

export const Icon: React.FC<IconProps> = ({ name, size = 24, color, className = '' }) => {
  // Fallback for now until Expo vector icons is wired up
  // Using simple emoji or text representation
  const getIcon = () => {
    switch (name) {
      case 'search': return '🔍';
      case 'house': return '🏠';
      case 'repeat': return '🔁';
      case 'plus-circle': return '➕';
      case 'message': return '💬';
      case 'person': return '👤';
      case 'clear': return '❌';
      case 'back': return '⬅️';
      default: return '📍';
    }
  };

  return (
    <View className={`items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <AppText style={{ fontSize: size * 0.7, color: color || '#000' }}>{getIcon()}</AppText>
    </View>
  );
};

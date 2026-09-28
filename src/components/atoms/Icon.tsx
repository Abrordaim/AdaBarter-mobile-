import React from 'react';
import { ColorValue, View } from 'react-native';
import { AppText } from './AppText';
import Ionicons from '@react-native-vector-icons/ionicons';


export interface IconProps {
  name: any;
  size?: number;
  color?: ColorValue | string;
  className?: string;
}

export const Icon: React.FC<IconProps> = ({ name ='alert', size = 24, color, className = '' }) => {
  // Fallback for now until Expo vector icons is wired up
  // Using simple emoji or text representation
  const getIcon = () => {

    return <Ionicons name={name} size={size} color={color} />;
    // switch (name) {
    //   case 'search': return <Ionicons name={name} size={size} color={color} />;
    //   case 'house': return <Ionicons name="home" size={size} color={color} />;
    //   case 'repeat': return <Ionicons name="repeat" size={size} color={color} />;
    //   case 'plus-circle': return '+';
    //   case 'message': return <Ionicons name="chatbox-outline" size={size} color={color} />;
    //   case 'person': return <Ionicons name="person" size={size} color={color} />;
    //   case 'clear': return 'x';
    //   case 'back': return <Ionicons name="arrow-back" size={size} color={color} />;
    //   default: return <Ionicons name="alert" size={size} color={color} />;
    // }
  };

  return (
    <View className={`items-center justify-center ${className}`} >
      <AppText style={{  color: color || '#000' }}>{getIcon()}</AppText>
    </View>
  );
};

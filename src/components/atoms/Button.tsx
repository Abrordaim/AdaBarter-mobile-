import React from 'react';
import { TouchableOpacity, ActivityIndicator, TouchableOpacityProps, View } from 'react-native';
import { AppText } from './AppText';

export interface ButtonProps extends TouchableOpacityProps {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  title: string;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  title,
  className = '',
  ...props
}) => {
  const getContainerStyles = () => {
    let styles = 'flex-row items-center justify-center rounded-lg ';
    
    // Size
    if (size === 'sm') styles += 'px-3 py-1.5 ';
    else if (size === 'md') styles += 'px-4 py-2.5 ';
    else if (size === 'lg') styles += 'px-6 py-3.5 ';

    // Variant
    if (variant === 'primary') styles += 'bg-brand-600 ';
    else if (variant === 'secondary') styles += 'bg-transparent border border-brand-600 ';
    else if (variant === 'ghost') styles += 'bg-transparent ';

    // Disabled
    if (disabled || loading) styles += 'opacity-50 ';

    return styles;
  };

  const getTextStyles = () => {
    if (variant === 'primary') return 'text-white font-medium';
    return 'text-brand-600 font-medium';
  };

  return (
    <TouchableOpacity
      className={`${getContainerStyles()} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? 'white' : '#059669'} />
      ) : (
        <View className="flex-row items-center justify-center gap-2">
          {leftIcon}
          <AppText className={getTextStyles()}>{title}</AppText>
          {rightIcon}
        </View>
      )}
    </TouchableOpacity>
  );
};

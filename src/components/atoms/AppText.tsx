import React from 'react';
import { Text, TextProps } from 'react-native';

export interface AppTextProps extends TextProps {
  variant?: 'h1' | 'h2' | 'h3' | 'body' | 'caption' | 'label';
  color?: string; // allow overriding color directly if needed
}

export const AppText: React.FC<AppTextProps> = ({ 
  variant = 'body', 
  className = '', 
  children,
  ...props 
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'h1':
        return 'text-3xl font-bold';
      case 'h2':
        return 'text-2xl font-bold';
      case 'h3':
        return 'text-xl font-semibold';
      case 'body':
        return 'text-base';
      case 'caption':
        return 'text-sm text-gray-500';
      case 'label':
        return 'text-sm font-medium';
      default:
        return 'text-base';
    }
  };

  return (
    <Text 
      className={`${getVariantStyles()} text-slate-900 dark:text-slate-50 ${className}`} 
      {...props}
    >
      {children}
    </Text>
  );
};

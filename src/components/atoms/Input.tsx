import React, { useState } from 'react';
import { View, TextInput, TextInputProps } from 'react-native';
import { AppText } from './AppText';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  leftIcon,
  rightIcon,
  className = '',
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View className={`w-full mb-4 ${className}`}>
      {label && <AppText variant="label" className="mb-1 text-slate-700 dark:text-slate-300">{label}</AppText>}
      
      <View 
        className={`flex-row items-center border rounded-lg px-3 py-2 bg-white dark:bg-slate-800 ${
          error ? 'border-red-500' : isFocused ? 'border-brand-600' : 'border-slate-300 dark:border-slate-600'
        }`}
      >
        {leftIcon && <View className="mr-2">{leftIcon}</View>}
        
        <TextInput
          className="flex-1 text-slate-900 dark:text-white"
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
          placeholderTextColor="#94a3b8"
          {...props}
        />

        {rightIcon && <View className="ml-2">{rightIcon}</View>}
      </View>

      {error && <AppText variant="caption" className="text-red-500 mt-1">{error}</AppText>}
    </View>
  );
};

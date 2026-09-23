import React, { useState } from 'react';
import { View, TouchableOpacity, TextInput } from 'react-native';
import { Icon } from '../atoms/Icon';

export interface SearchBarProps {
  placeholder?: string;
  onSearch?: (text: string) => void;
  className?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({ 
  placeholder = 'Cari barang...', 
  onSearch,
  className = ''
}) => {
  const [text, setText] = useState('');

  const handleClear = () => {
    setText('');
    onSearch?.('');
  };

  return (
    <View className={`flex-row items-center bg-slate-100 dark:bg-slate-800 rounded-lg px-3 py-2 ${className}`}>
      <Icon name="search" size={20} color="#94a3b8" />
      <TextInput
        className="flex-1 ml-2 text-slate-900 dark:text-white"
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        value={text}
        onChangeText={(val) => {
          setText(val);
          onSearch?.(val);
        }}
      />
      {text.length > 0 && (
        <TouchableOpacity onPress={handleClear}>
          <Icon name="clear" size={16} color="#94a3b8" />
        </TouchableOpacity>
      )}
    </View>
  );
};

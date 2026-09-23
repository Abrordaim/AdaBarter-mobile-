import React from 'react';
import { View, Text } from 'react-native';
import { MainTemplate } from '../../components/templates';
import { SearchBar } from '../../components/molecules';

export default function HomeScreen() {
  return (
    <MainTemplate title="AdaBarter">
      <View className="px-4 mt-4">
        <SearchBar />
        
        <View className="flex-1 items-center justify-center mt-20">
          <Text className="text-slate-500">Home Content Placeholder</Text>
        </View>
      </View>
    </MainTemplate>
  );
}

import React from 'react';
import { View, Text } from 'react-native';
import { MainTemplate } from '../../components/templates';

export default function TukarankuScreen() {
  return (
    <MainTemplate title="Riwayat Penawaran">
      <View className="flex-1 items-center justify-center mt-20">
        <Text className="text-slate-500">Tukaranku Placeholder</Text>
      </View>
    </MainTemplate>
  );
}

import React from 'react';
import { View, Text } from 'react-native';
import { MainTemplate } from '../../components/templates';

export default function ChatScreen() {
  return (
    <MainTemplate title="Chat">
      <View className="flex-1 items-center justify-center mt-20">
        <Text className="text-slate-500">Chat Placeholder</Text>
      </View>
    </MainTemplate>
  );
}

import React from 'react';
import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { Icon, AppText } from '../../components/atoms';
import { BrandColors } from '../../constants/colors';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: BrandColors[600],
        tabBarInactiveTintColor: '#94a3b8',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#e2e8f0',
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Icon name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="tukaranku"
        options={{
          title: 'Tukaranku',
          tabBarIcon: ({ color, size }) => <Icon name="repeat" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="add-item"
        options={{
          title: '',
          tabBarIcon: ({ focused }) => (
            <View className="items-center justify-center -mt-6">
              <View className="bg-brand-600 w-14 h-14 rounded-full items-center justify-center border-4 border-white dark:border-slate-900 shadow-sm">
                <Icon name="add" size={30} color="#ffffff" />
              </View>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color, size }) => <Icon name="chatbox" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Akunku',
          tabBarIcon: ({ color, size }) => <Icon name="person" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}

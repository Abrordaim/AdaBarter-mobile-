import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AuthProvider } from '@/context/AuthContext';
import Ionicons from '@react-native-vector-icons/ionicons';



SplashScreen.preventAutoHideAsync();

import "../global.css"

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <AnimatedSplashOverlay />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="item/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="offer/create" options={{ headerShown: false }} />
          <Stack.Screen name="chat/[offerId]" options={{ headerShown: false }} />
          <Stack.Screen name="monetization/vip" options={{ headerShown: false }} />
          <Stack.Screen name="monetization/boost" options={{ headerShown: false }} />
          <Stack.Screen name="monetization/transactions" options={{ headerShown: false }} />
        </Stack>
      </AuthProvider>
    </ThemeProvider>
  );
}

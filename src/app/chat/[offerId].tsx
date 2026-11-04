import React, { useEffect } from 'react';
import { ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/atoms';
import { chatService } from '@/services/chatService';

export default function ChatOfferRedirectScreen() {
  const { offerId } = useLocalSearchParams<{ offerId: string }>();
  const router = useRouter();

  useEffect(() => {
    if (!offerId) return;

    let isMounted = true;
    chatService
      .getConversationForOffer(parseInt(offerId, 10))
      .then((conv) => {
        if (isMounted) {
          router.replace({
            pathname: '/chat/direct/[conversationId]',
            params: { conversationId: conv.id.toString() },
          });
        }
      })
      .catch((e: any) => {
        if (isMounted) {
          Alert.alert('Gagal Membuka Chat', e.message || 'Ruang chat tidak dapat diakses.', [
            { text: 'Kembali', onPress: () => router.back() },
          ]);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [offerId, router]);

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-slate-900 justify-center items-center">
      <ActivityIndicator size="large" color="#059669" />
      <AppText variant="caption" className="text-slate-500 mt-3">
        Membuka ruang chat...
      </AppText>
    </SafeAreaView>
  );
}


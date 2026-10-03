import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { MainTemplate } from '@/components/templates';
import { AppText, Button, Avatar, Badge, Icon } from '@/components/atoms';
import { useAuth } from '@/context/AuthContext';
import { chatService } from '@/services/chatService';
import { BarterOffer } from '@/services/offerService';

export default function ChatTabScreen() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  const [conversations, setConversations] = useState<BarterOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchConversations = async (isRefresh = false) => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await chatService.getConversations();
      setConversations(data || []);
    } catch (e) {
      console.log('Error fetching chat conversations:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <MainTemplate title="Ruang Chat">
        <View className="px-6 py-16 items-center justify-center">
          <View className="w-20 h-20 bg-brand-100 dark:bg-brand-900/30 rounded-full items-center justify-center mb-6">
            <Icon name={'chatbox'} size={26} color={'green'}/>
          </View>
          <AppText variant="h2" className="text-center font-bold mb-2 text-slate-800 dark:text-white">
            Ruang Chat Negosiasi
          </AppText>
          <AppText variant="body" className="text-center text-slate-600 dark:text-slate-400 mb-8 px-4">
            Masuk ke akun Anda untuk mengakses percakapan barter yang telah disepakati bersama.
          </AppText>
          <Button
            title="Masuk ke Akun"
            variant="primary"
            size="lg"
            onPress={() => router.push('/(auth)/login')}
          />
        </View>
      </MainTemplate>
    );
  }

  return (
    <MainTemplate title="Ruang Chat Negosiasi" onRefresh={() => fetchConversations(true)} refreshing={refreshing}>
      <View className="px-4 py-3">
        {loading ? (
          <View className="py-20 items-center justify-center">
            <ActivityIndicator size="large" color="#059669" />
            <AppText variant="caption" className="text-slate-500 mt-3">
              Memuat percakapan...
            </AppText>
          </View>
        ) : conversations.length === 0 ? (
          <View className="py-20 px-6 items-center justify-center">
            <View className="w-20 h-20 dark:bg-slate-800 rounded-full items-center justify-center mb-4">
              <AppText className="text-4xl"><Icon name={'chatbox-outline'} size={24} color={'green'}/></AppText>
            </View>
            <AppText variant="h3" className="font-bold text-slate-800 dark:text-white text-center mb-1">
              Belum Ada Chat Negosiasi Aktif
            </AppText>
            <AppText variant="body" className="text-slate-500 text-center text-sm mb-6">
              Sesuai prinsip AdaBarter, ruang chat eksklusif dibuka setelah tawaran barter disepakati bersama (Matched) oleh kedua belah pihak.
            </AppText>
            <Button
              title="Lihat Tawaran di Tukaranku"
              variant="secondary"
              onPress={() => router.push('/(tabs)/tukaranku')}
            />
          </View>
        ) : (
          <View className="gap-3">
            {conversations.map((offer) => {
              const isOfferer = user?.id === offer.offerer?.id;
              const otherUser = isOfferer ? offer.target_owner : offer.offerer;
              const myItem = isOfferer ? offer.offerer_item : offer.target_item;
              const theirItem = isOfferer ? offer.target_item : offer.offerer_item;
              const lastMessage = offer.latest_message;

              return (
                <TouchableOpacity
                  key={offer.id}
                  activeOpacity={0.7}
                  onPress={() =>
                    router.push({
                      pathname: '/chat/[offerId]',
                      params: { offerId: offer.id.toString() },
                    })
                  }
                  className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex-row items-center gap-3.5"
                >
                  <View className="relative">
                    <Avatar
                      name={otherUser?.name || 'User'}
                      url={otherUser?.avatar_url || undefined}
                      size="md"
                    />
                 
                  </View>

                  <View className="flex-1">
                    <View className="flex-row items-center justify-between mb-0.5">
                      <AppText variant="label" className="font-bold text-slate-900 dark:text-white" numberOfLines={1}>
                        {otherUser?.name || 'Pengguna'}
                      </AppText>
                      <AppText variant="caption" className="text-slate-400 text-xs">
                        {offer.matched_at ? new Date(offer.matched_at).toLocaleDateString('id-ID') : ''}
                      </AppText>
                    </View>

                    {/* Barter Item Context */}
                    <View className="bg-slate-100 dark:bg-slate-700/60 px-2 py-0.5 rounded-md self-start mb-1.5 flex-row items-center gap-1">
                      <AppText className="text-[8px] text-slate-700 dark:text-slate-300 font-medium" numberOfLines={1}>
                        {myItem?.title || 'Barang'} ⇄ {theirItem?.title || 'Barang'}
                      </AppText>
                    </View>

                    {/* Last message preview */}
                    <AppText
                      variant="caption"
                      numberOfLines={1}
                      className={lastMessage ? 'text-slate-600 dark:text-slate-300 font-medium' : 'text-slate-400 italic'}
                    >
                      {lastMessage?.message || 'Ketuk untuk membuka ruang chat negosiasi...'}
                    </AppText>
                  </View>

                  <View className="items-end">
                    {offer.status === 'completed' ? (
                      <Badge variant="info" text="Selesai" />
                    ) : (
                      <Badge variant="success" text="Matched" />
                    )}
                    <AppText className="text-slate-300 mt-2 text-lg">›</AppText>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
    </MainTemplate>
  );
}

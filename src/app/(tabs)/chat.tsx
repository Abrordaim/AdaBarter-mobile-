import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { MainTemplate } from '@/components/templates';
import { AppText, Button, Avatar, Badge, Icon } from '@/components/atoms';
import { useAuth } from '@/context/AuthContext';
import { chatService, DirectConversation } from '@/services/chatService';
import { BarterOffer } from '@/services/offerService';

interface UnifiedChatRow {
  key: string;
  type: 'direct' | 'barter';
  title: string;
  avatarUrl?: string;
  dateStr: string;
  timestamp: number;
  itemContext: string;
  lastMessageText: string;
  badgeText: string;
  badgeVariant: 'success' | 'info' | 'neutral' | 'warning';
  unreadCount: number;
  onPress: () => void;
}

export default function ChatTabScreen() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  const [unifiedList, setUnifiedList] = useState<UnifiedChatRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAllConversations = async (isRefresh = false) => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const directConvs = await chatService.getDirectConversations().catch(() => [] as DirectConversation[]);

      const rows: UnifiedChatRow[] = (directConvs || []).map((conv) => {
        const otherUser = conv.other_user || (
          conv.initiator_id === user?.id ? conv.receiver : conv.initiator
        );
        const item = conv.item;
        const offer = conv.offer;
        const isMatchedOrCompleted = Boolean(
          conv.is_matched || (offer && (offer.status === 'matched' || offer.status === 'completed'))
        );

        const lastMsg = conv.latest_message;
        const timeSource = conv.last_message_at || lastMsg?.created_at || conv.created_at || '';
        const timestamp = timeSource ? new Date(timeSource).getTime() : 0;
        const dateStr = timeSource ? new Date(timeSource).toLocaleDateString('id-ID') : '';

        let itemContext = `💬 ${item?.title || 'Tanya Barang'}`;
        let badgeText = 'Chat Langsung';
        let badgeVariant: 'success' | 'info' | 'neutral' | 'warning' = 'neutral';

        if (isMatchedOrCompleted && offer) {
          const isOfferer = user?.id === offer.offerer?.id;
          const myItem = isOfferer ? offer.offerer_item : offer.target_item;
          const theirItem = isOfferer ? offer.target_item : offer.offerer_item;

          itemContext = `${myItem?.title || 'Barang'} ⇄ ${theirItem?.title || 'Barang'}`;
          badgeText = offer.status === 'completed' ? 'Selesai' : 'Matched';
          badgeVariant = offer.status === 'completed' ? 'info' : 'success';
        }

        return {
          key: `conv-${conv.id}`,
          type: isMatchedOrCompleted ? 'barter' : 'direct',
          title: otherUser?.name || 'Pengguna',
          avatarUrl: otherUser?.avatar_url || undefined,
          dateStr,
          timestamp,
          itemContext,
          lastMessageText:
            lastMsg?.message ||
            (isMatchedOrCompleted
              ? 'Ketuk untuk membuka ruang chat barter...'
              : 'Mulai tanya tentang barang ini...'),
          badgeText,
          badgeVariant,
          unreadCount: conv.unread_count || 0,
          onPress: () =>
            router.push({
              pathname: '/chat/direct/[conversationId]',
              params: { conversationId: conv.id.toString() },
            }),
        };
      });

      // Sort combined list: newest message / activity on top
      rows.sort((a, b) => b.timestamp - a.timestamp);
      setUnifiedList(rows);
    } catch (e) {
      console.log('Error fetching chat conversations:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAllConversations();
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <MainTemplate title="Ruang Chat">
        <View className="px-6 py-16 items-center justify-center">
          <View className="w-20 h-20 bg-brand-100 dark:bg-brand-900/30 rounded-full items-center justify-center mb-6">
            <Icon name={'chatbox'} size={26} color={'green'} />
          </View>
          <AppText variant="h2" className="text-center font-bold mb-2 text-slate-800 dark:text-white">
            Ruang Chat AdaBarter
          </AppText>
          <AppText variant="body" className="text-center text-slate-600 dark:text-slate-400 mb-8 px-4">
            Masuk ke akun Anda untuk melihat pesan langsung dari pemilik barang dan negosiasi barter.
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
    <MainTemplate title="Pesan & Obrolan" onRefresh={() => fetchAllConversations(true)} refreshing={refreshing}>
      <View className="px-4 py-3">
        {loading ? (
          <View className="py-20 items-center justify-center">
            <ActivityIndicator size="large" color="#059669" />
            <AppText variant="caption" className="text-slate-500 mt-3">
              Memuat percakapan...
            </AppText>
          </View>
        ) : unifiedList.length === 0 ? (
          <View className="py-20 px-6 items-center justify-center">
            <View className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full items-center justify-center mb-4">
              <Icon name={'chatbox-outline'} size={24} color={'#059669'} />
            </View>
            <AppText variant="h3" className="font-bold text-slate-800 dark:text-white text-center mb-1">
              Belum Ada Obrolan Aktif
            </AppText>
            <AppText variant="body" className="text-slate-500 text-center text-sm mb-6">
              Mulai tanyakan barang yang Anda minati di katalog atau ajukan tawaran barter untuk mulai berinteraksi.
            </AppText>
            <Button
              title="Jelajahi Katalog Barang"
              variant="primary"
              onPress={() => router.push('/(tabs)')}
            />
          </View>
        ) : (
          <View className="gap-3">
            {unifiedList.map((chat) => (
              <TouchableOpacity
                key={chat.key}
                activeOpacity={0.7}
                onPress={chat.onPress}
                className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex-row items-center gap-3.5"
              >
                <View className="relative">
                  <Avatar
                    name={chat.title}
                    url={chat.avatarUrl}
                    size="md"
                  />
                  {chat.unreadCount > 0 && (
                    <View className="absolute -top-1 -right-1 bg-red-500 min-w-[18px] h-[18px] rounded-full items-center justify-center px-1">
                      <AppText className="text-[10px] text-white font-extrabold">
                        {chat.unreadCount > 9 ? '9+' : chat.unreadCount}
                      </AppText>
                    </View>
                  )}
                </View>

                <View className="flex-1">
                  <View className="flex-row items-center justify-between mb-0.5">
                    <AppText variant="label" className="font-bold text-slate-900 dark:text-white flex-1 mr-2" numberOfLines={1}>
                      {chat.title}
                    </AppText>
                    <AppText variant="caption" className="text-slate-400 text-xs">
                      {chat.dateStr}
                    </AppText>
                  </View>

                  {/* Context Pill (Barter match or Item Title) */}
                  <View className="bg-slate-100 dark:bg-slate-700/60 px-2 py-0.5 rounded-md self-start mb-1.5 flex-row items-center gap-1 max-w-[95%]">
                    <AppText className="text-[9px] text-slate-700 dark:text-slate-300 font-medium" numberOfLines={1}>
                      {chat.itemContext}
                    </AppText>
                  </View>

                  {/* Last message preview */}
                  <AppText
                    variant="caption"
                    numberOfLines={1}
                    className="text-slate-600 dark:text-slate-300 font-medium"
                  >
                    {chat.lastMessageText}
                  </AppText>
                </View>

                <View className="items-end justify-between self-stretch py-0.5">
                  <Badge variant={chat.badgeVariant} text={chat.badgeText} />
                  <AppText className="text-slate-300 mt-2 text-lg">›</AppText>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </MainTemplate>
  );
}

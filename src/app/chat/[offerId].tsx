import React, { useState, useEffect, useRef } from 'react';
import { View, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText, Button, Avatar, Badge, Icon } from '@/components/atoms';
import { useAuth } from '@/context/AuthContext';
import { chatService, ChatMessage } from '@/services/chatService';
import { offerService, BarterOffer } from '@/services/offerService';

export default function ChatRoomScreen() {
  const { offerId } = useLocalSearchParams<{ offerId: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [offer, setOffer] = useState<BarterOffer | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);

  const loadChatData = async (silent = false) => {
    if (!offerId) return;
    if (!silent) setLoading(true);

    try {
      const [offerData, messagesData] = await Promise.all([
        offerService.getOfferDetail(parseInt(offerId, 10)),
        chatService.getMessages(parseInt(offerId, 10)),
      ]);
      setOffer(offerData);
      setMessages(messagesData || []);
    } catch (e: any) {
      if (!silent) {
        Alert.alert('Gagal Memuat Chat', e.message || 'Ruang chat tidak dapat diakses.', [
          { text: 'Kembali', onPress: () => router.back() },
        ]);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadChatData();

    // Auto-poll messages every 4 seconds for lively negotiation
    const interval = setInterval(() => {
      loadChatData(true);
    }, 4000);

    return () => clearInterval(interval);
  }, [offerId]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || !offerId || sending) return;

    const textToSend = inputText.trim();
    setInputText('');
    setSending(true);

    try {
      const newMessage = await chatService.sendMessage(parseInt(offerId, 10), textToSend);
      setMessages((prev) => [...prev, newMessage]);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (e: any) {
      Alert.alert('Gagal Mengirim Pesan', e.message || 'Terjadi kesalahan.');
      setInputText(textToSend);
    } finally {
      setSending(false);
    }
  };

  const handleCompleteBarter = async () => {
    if (!offer) return;

    Alert.alert(
      'Selesaikan Transaksi Barter? 🎉',
      'Konfirmasikan bahwa pertukaran barang secara langsung (COD) telah selesai dilakukan.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Ya, Transaksi Selesai',
          onPress: async () => {
            setActionLoading(true);
            try {
              await offerService.completeOffer(offer.id);
              Alert.alert('Selamat! 🎉', 'Transaksi barter telah dinyatakan selesai.');
              await loadChatData();
            } catch (e: any) {
              Alert.alert('Gagal Menyelesaikan', e.message || 'Terjadi kesalahan.');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white dark:bg-slate-900 justify-center items-center">
        <ActivityIndicator size="large" color="#059669" />
        <AppText variant="caption" className="text-slate-500 mt-3">
          Membuka ruang chat negosiasi...
        </AppText>
      </SafeAreaView>
    );
  }

  if (!offer) return null;

  const isOfferer = user?.id === offer.offerer?.id;
  const otherUser = isOfferer ? offer.target_owner : offer.offerer;
  const myItem = isOfferer ? offer.offerer_item : offer.target_item;
  const theirItem = isOfferer ? offer.target_item : offer.offerer_item;
  const isCompleted = offer.status === 'completed';

  return (
    <SafeAreaView className="flex-1 bg-slate-100 dark:bg-slate-900" edges={['top']}>
      {/* Top Header Bar */}
      <View className="bg-white dark:bg-slate-800 px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex-row items-center justify-between shadow-sm">
        <View className="flex-row items-center gap-3 flex-1 pr-2">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-700 items-center justify-center"
          >
            <AppText className="text-xl font-bold">‹</AppText>
          </TouchableOpacity>

          <Avatar
            name={otherUser?.name || 'User'}
            url={otherUser?.avatar_url || undefined}
            size="sm"
          />

          <View className="flex-1">
            <View className="flex-row items-center gap-1.5">
              <AppText variant="label" className="font-bold text-slate-900 dark:text-white" numberOfLines={1}>
                {otherUser?.name || 'Pengguna'}
              </AppText>
              {otherUser?.is_vip && <Badge variant="warning" text="VIP" />}
            </View>
            <AppText variant="caption" className="text-emerald-700 dark:text-emerald-300 text-[11px]" numberOfLines={1}>
              🔄 {myItem?.title} ⇄ {theirItem?.title}
            </AppText>
          </View>
        </View>

        {/* Status / Action Button */}
        {isCompleted ? (
          <Badge variant="info" text="Barter Selesai" />
        ) : (
          <TouchableOpacity
            onPress={handleCompleteBarter}
            disabled={actionLoading}
            className="bg-emerald-600 px-3 py-1.5 rounded-full shadow-sm active:bg-emerald-700"
          >
            <AppText className="text-xs text-white font-bold">
              {actionLoading ? 'Memproses...' : '🤝 Selesaikan COD'}
            </AppText>
          </TouchableOpacity>
        )}
      </View>

      {/* Item Context Banner */}
      <View className="bg-emerald-50 dark:bg-emerald-950/40 px-4 py-2 border-b border-emerald-200 dark:border-emerald-800 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2 flex-1 pr-2">
          <AppText className="text-sm">📍</AppText>
          <AppText className="text-xs text-emerald-900 dark:text-emerald-200" numberOfLines={1}>
            Lokasi COD disarankan di area publik yang aman (mall, minimarket, stasiun).
          </AppText>
        </View>
        {offer.cash_supplement && (
          <View className="bg-amber-100 dark:bg-amber-950 px-2 py-0.5 rounded-full">
            <AppText className="text-[10px] text-amber-800 dark:text-amber-200 font-bold">
              +Rp {Number(offer.cash_supplement).toLocaleString('id-ID')}
            </AppText>
          </View>
        )}
      </View>

      {/* Messages ScrollView */}
      <ScrollView
        ref={scrollViewRef}
        className="flex-1 px-4 py-3"
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map((msg) => {
          const isMe = msg.sender_id === user?.id;
          const isSystem = msg.type === 'system';

          if (isSystem) {
            return (
              <View key={msg.id} className="my-3 items-center px-4">
                <View className="bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/80 px-4 py-2.5 rounded-2xl max-w-[90%] shadow-sm">
                  <AppText className="text-xs text-center text-amber-900 dark:text-amber-200 leading-4 font-medium">
                    📢 {msg.message}
                  </AppText>
                  {msg.created_at && (
                    <AppText className="text-[10px] text-center text-amber-600 dark:text-amber-400 mt-1">
                      {new Date(msg.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </AppText>
                  )}
                </View>
              </View>
            );
          }

          return (
            <View
              key={msg.id}
              className={`my-1.5 flex-row ${isMe ? 'justify-end' : 'justify-start'}`}
            >
              {!isMe && (
                <View className="mr-2 self-end mb-1">
                  <Avatar
                    name={msg.sender?.name || otherUser?.name || 'U'}
                    url={msg.sender?.avatar_url || otherUser?.avatar_url || undefined}
                    size="sm"
                  />
                </View>
              )}

              <View
                className={`max-w-[78%] px-4 py-2.5 rounded-2xl shadow-sm ${
                  isMe
                    ? 'bg-brand-600 rounded-br-xs'
                    : 'bg-white dark:bg-slate-800 rounded-bl-xs border border-slate-200 dark:border-slate-700'
                }`}
              >
                <AppText
                  className={`text-sm leading-5 ${
                    isMe ? 'text-white' : 'text-slate-900 dark:text-slate-100'
                  }`}
                >
                  {msg.message}
                </AppText>
                <View className="flex-row justify-end items-center gap-1 mt-1">
                  <AppText
                    className={`text-[10px] ${
                      isMe ? 'text-emerald-100' : 'text-slate-400'
                    }`}
                  >
                    {msg.created_at
                      ? new Date(msg.created_at).toLocaleTimeString('id-ID', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : ''}
                  </AppText>
                  {isMe && (
                    <AppText className="text-[10px] text-emerald-100">
                      {msg.read_at ? '✓✓' : '✓'}
                    </AppText>
                  )}
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Bottom Message Input Bar */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      >
        {isCompleted ? (
          <View className="bg-slate-200 dark:bg-slate-800 p-3 items-center border-t border-slate-300 dark:border-slate-700">
            <AppText variant="caption" className="text-slate-600 dark:text-slate-400 font-medium">
              ✅ Transaksi barter ini telah selesai dituntaskan.
            </AppText>
          </View>
        ) : (
          <View className="bg-white dark:bg-slate-800 px-4 py-2.5 border-t border-slate-200 dark:border-slate-700 flex-row items-center gap-2">
            <TextInput
              placeholder="Tulis pesan kesepakatan atau titik COD..."
              placeholderTextColor="#94a3b8"
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={1000}
              className="flex-1 bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-white px-4 py-2.5 rounded-2xl max-h-24 text-sm"
            />
            <TouchableOpacity
              onPress={handleSendMessage}
              disabled={!inputText.trim() || sending}
              className={`w-11 h-11 rounded-full items-center justify-center ${
                inputText.trim() && !sending ? 'bg-brand-600' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <AppText className="text-white text-lg font-bold">➤</AppText>
              )}
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

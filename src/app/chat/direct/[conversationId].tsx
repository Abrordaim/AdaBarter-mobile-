import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText, Avatar, Badge, Icon, Button } from '@/components/atoms';
import { RatingModal } from '@/components/organisms';
import { useAuth } from '@/context/AuthContext';
import { chatService, DirectConversation, DirectMessage } from '@/services/chatService';
import { offerService } from '@/services/offerService';
import { meetingPointService, MeetingPointDetails } from '@/services/meetingPointService';

export default function DirectChatRoomScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [conversation, setConversation] = useState<DirectConversation | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [ratingModalVisible, setRatingModalVisible] = useState(false);

  // Meeting point state for matched barters
  const [meetingDetails, setMeetingDetails] = useState<MeetingPointDetails | null>(null);
  const [agreeLoading, setAgreeLoading] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);

  const fetchMeetingDetails = useCallback(async (offerId: number) => {
    try {
      const data = await meetingPointService.getDetails(offerId);
      setMeetingDetails(data);
    } catch {
      // silent
    }
  }, []);

  const loadData = useCallback(async (silent = false) => {
    if (!conversationId) return;
    if (!silent) setLoading(true);

    try {
      const data = await chatService.getDirectMessages(parseInt(conversationId, 10));
      setConversation(data.conversation);
      setMessages(data.messages || []);

      const offerId = data.conversation.offer_id || data.conversation.offer?.id;
      if (offerId && (data.conversation.is_matched || ['matched', 'completed'].includes(data.conversation.offer?.status || ''))) {
        fetchMeetingDetails(offerId);
      }
    } catch (e: any) {
      if (!silent) {
        Alert.alert('Gagal Memuat Chat', e.message || 'Ruang chat tidak dapat diakses.', [
          { text: 'Kembali', onPress: () => router.back() },
        ]);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [conversationId, fetchMeetingDetails]);

  useEffect(() => {
    loadData();

    // Polling setiap 4 detik untuk pesan baru dan update meeting point
    const interval = setInterval(() => {
      loadData(true);
    }, 4000);

    return () => clearInterval(interval);
  }, [loadData]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || !conversationId || sending) return;

    const textToSend = inputText.trim();
    setInputText('');
    setSending(true);

    try {
      const newMsg = await chatService.sendDirectMessage(parseInt(conversationId, 10), textToSend);
      setMessages((prev) => [...prev, newMsg]);
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

  const handleAgreeMeetingPoint = async (meetingPointId: number) => {
    const offerId = conversation?.offer_id || conversation?.offer?.id;
    if (!offerId) return;
    setAgreeLoading(true);
    try {
      await meetingPointService.agree(offerId, meetingPointId);
      Alert.alert(
        'Titik Temu Terkunci! 🔒',
        'Lokasi barter telah resmi disepakati oleh kedua pihak.'
      );
      await fetchMeetingDetails(offerId);
      await loadData(true);
    } catch (e: any) {
      Alert.alert('Gagal Menyetujui', e.message || 'Terjadi kesalahan.');
    } finally {
      setAgreeLoading(false);
    }
  };

  const handleCompleteBarter = async () => {
    const offer = conversation?.offer;
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
              await loadData(true);
              setRatingModalVisible(true);
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
          Membuka ruang chat...
        </AppText>
      </SafeAreaView>
    );
  }

  if (!conversation) return null;

  const otherUser = conversation.other_user || (
    conversation.initiator_id === user?.id ? conversation.receiver : conversation.initiator
  );
  const item = conversation.item;
  const offer = conversation.offer;
  const isMatchedOrCompleted = Boolean(
    conversation.is_matched || (offer && (offer.status === 'matched' || offer.status === 'completed'))
  );
  const isCompleted = offer?.status === 'completed';

  const isOfferer = user?.id === offer?.offerer?.id;
  const offererItemTitle = offer?.offerer_items && offer.offerer_items.length > 1
    ? `${offer.offerer_items.length} Barang`
    : (offer?.offerer_item?.title || 'Barang');
  const targetItemTitle = offer?.target_item?.title || item?.title || 'Barang';

  const myItemTitle = isOfferer ? offererItemTitle : targetItemTitle;
  const theirItemTitle = isOfferer ? targetItemTitle : offererItemTitle;

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

            {isMatchedOrCompleted && offer ? (
              <View className="flex-row items-center gap-1 mt-0.5">
                <AppText className="text-xs text-emerald-700 dark:text-emerald-300 font-medium" numberOfLines={1}>
                  {myItemTitle}
                </AppText>
                <Icon name="swap-horizontal" size={12} color="#059669" />
                <AppText className="text-xs text-emerald-700 dark:text-emerald-300 font-medium" numberOfLines={1}>
                  {theirItemTitle}
                </AppText>
              </View>
            ) : (
              <AppText className="text-[11px] text-slate-400 dark:text-slate-400" numberOfLines={1}>
                {otherUser?.city || 'Pengguna AdaBarter'}
              </AppText>
            )}
          </View>
        </View>

        {/* Right Header Action */}
        {isMatchedOrCompleted && offer ? (
          isCompleted ? (
            offer.has_rated ? (
              <Badge variant="success" text="Sudah Dinilai ⭐" />
            ) : (
              <TouchableOpacity
                onPress={() => setRatingModalVisible(true)}
                style={{
                  backgroundColor: '#eab308',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 20,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Icon name="star" size={13} color="#ffffff" />
                <AppText style={{ fontSize: 11, fontWeight: '700', color: '#ffffff' }}>
                  Beri Rating
                </AppText>
              </TouchableOpacity>
            )
          ) : offer.payment_method === 'gateway' && (offer.price_difference ?? 0) > 0 ? (
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: '/offer/[id]',
                  params: { id: offer.id.toString() },
                })
              }
              className="bg-emerald-600 px-3 py-1.5 rounded-full shadow-sm active:bg-emerald-700"
            >
              <AppText className="text-xs text-white font-bold">
                Bayar
              </AppText>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={handleCompleteBarter}
              disabled={actionLoading}
              className="bg-emerald-600 px-3 py-1.5 rounded-full shadow-sm active:bg-emerald-700"
            >
              <AppText className="text-xs text-white font-bold">
                {actionLoading ? 'Memproses...' : 'Selesaikan COD'}
              </AppText>
            </TouchableOpacity>
          )
        ) : item ? (
          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: '/item/[id]',
                params: { id: item.id.toString() },
              })
            }
            className="flex-row items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1.5 rounded-xl max-w-[130px]"
          >
            {item.primary_image ? (
              <Image source={{ uri: item.primary_image }} className="w-5 h-5 rounded-md" resizeMode="cover" />
            ) : (
              <Icon name="cube-outline" size={14} color="#059669" />
            )}
            <AppText className="text-[10px] text-emerald-800 dark:text-emerald-200 font-bold" numberOfLines={1}>
              {item.title}
            </AppText>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* --- MATCHED BARTER BANNERS (Titik Temu, Tracking) --- */}
      {isMatchedOrCompleted && offer ? (
        <>
          {/* Meeting Point Locked Banner */}
          {meetingDetails?.locked && (
            <View className="bg-emerald-50 dark:bg-emerald-950/40 px-4 py-2.5 border-b border-emerald-200 dark:border-emerald-800 flex-row items-center justify-between">
              <View className="flex-row items-center gap-2 flex-1 pr-2">
                <Icon name="location-sharp" size={16} color="#059669" />
                <View className="flex-1">
                  <AppText className="text-xs text-emerald-700 dark:text-emerald-300" numberOfLines={1}>
                    {meetingDetails.locked.address || 'Titik temu telah dikunci'}
                  </AppText>
                </View>
              </View>
              <View className="flex-row items-center gap-1.5">
                {!isCompleted && (
                  <TouchableOpacity
                    onPress={() =>
                      router.push({
                        pathname: '/offer/tracker',
                        params: { offerId: offer.id.toString() },
                      })
                    }
                    className="bg-emerald-600 px-2.5 py-1 rounded-lg flex-row items-center gap-1 shadow-sm active:bg-emerald-700"
                  >
                    <Icon name="navigate" size={11} color="#ffffff" />
                    <AppText className="text-[11px] font-bold text-white">Lacak</AppText>
                  </TouchableOpacity>
                )}
                {!isCompleted && (
                  <TouchableOpacity
                    onPress={() =>
                      router.push({
                        pathname: '/offer/meeting-point',
                        params: { offerId: offer.id.toString() },
                      })
                    }
                    className="bg-slate-200 dark:bg-slate-700 px-2.5 py-1 rounded-lg"
                  >
                    <AppText className="text-[11px] font-bold text-slate-700 dark:text-slate-200">Ubah</AppText>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Pending Proposal Banner */}
          {!meetingDetails?.locked && meetingDetails?.pending && (
            <View className="bg-amber-50 dark:bg-amber-950/40 px-4 py-2.5 border-b border-amber-200 dark:border-amber-800 flex-row items-center justify-between">
              <View className="flex-row items-center gap-2 flex-1 pr-2">
                <Icon name="time-outline" size={16} color="#d97706" />
                <View className="flex-1">
                  <AppText className="text-xs font-bold text-amber-900 dark:text-amber-200" numberOfLines={1}>
                    {meetingDetails.pending.place_name}
                  </AppText>
                  <AppText className="text-[10px] text-amber-700 dark:text-amber-400" numberOfLines={1}>
                    Diusulkan oleh {meetingDetails.pending.proposer?.name || 'Lawan Barter'}
                  </AppText>
                </View>
              </View>
              <View className="flex-row items-center gap-1.5">
                {meetingDetails.pending.proposed_by !== user?.id && !isCompleted && (
                  <TouchableOpacity
                    onPress={() => handleAgreeMeetingPoint(meetingDetails.pending!.id)}
                    disabled={agreeLoading}
                    className="bg-emerald-600 px-2.5 py-1 rounded-lg"
                  >
                    <AppText className="text-[11px] font-bold text-white">
                      {agreeLoading ? '...' : 'Setujui'}
                    </AppText>
                  </TouchableOpacity>
                )}
                {!isCompleted && (
                  <TouchableOpacity
                    onPress={() =>
                      router.push({
                        pathname: '/offer/meeting-point',
                        params: { offerId: offer.id.toString() },
                      })
                    }
                    className="bg-amber-600 px-2.5 py-1 rounded-lg"
                  >
                    <AppText className="text-[11px] font-bold text-white">Ubah</AppText>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* No Meeting Point Yet Banner */}
          {!meetingDetails?.locked && !meetingDetails?.pending && !isCompleted && (
            <View className="bg-slate-100 dark:bg-slate-800 px-4 py-2.5 border-b border-slate-200 dark:border-slate-700 flex-row items-center justify-between">
              <View className="flex-row items-center gap-2 flex-1 pr-2">
                <Icon name="navigate-circle-outline" size={16} color="#64748b" />
                <AppText className="text-xs text-slate-600 dark:text-slate-300">
                  Titik temu belum ditentukan bersama.
                </AppText>
              </View>
              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: '/offer/meeting-point',
                    params: { offerId: offer.id.toString() },
                  })
                }
                className="bg-emerald-600 px-2.5 py-1 rounded-lg"
              >
                <AppText className="text-[11px] font-bold text-white">Atur Titik Temu</AppText>
              </TouchableOpacity>
            </View>
          )}
        </>
      ) : (
        /* --- CLEAN DIRECT INQUIRY BANNER (Belum Matched) --- */
        item && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() =>
              router.push({
                pathname: '/item/[id]',
                params: { id: item.id.toString() },
              })
            }
            className="bg-slate-50 dark:bg-slate-800/80 px-4 py-2 border-b border-slate-200 dark:border-slate-700 flex-row items-center justify-between"
          >
            <View className="flex-row items-center gap-2 flex-1">
              <Icon name="chatbubble-ellipses-outline" size={14} color="#059669" />
              <AppText className="text-xs text-slate-700 dark:text-slate-300 font-medium" numberOfLines={1}>
                Menanyakan: <AppText className="font-bold text-emerald-700 dark:text-emerald-300">{item.title}</AppText>
              </AppText>
            </View>
            <AppText className="text-[11px] text-brand-600 font-bold ml-2">Lihat Barang ›</AppText>
          </TouchableOpacity>
        )
      )}

      {/* Messages ScrollView */}
      <ScrollView
        ref={scrollViewRef}
        className="flex-1 px-4 py-3"
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.length === 0 ? (
          <View className="py-12 items-center justify-center">
            <View className="w-14 h-14 bg-emerald-100 dark:bg-emerald-950/40 rounded-full items-center justify-center mb-3">
              <Icon name="chatbubbles-outline" size={26} color="#059669" />
            </View>
            <AppText variant="label" className="font-bold text-slate-800 dark:text-white mb-1">
              Mulai Percakapan
            </AppText>
            <AppText variant="caption" className="text-slate-400 text-center text-xs px-6">
              Tanyakan ketersediaan barang, spesifikasi, atau ajukan tawaran secara langsung.
            </AppText>
          </View>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === user?.id;
            const isSystem = msg.type === 'system';

            if (isSystem) {
              return (
                <View key={msg.id} className="my-2.5 items-center px-4">
                  <View className="bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/80 px-3.5 py-2 rounded-2xl max-w-[90%] shadow-sm">
                    <AppText className="text-xs text-center text-amber-900 dark:text-amber-200 leading-4 font-medium">
                      {msg.message}
                    </AppText>
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
                      className={`text-xs ${
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
                      <AppText className="text-xs text-emerald-100">
                        {msg.read_at ? '✓✓' : '✓'}
                      </AppText>
                    )}
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Bottom Message Input Bar */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      >
        {isCompleted ? (
          <View className="bg-slate-200 dark:bg-slate-800 p-3 items-center border-t border-slate-300 dark:border-slate-700">
            <AppText variant="caption" className="text-slate-600 dark:text-slate-400 font-medium">
              Transaksi barter ini telah selesai dituntaskan.
            </AppText>
          </View>
        ) : (
          <View className="bg-white dark:bg-slate-800 px-4 py-2.5 border-t border-slate-200 dark:border-slate-700 flex-row items-center gap-2">
            <TextInput
              placeholder="Tulis pesan..."
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

      {/* Barter Rating Modal if Completed */}
      {offer && (
        <RatingModal
          visible={ratingModalVisible}
          offerId={offer.id}
          targetUser={
            otherUser
              ? {
                  id: otherUser.id,
                  name: otherUser.name,
                  avatar_url: otherUser.avatar_url,
                  city: otherUser.city,
                }
              : null
          }
          onClose={() => setRatingModalVisible(false)}
          onSuccess={() => {
            setRatingModalVisible(false);
            loadData(true);
          }}
        />
      )}
    </SafeAreaView>
  );
}

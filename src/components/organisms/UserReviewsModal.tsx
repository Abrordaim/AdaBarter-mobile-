import React, { useState, useEffect } from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { AppText, Avatar, Badge, Icon } from '@/components/atoms';
import { ratingService, Rating, UserRatingsResponse } from '@/services/ratingService';

interface UserReviewsModalProps {
  visible: boolean;
  userId: number | null;
  userName?: string;
  onClose: () => void;
}

export function UserReviewsModal({
  visible,
  userId,
  userName,
  onClose,
}: UserReviewsModalProps) {
  const [data, setData] = useState<UserRatingsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (visible && userId) {
      loadRatings();
    } else {
      setData(null);
    }
  }, [visible, userId]);

  const loadRatings = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await ratingService.getUserRatings(userId);
      setData(res);
    } catch (e: any) {
      console.log('Failed to fetch user ratings:', e);
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  const user = data?.user;
  const ratings = data?.ratings || [];
  const avgRating = user?.average_rating ?? 0;
  const count = user?.ratings_count ?? 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '85%', minHeight: '50%', paddingBottom: 24 }}>
          {/* Handle bar */}
          <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 8 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#cbd5e1' }} />
          </View>

          {/* Top header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <AppText variant="h3" style={{ fontWeight: '700', color: '#0f172a' }}>
                Ulasan & Reputasi Barter
              </AppText>
              <AppText variant="caption" style={{ color: '#64748b' }}>
                {user?.name || userName || 'Pengguna'}
              </AppText>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}
            >
              <AppText style={{ fontSize: 16, fontWeight: '700', color: '#64748b' }}>✕</AppText>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 }}>
              <ActivityIndicator size="large" color="#059669" />
              <AppText variant="caption" style={{ color: '#64748b', marginTop: 10 }}>
                Memuat riwayat ulasan...
              </AppText>
            </View>
          ) : (
            <FlatList
              data={ratings}
              keyExtractor={(item) => item.id.toString()}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 30 }}
              ListHeaderComponent={
                <View style={{ backgroundColor: '#f8fafc', borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0', padding: 16, marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                  {/* Big score */}
                  <View style={{ alignItems: 'center', paddingRight: 14, borderRightWidth: 1, borderRightColor: '#e2e8f0' }}>
                    <AppText style={{ fontSize: 20, fontWeight: '900', color: '#0f172a' }}>
                      {count > 0 && avgRating > 0 ? avgRating.toFixed(1) : '-'}
                    </AppText>
                    <View style={{ flexDirection: 'row', gap: 2, marginVertical: 3 }}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Icon
                          key={s}
                          name={s <= Math.round(avgRating) ? 'star' : 'star-outline'}
                          size={14}
                          color="#eab308"
                        />
                      ))}
                    </View>
                    <AppText style={{ fontSize: 11, color: '#64748b', fontWeight: '500' }}>
                      dari 5.0
                    </AppText>
                  </View>

                  {/* Summary text */}
                  <View style={{ flex: 1 }}>
                    <AppText style={{ fontSize: 13, fontWeight: '700', color: '#0f172a', marginBottom: 2 }}>
                      {count > 0 ? `${count} Penilaian Barter` : 'Belum Ada Penilaian'}
                    </AppText>
                    <AppText style={{ fontSize: 11, color: '#64748b', lineHeight: 16 }}>
                      {count > 0
                        ? 'Penilaian asli dari mitra barter yang telah menuntaskan transaksi COD.'
                        : 'Pengguna ini belum menerima ulasan dari transaksi barter terdahulu.'}
                    </AppText>
                  </View>
                </View>
              }
              ListEmptyComponent={
                <View style={{ alignItems: 'center', paddingVertical: 30 }}>
                  <Icon name="star-outline" size={40} color="#cbd5e1" />
                  <AppText style={{ fontSize: 14, fontWeight: '700', color: '#475569', marginTop: 10 }}>
                    Belum Ada Ulasan
                  </AppText>
                  <AppText style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', marginTop: 4 }}>
                    Belum ada ulasan yang ditinggalkan oleh penukar lain untuk akun ini.
                  </AppText>
                </View>
              }
              renderItem={({ item }: { item: Rating }) => (
                <View style={{ backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9', padding: 14, marginBottom: 10 }}>
                  {/* Rater Info */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Avatar
                        name={item.rater?.name || 'User'}
                        url={item.rater?.avatar_url || undefined}
                        size="sm"
                      />
                      <View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <AppText style={{ fontSize: 13, fontWeight: '700', color: '#0f172a' }}>
                            {item.rater?.name || 'Pengguna'}
                          </AppText>
                          {item.rater?.is_vip && <Badge variant="warning" text="VIP" />}
                        </View>
                        <AppText style={{ fontSize: 10, color: '#94a3b8' }}>
                          📍 {item.rater?.city || 'Indonesia'}
                        </AppText>
                      </View>
                    </View>

                    {/* Stars */}
                    <View style={{ flexDirection: 'row', gap: 2 }}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Icon
                          key={s}
                          name={s <= item.rating ? 'star' : 'star-outline'}
                          size={13}
                          color="#eab308"
                        />
                      ))}
                    </View>
                  </View>

                  {/* Comment */}
                  {item.comment ? (
                    <AppText style={{ fontSize: 12, color: '#334155', lineHeight: 18 }}>
                      "{item.comment}"
                    </AppText>
                  ) : (
                    <AppText style={{ fontSize: 11, fontStyle: 'italic', color: '#94a3b8' }}>
                      (Tidak memberikan catatan ulasan tertulis)
                    </AppText>
                  )}

                  {/* Date */}
                  {item.created_at ? (
                    <AppText style={{ fontSize: 10, color: '#cbd5e1', textAlign: 'right', marginTop: 6 }}>
                      {new Date(item.created_at).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </AppText>
                  ) : null}
                </View>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

import React, { useState } from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { AppText, Button, Avatar, Icon } from '@/components/atoms';
import { ratingService } from '@/services/ratingService';

interface RatingModalProps {
  visible: boolean;
  offerId: number | null;
  targetUser: {
    id: number;
    name: string;
    avatar_url?: string | null;
    city?: string | null;
  } | null;
  onClose: () => void;
  onSuccess: () => void;
}

const RATING_LABELS: Record<number, { text: string; emoji: string }> = {
  1: { text: 'Sangat Mengecewakan', emoji: '😞' },
  2: { text: 'Kurang Memuaskan', emoji: '😕' },
  3: { text: 'Cukup Baik', emoji: '😐' },
  4: { text: 'Bagus & Menyenangkan', emoji: '😊' },
  5: { text: 'Sangat Puas & Recommended!', emoji: '🤩' },
};

export function RatingModal({
  visible,
  offerId,
  targetUser,
  onClose,
  onSuccess,
}: RatingModalProps) {
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const handleSubmit = async () => {
    if (!offerId || rating < 1) {
      Alert.alert('Perhatian', 'Harap pilih minimal 1 bintang.');
      return;
    }

    setSubmitting(true);
    try {
      await ratingService.createRating({
        offer_id: offerId,
        rating,
        comment: comment.trim() || undefined,
      });

      Alert.alert('Penilaian Terkirim! 🎉', 'Terima kasih atas ulasan Anda. Reputasi pengguna telah diperbarui.');
      setComment('');
      setRating(5);
      onSuccess();
    } catch (e: any) {
      const msg = e.errors?.rating?.[0] || e.message || 'Gagal mengirim penilaian.';
      Alert.alert('Gagal Mengirim', msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!visible || !offerId || !targetUser) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 }}
      >
        <View style={{ backgroundColor: '#fff', width: '100%', borderRadius: 24, padding: 20, maxWidth: 400, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8 }}>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Header info */}
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <Avatar
                name={targetUser.name}
                url={targetUser.avatar_url || undefined}
                size="lg"
              />
              <AppText variant="h3" style={{ fontWeight: '700', marginTop: 10, textAlign: 'center', color: '#0f172a' }}>
                Beri Penilaian Barter
              </AppText>
              <AppText variant="caption" style={{ color: '#64748b', textAlign: 'center', marginTop: 2 }}>
                Bagaimana pengalaman barter Anda dengan {targetUser.name}?
              </AppText>
            </View>

            {/* Star selector */}
            <View style={{ alignItems: 'center', marginVertical: 8 }}>
              <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    activeOpacity={0.7}
                    onPress={() => setRating(star)}
                    style={{ padding: 4 }}
                  >
                    <Icon
                      name={star <= rating ? 'star' : 'star-outline'}
                      size={36}
                      color="#eab308"
                    />
                  </TouchableOpacity>
                ))}
              </View>

              {/* Dynamic Rating Label */}
              <View style={{ marginTop: 8, backgroundColor: '#fef9c3', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 }}>
                <AppText style={{ fontSize: 13, fontWeight: '700', color: '#854d0e', textAlign: 'center' }}>
                  {RATING_LABELS[rating]?.emoji} {RATING_LABELS[rating]?.text}
                </AppText>
              </View>
            </View>

            {/* Comment input */}
            <View style={{ marginTop: 14 }}>
              <AppText style={{ fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 6 }}>
                Ulasan / Komentar (Opsional)
              </AppText>
              <TextInput
                placeholder="Contoh: Barang sangat mulus sesuai deskripsi, penjual ramah dan tepat waktu saat COD..."
                placeholderTextColor="#94a3b8"
                value={comment}
                onChangeText={setComment}
                multiline
                numberOfLines={3}
                maxLength={500}
                style={{
                  backgroundColor: '#f8fafc',
                  borderWidth: 1,
                  borderColor: '#e2e8f0',
                  borderRadius: 14,
                  padding: 12,
                  fontSize: 13,
                  color: '#0f172a',
                  textAlignVertical: 'top',
                  minHeight: 80,
                }}
              />
              <AppText style={{ fontSize: 10, color: '#94a3b8', textAlign: 'right', marginTop: 4 }}>
                {comment.length}/500 karakter
              </AppText>
            </View>

            {/* Action Buttons */}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
              <View style={{ flex: 1 }}>
                <Button
                  title="Nanti Saja"
                  variant="secondary"
                  size="md"
                  disabled={submitting}
                  onPress={onClose}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  title="Kirim Ulasan"
                  variant="primary"
                  size="md"
                  loading={submitting}
                  onPress={handleSubmit}
                />
              </View>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

  import React from 'react';
import { View, TouchableOpacity, Linking, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { AppText, Icon, Avatar, MeetingStatusBadge } from '@/components/atoms';
import { MeetingPoint, MeetingPointDetails } from '@/services/meetingPointService';

export interface MeetingPointCardProps {
  offerId: number;
  offerStatus?: string;
  meetingDetails: MeetingPointDetails | null;
  currentUserId?: number;
  loading?: boolean;
  onAgree?: (meetingPointId: number) => Promise<void>;
  agreeLoading?: boolean;
  compact?: boolean;
  className?: string;
}

export const MeetingPointCard: React.FC<MeetingPointCardProps> = ({
  offerId,
  offerStatus = 'matched',
  meetingDetails,
  currentUserId,
  loading = false,
  onAgree,
  agreeLoading = false,
  compact = false,
  className = '',
}) => {
  const router = useRouter();
  const isCompleted = offerStatus === 'completed';
  const isMatched = offerStatus === 'matched';

  if (loading) {
    return (
      <View className={`bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm ${className}`}>
        <View className="flex-row items-center gap-2 mb-2">
          <ActivityIndicator size="small" color="#059669" />
          <AppText variant="caption" className="text-slate-500">
            Memuat status titik temu...
          </AppText>
        </View>
      </View>
    );
  }

  const locked = meetingDetails?.locked;
  const pending = meetingDetails?.pending;
  const activeMeeting: MeetingPoint | null = locked || pending || null;

  const handleOpenMaps = (url?: string, lat?: string | number, lng?: string | number, withDirections = true) => {
    if (lat && lng && withDirections) {
      // Direct turn-by-turn driving route like Google Maps
      const navUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
      Linking.openURL(navUrl).catch(() => {
        if (url) {
          Linking.openURL(url);
        } else {
          Alert.alert('Gagal Membuka Peta', 'Tidak dapat membuka aplikasi Google Maps.');
        }
      });
      return;
    }
    if (url) {
      Linking.openURL(url).catch(() => {
        Alert.alert('Gagal Membuka Peta', 'Tidak dapat membuka tautan Google Maps.');
      });
      return;
    }
    if (lat && lng) {
      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
      Linking.openURL(mapsUrl);
    }
  };

  // State 1: Belum ada titik temu sama sekali
  if (!activeMeeting) {
    if (isCompleted) {
      return null;
    }

    return (
      <View className={`bg-white dark:bg-slate-800 rounded-2xl p-4 border border-dashed border-emerald-300 dark:border-emerald-800 shadow-sm ${className}`}>
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-row items-center gap-2">
            <View className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950 items-center justify-center">
              <Icon name="location" size={18} color="#059669" />
            </View>
            <AppText variant="label" className="font-bold text-slate-800 dark:text-white">
              Titik & Waktu Pertemuan
            </AppText>
          </View>
        </View>

        <AppText variant="caption" className="text-slate-500 dark:text-slate-400 mb-3 leading-4">
          Belum ada lokasi & waktu barter yang disepakati. Tentukan lokasi aman (misal: mall, minimarket, stasiun) untuk bertransaksi COD.
        </AppText>

        {isMatched && (
          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: '/offer/meeting-point',
                params: { offerId: offerId.toString(), mode: 'propose' },
              })
            }
            className="bg-emerald-600 active:bg-emerald-700 py-2.5 px-4 rounded-xl flex-row items-center justify-center gap-2 shadow-sm"
          >
            <Icon name="add-circle-outline" size={18} color="#ffffff" />
            <AppText className="text-white text-xs font-bold">
              Atur Titik Temu Sekarang
            </AppText>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // State 2: Terkunci (Locked)
  if (locked) {
    return (
      <View className={`bg-white dark:bg-slate-800 rounded-2xl p-4 border-2 border-emerald-500/50 dark:border-emerald-500/40 shadow-sm ${className}`}>
        {/* Header */}
        <View className="flex-row items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-slate-700">
          <View className="flex-row items-center gap-2">
            <View className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950 items-center justify-center">
              <Icon name="lock-closed" size={17} color="#059669" />
            </View>
            <View>
              <AppText variant="label" className="font-bold text-slate-900 dark:text-white">
                {isCompleted ? 'Titik Temu Barter' : 'Titik Temu Resmi'}
              </AppText>
              <AppText variant="caption" className="text-slate-400 text-[10px]">
                {isCompleted ? 'Transaksi telah selesai' : 'Kedua pihak telah setuju'}
              </AppText>
            </View>
          </View>
          {/* <MeetingStatusBadge status="locked" /> */}
        </View>

        {/* Location Info */}
        <View className="bg-emerald-50/70 dark:bg-emerald-950/30 p-3 rounded-xl mb-3 border border-emerald-100 dark:border-emerald-800">
          <View className="flex-row items-start gap-2 mb-2">
            <Icon name="location-outline" size={18} color="#059669" />
            <View className="flex-1">
              <AppText className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                {locked.place_name}
              </AppText>
              {Boolean(locked.address) && (
                <AppText className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {locked.address}
                </AppText>
              )}
            </View>
          </View>

          {Boolean(locked.notes) && (
            <View className="flex-row items-start gap-2 pt-2 border-t border-emerald-100 dark:border-emerald-800 mt-2">
              <Icon name="chatbubble-outline" size={15} color="#059669" />
              <AppText className="text-xs text-slate-600 dark:text-slate-300 flex-1 italic">
                "{locked.notes}"
              </AppText>
            </View>
          )}
        </View>

        {/* Actions */}
        <View className="gap-2">
          {/* Lacak Perjalanan button - Hanya saat status matched (belum selesai) */}
          {isMatched && (
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: '/offer/tracker',
                  params: { offerId: offerId.toString() },
                })
              }
              className="bg-blue-600 active:bg-blue-700 py-2.5 px-4 rounded-xl flex-row items-center justify-center gap-2 shadow-sm"
            >
              {/* <AppText className="text-lg">🗺️</AppText> */}
              <AppText className="text-white text-xs font-bold">OTW</AppText>
            </TouchableOpacity>
          )}

          <View className="flex-row items-center gap-2">
            <TouchableOpacity
              onPress={() => handleOpenMaps(locked.maps_url, locked.latitude, locked.longitude, true)}
              className="flex-1 bg-emerald-600 active:bg-emerald-700 py-2.5 px-3 rounded-xl flex-row items-center justify-center gap-1.5 shadow-sm"
            >
              <Icon name="navigate-outline" size={16} color="#ffffff" />
              <AppText className="text-white text-xs font-bold">
                Rute Google Maps
              </AppText>
            </TouchableOpacity>

            {/* Ubah Lokasi button - Hanya saat status matched (belum selesai) */}
            {isMatched && (
              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: '/offer/meeting-point',
                    params: { offerId: offerId.toString(), mode: 'counter' },
                  })
                }
                className="px-3 py-2.5 bg-slate-100 dark:bg-slate-700 rounded-xl flex-row items-center justify-center"
              >
                <Icon name="swap-horizontal" size={16} color="#475569" />
                <AppText className="text-slate-700 dark:text-slate-200 text-xs font-semibold ml-1">
                  Ubah Lokasi
                </AppText>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  }

  // State 3: Menunggu Persetujuan (Pending / Proposed)
  if (isCompleted) {
    return null;
  }

  const isProposedByMe = Boolean(currentUserId && pending?.proposed_by === currentUserId);
  const proposerName = isProposedByMe
    ? 'Anda'
    : (pending?.proposer?.name || 'Pihak Lawan');

  return (
    <View className={`bg-white dark:bg-slate-800 rounded-2xl p-4 border border-amber-300 dark:border-amber-700/60 shadow-sm ${className}`}>
      {/* Header */}
      <View className="flex-row items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-slate-700">
        <View className="flex-row items-center gap-2">
          <View className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-950 items-center justify-center">
            <Icon name="timer-outline" size={18} color="#d97706" />
          </View>
          <View>
            <AppText variant="label" className="font-bold text-slate-900 dark:text-white">
              Usulan Titik Temu
            </AppText>
            <AppText variant="caption" className="text-slate-400 text-[10px]">
              Diusulkan oleh {proposerName}
            </AppText>
          </View>
        </View>
        {/* <MeetingStatusBadge status="proposed" /> */}
      </View>

      {/* Location Info */}
      <View className="bg-amber-50/60 dark:bg-amber-950/30 p-3 rounded-xl mb-3 border border-amber-100 dark:border-amber-900">
        <View className="flex-row items-start gap-2 mb-2">
          <Icon name="location-outline" size={18} color="#d97706" />
          <View className="flex-1">
            <AppText className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
              {pending?.place_name}
            </AppText>
            {Boolean(pending?.address) && (
              <AppText className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {pending?.address}
              </AppText>
            )}
          </View>
        </View>

        {Boolean(pending?.notes) && (
          <View className="flex-row items-start gap-2 pt-2 border-t border-amber-100 dark:border-amber-900 mt-2">
            <Icon name="chatbubble-outline" size={14} color="#d97706" />
            <AppText className="text-xs text-slate-600 dark:text-slate-300 flex-1 italic">
              "{pending?.notes}"
            </AppText>
          </View>
        )}
      </View>

      {/* Action Buttons */}
      {isProposedByMe ? (
        <View className="flex-row items-center gap-2">
          <View className="flex-1 bg-slate-50 dark:bg-slate-700/50 p-2.5 rounded-xl">
            <AppText variant="caption" className="text-slate-500 dark:text-slate-400 text-xs text-center">
              Menunggu persetujuan lawan barter...
            </AppText>
          </View>

          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: '/offer/meeting-point',
                params: { offerId: offerId.toString(), mode: 'counter' },
              })
            }
            className="px-3.5 py-2.5 bg-slate-100 dark:bg-slate-700 rounded-xl"
          >
            <AppText className="text-slate-700 dark:text-slate-200 text-xs font-bold">
              Ubah Usulan
            </AppText>
          </TouchableOpacity>
        </View>
      ) : (
        <View className="space-y-2">
          <View className="flex-row items-center gap-2">
            <TouchableOpacity
              onPress={() => pending && onAgree && onAgree(pending.id)}
              disabled={agreeLoading}
              className="flex-1 bg-emerald-600 active:bg-emerald-700 py-2.5 px-3 rounded-xl flex-row items-center justify-center gap-1.5 shadow-sm"
            >
              {agreeLoading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Icon name="checkmark-circle" size={18} color="#ffffff" />
                  <AppText className="text-white text-xs font-bold">
                    Setujui Titik Temu 
                  </AppText>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: '/offer/meeting-point',
                  params: { offerId: offerId.toString(), mode: 'counter' },
                })
              }
              className="px-3 py-2.5 bg-slate-100 dark:bg-slate-700 rounded-xl flex-row items-center justify-center"
            >
              <Icon name="swap-horizontal" size={16} color="#475569" />
              <AppText className="text-slate-700 dark:text-slate-200 text-xs font-semibold ml-1">
                Ajukan Titik Lain
              </AppText>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={() => handleOpenMaps(pending?.maps_url, pending?.latitude, pending?.longitude)}
            className="flex-row items-center justify-center gap-1 mt-1 py-1"
          >
            <Icon name="map-outline" size={14} color="#059669" />
            <AppText className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              Lihat di Peta
            </AppText>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

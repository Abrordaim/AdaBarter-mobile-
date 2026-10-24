import React, { useRef, useState } from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  StatusBar,
} from 'react-native';
import { WebView, WebViewNavigation } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, Icon } from '@/components/atoms';

// URL sentinel yang di-intersep WebView untuk mendeteksi status pembayaran.
// URL ini tidak harus aktif — WebView mencegat navigasi ke URL ini sebelum di-load.
const FINISH_HOST = 'adabarter.payment';

export type PaymentStatus = 'success' | 'pending' | 'error' | 'cancelled';

interface MidtransPaymentWebViewProps {
  /** URL Snap Midtrans (vtweb redirect URL) */
  snapUrl: string;
  /** Nominal yang dibayar (untuk ditampilkan di header) */
  amount?: number;
  onPaymentFinish: (status: PaymentStatus) => void;
  onClose: () => void;
}

export function MidtransPaymentWebView({
  snapUrl,
  amount,
  onPaymentFinish,
  onClose,
}: MidtransPaymentWebViewProps) {
  const insets = useSafeAreaInsets();
  const webViewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);
  const [hasFinished, setHasFinished] = useState(false);

  const handleNavigationStateChange = (state: WebViewNavigation) => {
    setCanGoBack(state.canGoBack);

    // Cek apakah URL adalah callback dari Midtrans ke domain sentinel kita
    if (state.url && state.url.includes(FINISH_HOST) && !hasFinished) {
      setHasFinished(true);

      // Parse status dari query param tanpa ketergantungan pada new URL()
      let status: PaymentStatus = 'pending';
      if (state.url.includes('status=success')) status = 'success';
      else if (state.url.includes('status=error')) status = 'error';
      else status = 'pending';

      onPaymentFinish(status);
    }
  };

  const handleClose = () => {
    if (hasFinished) {
      onClose();
      return;
    }
    Alert.alert(
      'Batalkan Pembayaran?',
      'Pembayaran belum selesai. Apakah Anda yakin ingin keluar?',
      [
        { text: 'Lanjutkan Bayar', style: 'cancel' },
        {
          text: 'Keluar',
          style: 'destructive',
          onPress: () => {
            onPaymentFinish('cancelled');
            onClose();
          },
        },
      ]
    );
  };

  const formattedAmount = amount
    ? `Rp ${Number(amount).toLocaleString('id-ID')}`
    : 'Pembayaran';

  return (
    <Modal visible={true} animationType="slide" onRequestClose={handleClose} transparent={false}>
      <View
        style={{ flex: 1, backgroundColor: '#fff', paddingTop: insets.top }}
      >
        {/* ── Header ─────────────────────────────────── */}
        <View className="flex-row items-center px-4 py-3 bg-white border-b border-slate-100">
          <TouchableOpacity
            onPress={handleClose}
            className="p-2 rounded-full bg-slate-100 mr-3"
          >
            <Icon name="close" size={20} color="#374151" />
          </TouchableOpacity>

          <View className="flex-1">
            <AppText className="text-sm font-extrabold text-slate-900">
              Pembayaran Midtrans
            </AppText>
            <AppText className="text-xs text-slate-500">{formattedAmount}</AppText>
          </View>

          {/* Back button di WebView */}
          {canGoBack && (
            <TouchableOpacity
              onPress={() => webViewRef.current?.goBack()}
              className="p-2 rounded-full bg-slate-100"
            >
              <Icon name="arrow-back" size={18} color="#374151" />
            </TouchableOpacity>
          )}
        </View>

        {/* ── WebView ────────────────────────────────── */}
        <View className="flex-1 relative">
          <WebView
            ref={webViewRef}
            source={{ uri: snapUrl }}
            onNavigationStateChange={handleNavigationStateChange}
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => setLoading(false)}
            onError={() => {
              Alert.alert(
                'Koneksi Bermasalah',
                'Gagal memuat halaman pembayaran. Periksa koneksi internet Anda.',
                [{ text: 'Tutup', onPress: onClose }]
              );
            }}
            originWhitelist={['*']}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={false}
            setSupportMultipleWindows={false}
            onShouldStartLoadWithRequest={(request) => {
              if (request.url.includes(FINISH_HOST)) {
                if (!hasFinished) {
                  setHasFinished(true);
                  let status: PaymentStatus = 'pending';
                  if (request.url.includes('status=success')) status = 'success';
                  else if (request.url.includes('status=error')) status = 'error';
                  onPaymentFinish(status);
                }
                return false;
              }
              return true;
            }}
            style={{ flex: 1 }}
          />

          {/* Loading overlay */}
          {loading && (
            <View className="absolute inset-0 bg-white items-center justify-center">
              <ActivityIndicator size="large" color="#059669" />
              <AppText className="text-slate-500 mt-3 text-sm">
                Memuat halaman pembayaran…
              </AppText>
            </View>
          )}
        </View>

        {/* ── Footer keamanan ───────────────────────── */}
        <View
          className="flex-row items-center justify-center gap-2 py-3 bg-slate-50 border-t border-slate-100"
          style={{ paddingBottom: Math.max(insets.bottom, 12) }}
        >
          <Icon name="shield-checkmark" size={14} color="#059669" />
          <AppText className="text-xs text-slate-500">
            Pembayaran aman & terenkripsi oleh Midtrans
          </AppText>
        </View>
      </View>
    </Modal>
  );
}

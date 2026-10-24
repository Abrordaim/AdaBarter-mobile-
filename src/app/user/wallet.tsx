import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput, 
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText, Button, Badge, Icon } from '@/components/atoms';
import { useAuth } from '@/context/AuthContext';
import {
  walletService,
  WalletData,
  Withdrawal,
  WalletTransaction,
} from '@/services/walletService';

function formatRp(val: number | string | null | undefined): string {
  if (val === null || val === undefined) return 'Rp 0';
  return `Rp ${Number(val).toLocaleString('id-ID')}`;
}

const POPULAR_BANKS = [
  'BCA',
  'Mandiri',
  'BRI',
  'BNI',
  'BSI',
  'CIMB Niaga',
  'Bank Jago',
  'SeaBank',
];

export default function WalletScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'mutasi' | 'penarikan'>('mutasi');

  // Modal Penarikan
  const [modalVisible, setModalVisible] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [bankName, setBankName] = useState('BCA');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [walletData, withdrawalsData] = await Promise.all([
        walletService.getWallet(),
        walletService.getWithdrawals(),
      ]);
      setWallet(walletData);
      setWithdrawals(withdrawalsData);
    } catch (e: any) {
      Alert.alert('Gagal Memuat', e.message || 'Gagal memuat informasi dompet.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/(auth)/login');
      return;
    }
    fetchData();
  }, [isAuthenticated]);

  const handleOpenWithdraw = () => {
    if (!wallet || wallet.balance < 50000) {
      Alert.alert(
        'Saldo Tidak Mencukupi',
        'Saldo minimum untuk melakukan penarikan adalah Rp 50.000.'
      );
      return;
    }
    setWithdrawAmount('');
    setAccountNumber('');
    setAccountName('');
    setModalVisible(true);
  };

  const handleSubmitWithdraw = async () => {
    const amount = parseInt(withdrawAmount.replace(/[^0-9]/g, ''), 10);

    if (!amount || isNaN(amount)) {
      Alert.alert('Perhatian', 'Masukkan nominal penarikan yang valid.');
      return;
    }
    if (amount < 50000) {
      Alert.alert('Perhatian', 'Nominal penarikan minimal Rp 50.000.');
      return;
    }
    if (wallet && amount > wallet.balance) {
      Alert.alert('Perhatian', 'Nominal penarikan melebihi saldo aktif Anda.');
      return;
    }
    if (!accountNumber.trim()) {
      Alert.alert('Perhatian', 'Masukkan nomor rekening bank tujuan.');
      return;
    }
    if (!accountName.trim()) {
      Alert.alert('Perhatian', 'Masukkan nama pemilik rekening sesuai buku tabungan.');
      return;
    }

    setSubmitting(true);
    try {
      await walletService.requestWithdrawal({
        amount,
        bank_name: bankName,
        account_number: accountNumber.trim(),
        account_name: accountName.trim(),
      });
      setModalVisible(false);
      Alert.alert(
        'Permohonan Terkirim! 🎉',
        'Permohonan penarikan saldo telah dicatat. Admin akan memproses transfer dalam 1×24 jam hari kerja.'
      );
      fetchData(true);
    } catch (e: any) {
      Alert.alert('Gagal Mengajukan', e.message || 'Terjadi kesalahan.');
    } finally {
      setSubmitting(false);
    }
  };

  const getReasonLabel = (reason: string): string => {
    switch (reason) {
      case 'escrow_release':
      case 'escrow_release_dispute':
        return 'Pencairan Selisih Barter';
      case 'escrow_refund':
      case 'escrow_refund_dispute':
        return 'Pengembalian Dana (Refund) Barter';
      case 'escrow_refund_partial':
        return 'Mediasi Parsial Barter';
      case 'escrow_release_partial':
        return 'Pencairan Mediasi Barter';
      case 'withdrawal_pending':
        return 'Penarikan Dana (Ditahan)';
      case 'withdrawal_rejected':
        return 'Saldo Dikembalikan (Penarikan Ditolak)';
      default:
        return reason.replace(/_/g, ' ');
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-900 justify-center items-center">
        <ActivityIndicator size="large" color="#059669" />
        <AppText variant="caption" className="text-slate-500 mt-3">
          Memuat data dompet...
        </AppText>
      </SafeAreaView>
    );
  }

  const balance = wallet?.balance ?? 0;

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-900" edges={['top']}>
      {/* Top Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-emerald-700 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center"
        >
          <AppText className="text-xl font-bold">‹</AppText>
        </TouchableOpacity>
        <AppText variant="h3" className="font-bold text-white">
          Dompet & Saldo Saya
        </AppText>
        <View className="w-10" />
      </View>

      <ScrollView
        className="flex-1 px-4 py-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchData(true)}
            colors={['#059669']}
          />
        }
      >
        {/* Balance Card Banner */}
        <View className="bg-emerald-700 dark:bg-emerald-800 rounded-3xl p-5 mb-5 shadow-lg shadow-emerald-700/20">
          <View className="flex-row items-center justify-between mb-2">
            <AppText className="text-white text-xl font-bold uppercase tracking-wider">
              Saldo AdaBarter
            </AppText>
            
          </View>

          <AppText className="text-3xl font-extrabold text-white mb-1">
            {formatRp(balance)}
          </AppText>

          <AppText className="text-emerald-100/80 text-xs mb-4">
            Dana dari penyelesaian selisih barter (Rekening Bersama Platform).
          </AppText>

          <View className="pt-3 border-t border-emerald-600/60 flex-row gap-3">
            <TouchableOpacity
              onPress={handleOpenWithdraw}
              activeOpacity={0.85}
              className="flex-1 bg-white py-3 px-4 rounded-xl flex-row items-center justify-center gap-2 shadow-sm"
            >
              <Icon name="cash-outline" size={18} color="#047857" />
              <AppText className="text-emerald-800 font-bold text-sm">
                Tarik Saldo ke Rekening
              </AppText>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tab Switcher */}
        <View className="bg-slate-200/70 dark:bg-slate-800 p-1 rounded-2xl flex-row mb-4">
          <TouchableOpacity
            onPress={() => setActiveTab('mutasi')}
            className={`flex-1 py-2.5 rounded-xl items-center ${
              activeTab === 'mutasi'
                ? 'bg-white dark:bg-slate-700 shadow-sm'
                : ''
            }`}
          >
            <AppText
              className={`text-xs font-bold ${
                activeTab === 'mutasi'
                  ? 'text-emerald-700 dark:text-emerald-300'
                  : 'text-slate-500'
              }`}
            >
              Mutasi Saldo ({wallet?.transactions?.length ?? 0})
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('penarikan')}
            className={`flex-1 py-2.5 rounded-xl items-center ${
              activeTab === 'penarikan'
                ? 'bg-white dark:bg-slate-700 shadow-sm'
                : ''
            }`}
          >
            <AppText
              className={`text-xs font-bold ${
                activeTab === 'penarikan'
                  ? 'text-emerald-700 dark:text-emerald-300'
                  : 'text-slate-500'
              }`}
            >
              Riwayat Tarik Saldo ({withdrawals.length})
            </AppText>
          </TouchableOpacity>
        </View>

        {/* Content Tab 1: Mutasi */}
        {activeTab === 'mutasi' && (
          <View className="space-y-3">
            {(!wallet?.transactions || wallet.transactions.length === 0) ? (
              <View className="bg-white dark:bg-slate-800 rounded-2xl p-8 items-center border border-slate-100 dark:border-slate-800">
                <Icon name="receipt-outline" size={40} color="#94a3b8" />
                <AppText className="font-bold text-slate-700 dark:text-slate-300 mt-2">
                  Belum Ada Mutasi Saldo
                </AppText>
                <AppText className="text-xs text-slate-400 text-center mt-1">
                  Mutasi saldo akan muncul saat ada selisih barter yang dicairkan atau ditarik.
                </AppText>
              </View>
            ) : (
              wallet.transactions.map((t: WalletTransaction) => {
                const isCredit = t.type === 'credit';
                return (
                  <View
                    key={t.id}
                    className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 flex-row items-center justify-between shadow-sm mb-2"
                  >
                    <View className="flex-row items-center gap-3 flex-1 pr-2">
                      <View
                        className={`w-10 h-10 rounded-full items-center justify-center ${
                          isCredit
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700'
                            : 'bg-rose-100 dark:bg-rose-950 text-rose-700'
                        }`}
                      >
                        <Icon
                          name={isCredit ? 'arrow-down' : 'arrow-up'}
                          size={18}
                          color={isCredit ? '#059669' : '#e11d48'}
                        />
                      </View>
                      <View className="flex-1">
                        <AppText className="font-bold text-sm text-slate-900 dark:text-white capitalize" numberOfLines={1}>
                          {getReasonLabel(t.reason)}
                        </AppText>
                        <AppText className="text-[11px] text-slate-400 mt-0.5">
                          {t.created_at ? new Date(t.created_at).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          }) : ''}
                        </AppText>
                      </View>
                    </View>

                    <View className="items-end">
                      <AppText
                        className={`font-extrabold text-sm ${
                          isCredit
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {isCredit ? '+' : '-'}{formatRp(t.amount)}
                      </AppText>
                      <AppText className="text-[10px] text-slate-400 mt-0.5">
                        Saldo: {formatRp(t.balance_after)}
                      </AppText>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* Content Tab 2: Penarikan */}
        {activeTab === 'penarikan' && (
          <View className="space-y-3">
            {withdrawals.length === 0 ? (
              <View className="bg-white dark:bg-slate-800 rounded-2xl p-8 items-center border border-slate-100 dark:border-slate-800">
                <Icon name="cash-outline" size={40} color="#94a3b8" />
                <AppText className="font-bold text-slate-700 dark:text-slate-300 mt-2">
                  Belum Ada Riwayat Penarikan
                </AppText>
                <AppText className="text-xs text-slate-400 text-center mt-1">
                  Ajukan penarikan untuk mencairkan saldo Anda ke rekening bank pribadi.
                </AppText>
              </View>
            ) : (
              withdrawals.map((w: Withdrawal) => {
                let badgeVariant: 'warning' | 'success' | 'error' = 'warning';
                let statusLabel = 'Menunggu Diproses';

                if (w.status === 'paid') {
                  badgeVariant = 'success';
                  statusLabel = 'Lunas / Berhasil';
                } else if (w.status === 'rejected') {
                  badgeVariant = 'error';
                  statusLabel = 'Ditolak';
                }

                return (
                  <View
                    key={w.id}
                    className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 mb-2 shadow-sm"
                  >
                    <View className="flex-row items-center justify-between mb-2">
                      <AppText className="text-xs text-slate-400 font-mono">
                        #WD-{w.id}
                      </AppText>
                      <Badge variant={badgeVariant} text={statusLabel} />
                    </View>

                    <View className="flex-row items-center justify-between mb-3">
                      <View>
                        <AppText className="text-xs text-slate-500 font-medium">
                          Nominal Penarikan
                        </AppText>
                        <AppText className="text-lg font-bold text-slate-900 dark:text-white">
                          {formatRp(w.amount)}
                        </AppText>
                      </View>
                      <View className="items-end">
                        <AppText className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {w.bank_name}
                        </AppText>
                        <AppText className="text-xs font-mono text-slate-500">
                          {w.account_number}
                        </AppText>
                        <AppText className="text-[11px] text-slate-400">
                          a/n {w.account_name}
                        </AppText>
                      </View>
                    </View>

                    {w.rejection_reason && (
                      <View className="bg-red-50 dark:bg-red-950/40 p-2.5 rounded-xl border border-red-100 dark:border-red-900 mb-2">
                        <AppText className="text-[11px] text-red-700 dark:text-red-300">
                          Alasan: {w.rejection_reason}
                        </AppText>
                      </View>
                    )}

                    <AppText className="text-[10px] text-slate-400 text-right">
                      Diajukan: {w.created_at ? new Date(w.created_at).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      }) : ''}
                    </AppText>
                  </View>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      {/* Modal Tarik Saldo */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 bg-black/60 justify-center items-center px-4">
          <View className="bg-white dark:bg-slate-800 rounded-3xl p-5 w-full max-w-sm shadow-2xl">
            <View className="flex-row items-center justify-between mb-2">
              <AppText variant="h3" className="font-bold text-slate-900 dark:text-white">
                Tarik Saldo ke Rekening
              </AppText>
              <TouchableOpacity onPress={() => setModalVisible(false)} className="p-1">
                <AppText className="text-slate-400 text-lg font-bold">&times;</AppText>
              </TouchableOpacity>
            </View>

            <AppText variant="caption" className="text-slate-500 mb-4">
              Saldo tersedia: <AppText className="font-bold text-emerald-600">{formatRp(balance)}</AppText>
            </AppText>

            {/* Input Nominal */}
            <AppText className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Nominal Penarikan (Min. Rp 50.000)
            </AppText>
            <TextInput
              value={withdrawAmount}
              onChangeText={setWithdrawAmount}
              placeholder="Contoh: 100000"
              keyboardType="numeric"
              placeholderTextColor="#94a3b8"
              className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-slate-900 dark:text-white text-sm mb-3"
            />

            {/* Pilihan Bank */}
            <AppText className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Pilih Bank Tujuan
            </AppText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-1.5 mb-3">
              {POPULAR_BANKS.map((b) => (
                <TouchableOpacity
                  key={b}
                  onPress={() => setBankName(b)}
                  className={`px-3 py-1.5 rounded-xl border mr-1.5 ${
                    bankName === b
                      ? 'bg-emerald-600 border-emerald-600'
                      : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <AppText
                    className={`text-xs font-bold ${
                      bankName === b ? 'text-white' : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {b}
                  </AppText>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* No Rekening */}
            <AppText className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Nomor Rekening
            </AppText>
            <TextInput
              value={accountNumber}
              onChangeText={setAccountNumber}
              placeholder="Nomor rekening bank Anda"
              keyboardType="number-pad"
              placeholderTextColor="#94a3b8"
              className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-slate-900 dark:text-white text-sm mb-3"
            />

            {/* Nama Pemilik Rekening */}
            <AppText className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Nama Pemilik Rekening
            </AppText>
            <TextInput
              value={accountName}
              onChangeText={setAccountName}
              placeholder="Sesuai buku tabungan / KTP"
              placeholderTextColor="#94a3b8"
              className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-slate-900 dark:text-white text-sm mb-4"
            />

            <View className="flex-row gap-2">
              <View className="flex-1">
                <Button
                  title="Batal"
                  variant="ghost"
                  size="sm"
                  onPress={() => setModalVisible(false)}
                />
              </View>
              <View className="flex-1">
                <Button
                  title="Ajukan Tarik"
                  variant="primary"
                  size="sm"
                  loading={submitting}
                  onPress={handleSubmitWithdraw}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

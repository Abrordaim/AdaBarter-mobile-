import React, { useState } from 'react';
import { View, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { AuthTemplate } from '@/components/templates';
import { Button, Input, AppText } from '@/components/atoms';
import { useAuth } from '@/context/AuthContext';

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async () => {
    if (!name || !email || !password) {
      setError('Nama, email, dan kata sandi wajib diisi.');
      return;
    }

    if (password.length < 6) {
      setError('Kata sandi minimal 6 karakter.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await register({
        name,
        email,
        password,
        phone: phone || undefined,
        city: city || undefined,
      });
      Alert.alert('Sukses', 'Akun berhasil didaftarkan! Selamat datang di AdaBarter.', [
        { text: 'OK', onPress: () => router.replace('/(tabs)') },
      ]);
    } catch (e: any) {
      const msg = e.message || 'Pendaftaran gagal. Periksa data yang Anda masukkan.';
      setError(msg);
      Alert.alert('Pendaftaran Gagal', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthTemplate
      title="Buat Akun Baru"
      subtitle="Dapatkan 3 slot postingan gratis untuk mulai barter"
      footer={
        <View className="flex-row items-center gap-1">
          <AppText variant="body" className="text-slate-600 dark:text-slate-400">
            Sudah punya akun?
          </AppText>
          <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
            <AppText variant="body" className="text-brand-600 font-bold">
              Masuk
            </AppText>
          </TouchableOpacity>
        </View>
      }
    >
      {error && (
        <View className="bg-red-50 dark:bg-red-900/30 p-3 rounded-lg mb-4 border border-red-200 dark:border-red-800">
          <AppText variant="caption" className="text-red-600 dark:text-red-400 text-center">
            {error}
          </AppText>
        </View>
      )}

      <Input
        label="Nama Lengkap"
        placeholder="Ahmad Pratama"
        value={name}
        onChangeText={setName}
      />

      <Input
        label="Email"
        placeholder="nama@email.com"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <Input
        label="Nomor WhatsApp / HP (Opsional)"
        placeholder="081234567890"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
      />

      <Input
        label="Kota Domisili (Hyperlocal)"
        placeholder="Contoh: Surabaya, Jakarta"
        value={city}
        onChangeText={setCity}
      />

      <Input
        label="Kata Sandi"
        placeholder="Minimal 6 karakter"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <View className="mt-2">
        <Button
          title="Daftar Akun"
          variant="primary"
          loading={loading}
          onPress={handleRegister}
        />
      </View>
    </AuthTemplate>
  );
}

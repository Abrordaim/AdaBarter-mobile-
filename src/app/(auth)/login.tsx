import React, { useState } from 'react';
import { View, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { AuthTemplate } from '@/components/templates';
import { Button, Input, AppText } from '@/components/atoms';
import { useAuth } from '@/context/AuthContext';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Harap isi email dan kata sandi.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await login({ email, password });
      router.replace('/(tabs)');
    } catch (e: any) {
      const msg = e.message || 'Login gagal. Periksa kembali email dan kata sandi Anda.';
      setError(msg);
      Alert.alert('Gagal Masuk', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthTemplate
      title="Selamat Datang"
      subtitle="Masuk untuk mulai menukar barang impianmu"
      footer={
        <View className="flex-row items-center gap-1">
          <AppText variant="body" className="text-slate-600 dark:text-slate-400">
            Belum punya akun?
          </AppText>
          <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
            <AppText variant="body" className="text-brand-600 font-bold">
              Daftar Sekarang
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
        label="Email"
        placeholder="nama@email.com"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <Input
        label="Kata Sandi"
        placeholder="••••••••"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <View className="items-end mb-6">
        <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')}>
          <AppText variant="caption" className="text-brand-600 font-medium">
            Lupa kata sandi?
          </AppText>
        </TouchableOpacity>
      </View>

      <Button
        title="Masuk"
        variant="primary"
        loading={loading}
        onPress={handleLogin}
      />
    </AuthTemplate>
  );
}

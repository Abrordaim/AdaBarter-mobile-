import React, { useState } from 'react';
import { View, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { AuthTemplate } from '@/components/templates';
import { Button, Input, AppText } from '@/components/atoms';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!email) {
      Alert.alert('Perhatian', 'Harap masukkan alamat email akun Anda.');
      return;
    }
    setSubmitted(true);
    Alert.alert(
      'Tautan Pemulihan Terkirim',
      'Instruksi pemulihan kata sandi telah dikirimkan ke email Anda jika akun terdaftar.',
      [{ text: 'OK', onPress: () => router.push('/(auth)/login') }]
    );
  };

  return (
    <AuthTemplate
      title="Lupa Kata Sandi"
      subtitle="Masukkan email akun Anda untuk menerima tautan pemulihan kata sandi"
      footer={
        <TouchableOpacity onPress={() => router.back()}>
          <AppText variant="body" className="text-brand-600 font-medium">
            Kembali ke Halaman Masuk
          </AppText>
        </TouchableOpacity>
      }
    >
      <Input
        label="Email"
        placeholder="nama@email.com"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <Button
        title="Kirim Tautan Pemulihan"
        variant="primary"
        onPress={handleSubmit}
      />
    </AuthTemplate>
  );
}

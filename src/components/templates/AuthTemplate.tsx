import React from 'react';
import { View, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../atoms';

export interface AuthTemplateProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  footer?: React.ReactNode;
}

export const AuthTemplate: React.FC<AuthTemplateProps> = ({
  children,
  title,
  subtitle,
  footer,
}) => {
  return (
    <SafeAreaView className="flex-1 bg-brand-50 dark:bg-slate-900">
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView 
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-1 justify-center px-6 py-12">
            
            <View className="items-center mb-10">
              <View className="w-20 h-20 bg-brand-600 rounded-2xl items-center justify-center mb-4 shadow-sm">
                <AppText className="text-white text-3xl font-bold">AB</AppText>
              </View>
              {title && <AppText variant="h2" className="text-brand-900 dark:text-white text-center mb-2">{title}</AppText>}
              {subtitle && <AppText variant="body" className="text-slate-600 dark:text-slate-400 text-center">{subtitle}</AppText>}
            </View>

            <View className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm w-full">
              {children}
            </View>

            {footer && (
              <View className="mt-8 items-center">
                {footer}
              </View>
            )}

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

import React from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '../organisms';

export interface MainTemplateProps {
  children: React.ReactNode;
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  noScroll?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
  headerContent?: React.ReactNode; // For custom header replace
  className?: string;
  contentClassName?: string;
}

export const MainTemplate: React.FC<MainTemplateProps> = ({
  children,
  title,
  showBack,
  onBack,
  rightAction,
  noScroll = false,
  onRefresh,
  refreshing = false,
  headerContent,
  className = '',
  contentClassName = '',
}) => {
  return (
    <SafeAreaView className={`flex-1 bg-slate-50 dark:bg-slate-900 ${className}`}>
      {headerContent ? headerContent : title ? (
        <Header 
          title={title} 
          showBack={showBack} 
          onBack={onBack} 
          rightAction={rightAction} 
        />
      ) : null}
      
      {noScroll ? (
        <View className={`flex-1 ${contentClassName}`}>
          {children}
        </View>
      ) : (
        <ScrollView 
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            onRefresh ? (
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#059669']} />
            ) : undefined
          }
        >
          <View className={`flex-1 ${contentClassName}`}>
            {children}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

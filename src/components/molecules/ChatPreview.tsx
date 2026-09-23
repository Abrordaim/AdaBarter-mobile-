import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { AppText, Avatar } from '../atoms';

export interface ChatPreviewProps {
  username: string;
  lastMessage: string;
  timestamp: string;
  unreadCount?: number;
  avatarUrl?: string;
  isOnline?: boolean;
  onPress?: () => void;
  className?: string;
}

export const ChatPreview: React.FC<ChatPreviewProps> = ({
  username,
  lastMessage,
  timestamp,
  unreadCount = 0,
  avatarUrl,
  isOnline,
  onPress,
  className = '',
}) => {
  return (
    <TouchableOpacity 
      className={`flex-row items-center p-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 ${className}`}
      onPress={onPress}
    >
      <Avatar 
        source={avatarUrl ? { uri: avatarUrl } : undefined} 
        initials={username} 
        isOnline={isOnline}
        className="mr-3"
      />
      
      <View className="flex-1 justify-center">
        <View className="flex-row justify-between items-center mb-1">
          <AppText variant="label" className={unreadCount > 0 ? 'font-bold' : ''}>
            {username}
          </AppText>
          <AppText variant="caption" className={unreadCount > 0 ? 'text-brand-600 font-medium' : ''}>
            {timestamp}
          </AppText>
        </View>
        <View className="flex-row justify-between items-center">
          <AppText 
            variant="caption" 
            numberOfLines={1} 
            className={`flex-1 pr-2 ${unreadCount > 0 ? 'text-slate-800 dark:text-slate-200 font-medium' : ''}`}
          >
            {lastMessage}
          </AppText>
          
          {unreadCount > 0 && (
            <View className="bg-brand-600 rounded-full min-w-[20px] h-5 items-center justify-center px-1">
              <AppText className="text-white text-[10px] font-bold">{unreadCount > 99 ? '99+' : unreadCount}</AppText>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

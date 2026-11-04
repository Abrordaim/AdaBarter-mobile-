import React from 'react';
import { View } from 'react-native';
import { AppText } from './AppText';
import { MeetingPointStatus } from '@/services/meetingPointService';
import { Icon } from './Icon';

export interface MeetingStatusBadgeProps {
  status: MeetingPointStatus;
  className?: string;
}

export const MeetingStatusBadge: React.FC<MeetingStatusBadgeProps> = ({ status, className = '' }) => {
  switch (status) {
    case 'locked':
      return (
        <View className={`px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 flex-row items-center gap-1 border border-emerald-300 dark:border-emerald-800 ${className}`}>
          <AppText className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
            Titik Temu Terkunci 
          </AppText>
        </View>
      );
    case 'proposed':
      return (
        <View className={`px-2.5 py-1   dark:bg-amber-950 flex-row items-center gap-1  dark:border-amber-800 ${className}`}>
          <Icon name={'hourglass-outline'} color={'orange'}/>
        </View>
      );
    case 'superseded':
    default:
      return (
        <View className={`px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 flex-row items-center gap-1 ${className}`}>
          <AppText className="text-[10px] text-slate-500 dark:text-slate-400">
            Digantikan
          </AppText>
        </View>
      );
  }
};

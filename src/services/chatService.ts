import { apiClient } from './api';
import { User } from './authService';
import { BarterOffer } from './offerService';

export interface ChatMessage {
  id: number;
  offer_id: number;
  sender_id: number;
  message: string;
  type: 'text' | 'system' | 'image';
  read_at?: string | null;
  sender?: User;
  created_at?: string;
}

export const chatService = {
  async getConversations(): Promise<BarterOffer[]> {
    const res = await apiClient<BarterOffer[]>('/chats', {
      method: 'GET',
    });
    return res.data;
  },

  async getMessages(offerId: number): Promise<ChatMessage[]> {
    const res = await apiClient<ChatMessage[]>(`/offers/${offerId}/chats`, {
      method: 'GET',
    });
    return res.data;
  },

  async sendMessage(offerId: number, message: string, type: 'text' | 'image' = 'text'): Promise<ChatMessage> {
    const res = await apiClient<ChatMessage>(`/offers/${offerId}/chats`, {
      method: 'POST',
      body: JSON.stringify({ message, type }),
    });
    return res.data;
  },
};

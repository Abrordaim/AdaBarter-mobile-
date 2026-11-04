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

export interface DirectConversationItem {
  id: number;
  title: string;
  condition?: string;
  estimated_price?: number | string | null;
  city?: string | null;
  primary_image?: string | null;
  images?: string[];
  user_id?: number;
}

export interface DirectMessage {
  id: number;
  conversation_id: number;
  sender_id: number;
  message: string;
  type: 'text' | 'image' | 'system';
  read_at?: string | null;
  sender?: User;
  created_at?: string;
}

export interface DirectConversation {
  id: number;
  initiator_id: number;
  receiver_id: number;
  item_id: number;
  offer_id?: number | null;
  offer?: BarterOffer | null;
  is_matched?: boolean;
  last_message_at?: string | null;
  initiator?: User;
  receiver?: User;
  other_user?: User | null;
  item?: DirectConversationItem;
  latest_message?: DirectMessage | null;
  unread_count?: number;
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

  /**
   * Memulai atau membuka ruang chat langsung untuk barang tertentu (Direct Chat)
   */
  async startDirectChat(itemId: number): Promise<DirectConversation> {
    const res = await apiClient<DirectConversation>(`/items/${itemId}/direct-chat`, {
      method: 'POST',
    });
    return res.data;
  },

  /**
   * Mengambil semua daftar percakapan langsung milik user
   */
  async getDirectConversations(): Promise<DirectConversation[]> {
    const res = await apiClient<DirectConversation[]>('/direct-chats', {
      method: 'GET',
    });
    return res.data;
  },

  /**
   * Mengambil detail percakapan langsung dan pesan-pesan di dalamnya
   */
  async getDirectMessages(conversationId: number): Promise<{ conversation: DirectConversation; messages: DirectMessage[] }> {
    const res = await apiClient<{ conversation: DirectConversation; messages: DirectMessage[] }>(`/direct-chats/${conversationId}`, {
      method: 'GET',
    });
    return res.data;
  },

  /**
   * Mengambil / membuat percakapan terpadu untuk suatu tawaran barter
   */
  async getConversationForOffer(offerId: number): Promise<DirectConversation> {
    const res = await apiClient<DirectConversation>(`/offers/${offerId}/conversation`, {
      method: 'GET',
    });
    return res.data;
  },

  /**
   * Mengirim pesan dalam percakapan langsung
   */
  async sendDirectMessage(conversationId: number, message: string, type: 'text' | 'image' = 'text'): Promise<DirectMessage> {
    const res = await apiClient<DirectMessage>(`/direct-chats/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ message, type }),
    });
    return res.data;
  },
};

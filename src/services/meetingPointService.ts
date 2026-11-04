import { apiClient } from './api';

export type MeetingPointStatus = 'proposed' | 'locked' | 'superseded';

export interface MeetingPointUser {
  id: number;
  name: string;
  avatar_url?: string | null;
}

export interface MeetingPoint {
  id: number;
  offer_id: number;
  proposed_by: number;
  latitude: string | number;
  longitude: string | number;
  place_name: string;
  address?: string | null;
  status: MeetingPointStatus;
  agreed_by?: number | null;
  agreed_by_other_at?: string | null;
  locked_at?: string | null;
  notes?: string | null;
  maps_url?: string;
  created_at?: string;
  proposer?: MeetingPointUser;
  agreer?: MeetingPointUser;
}

export interface MeetingPointDetails {
  locked: MeetingPoint | null;
  pending: MeetingPoint | null;
  history: MeetingPoint[];
  can_propose: boolean;
  can_agree: boolean;
}

export interface ProposeMeetingPointPayload {
  latitude: number;
  longitude: number;
  place_name: string;
  address?: string;
  notes?: string;
}

export const meetingPointService = {
  /**
   * Mengambil status titik temu & histori untuk suatu offer barter
   */
  async getDetails(offerId: number): Promise<MeetingPointDetails> {
    const res = await apiClient<MeetingPointDetails>(
      `/offers/${offerId}/meeting-point`,
      { method: 'GET' }
    );
    return res.data;
  },

  /**
   * Mengusulkan titik temu baru
   */
  async propose(
    offerId: number,
    payload: ProposeMeetingPointPayload
  ): Promise<MeetingPoint> {
    const res = await apiClient<MeetingPoint>(
      `/offers/${offerId}/meeting-point/propose`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
    return res.data;
  },

  /**
   * Menyetujui usulan titik temu dari pihak lawan (Lock Titik Temu)
   */
  async agree(offerId: number, meetingPointId: number): Promise<MeetingPoint> {
    const res = await apiClient<MeetingPoint>(
      `/offers/${offerId}/meeting-point/${meetingPointId}/agree`,
      { method: 'POST' }
    );
    return res.data;
  },

  /**
   * Mengajukan usulan titik temu alternatif (counter)
   */
  async counter(
    offerId: number,
    payload: ProposeMeetingPointPayload
  ): Promise<MeetingPoint> {
    const res = await apiClient<MeetingPoint>(
      `/offers/${offerId}/meeting-point/counter`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
    return res.data;
  },
};

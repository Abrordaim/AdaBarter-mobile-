import { apiClient } from './api';

// ─── Types ───────────────────────────────────────────────────────────────────

export type TrackingStatus = 'idle' | 'otw' | 'arrived';

export interface TrackingUser {
  id: number;
  name: string;
  avatar_url?: string | null;
}

export interface TrackingEntry {
  latitude?: number | null;
  longitude?: number | null;
  status: TrackingStatus;
  is_sharing: boolean;
  distance_to_target_meters?: number | null;
  heading?: number | null;
  speed?: number | null;
  last_seen_at?: string | null;
}

export interface MeetingPointInfo {
  id: number;
  place_name: string;
  address?: string | null;
  latitude: number;
  longitude: number;
  meet_at?: string | null;
  maps_url?: string | null;
}

export interface TrackingStatusResponse {
  offer_id: number;
  offer_status: string;
  meeting_point: MeetingPointInfo;
  my_tracking: TrackingEntry | null;
  partner: TrackingUser;
  partner_tracking: TrackingEntry | null;
  distance_between_users_meters: number | null;
}

export interface UpdateLocationPayload {
  latitude: number;
  longitude: number;
  status?: TrackingStatus;
  heading?: number;
  speed?: number;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const trackingService = {
  /**
   * Ambil status pelacakan real-time untuk offer barter.
   */
  async getStatus(offerId: number): Promise<TrackingStatusResponse> {
    const res = await apiClient<TrackingStatusResponse>(
      `/offers/${offerId}/tracking`,
      { method: 'GET' }
    );
    return res.data;
  },

  /**
   * Kirim posisi GPS terkini ke server.
   */
  async updateLocation(
    offerId: number,
    payload: UpdateLocationPayload
  ): Promise<TrackingEntry> {
    const res = await apiClient<TrackingEntry>(
      `/offers/${offerId}/tracking/location`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
    return res.data;
  },

  /**
   * Hentikan pembagian lokasi GPS.
   */
  async stopTracking(offerId: number): Promise<TrackingEntry> {
    const res = await apiClient<TrackingEntry>(
      `/offers/${offerId}/tracking/stop`,
      { method: 'POST' }
    );
    return res.data;
  },
};

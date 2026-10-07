import { apiClient } from './api';

export interface Rating {
  id: number;
  offer_id: number;
  rating: number;
  comment?: string | null;
  created_at?: string;
  rater?: {
    id: number;
    name: string;
    avatar_url?: string | null;
    city?: string | null;
    is_vip?: boolean;
  };
  rated_user?: {
    id: number;
    name: string;
    avatar_url?: string | null;
    city?: string | null;
  };
}

export interface CreateRatingPayload {
  offer_id: number;
  rating: number;
  comment?: string;
}

export interface UserRatingsResponse {
  user: {
    id: number;
    name: string;
    avatar_url?: string | null;
    city?: string | null;
    average_rating?: number | null;
    ratings_count?: number;
  };
  ratings: Rating[];
  pagination: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export const ratingService = {
  async createRating(payload: CreateRatingPayload): Promise<Rating> {
    const res = await apiClient<Rating>('/ratings', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  async getUserRatings(userId: number, page: number = 1): Promise<UserRatingsResponse> {
    const res = await apiClient<UserRatingsResponse>(`/users/${userId}/ratings?page=${page}`, {
      method: 'GET',
    });
    return res.data;
  },
};

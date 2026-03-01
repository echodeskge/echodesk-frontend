"use client";

import { useQuery, useMutation } from '@tanstack/react-query';
import axios from 'axios';

// Public rating API - no authentication required
// These endpoints are accessed via tenant subdomain

export interface RatingInfo {
  valid: boolean;
  expired?: boolean;
  already_rated?: boolean;
  tenant_name?: string;
  tenant_logo_url?: string;
  error?: string;
}

export interface SubmitRatingRequest {
  rating: 1 | 3 | 5;
  comment?: string;
}

export interface SubmitRatingResponse {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Get rating info by token (validates token)
 */
export function useRatingInfo(token: string | null) {
  return useQuery<RatingInfo>({
    queryKey: ['public-rating', token],
    queryFn: async () => {
      if (!token) {
        return { valid: false, error: 'No token provided' };
      }
      try {
        const response = await axios.get(`/api/social/public/rating/${token}/`);
        return response.data;
      } catch (error: any) {
        // Handle specific error responses
        if (error.response?.status === 404) {
          return { valid: false, error: 'Invalid token' };
        }
        if (error.response?.status === 410) {
          return { valid: false, expired: true, error: 'Token has expired' };
        }
        if (error.response?.status === 409) {
          return { valid: false, already_rated: true, error: 'Already rated' };
        }
        return { valid: false, error: 'Failed to validate token' };
      }
    },
    enabled: !!token,
    staleTime: 0, // Always refetch
    retry: false,
  });
}

/**
 * Submit a public rating
 */
export function useSubmitRating() {
  return useMutation<SubmitRatingResponse, Error, { token: string; data: SubmitRatingRequest }>({
    mutationFn: async ({ token, data }) => {
      const response = await axios.post(`/api/social/public/rating/${token}/submit/`, data);
      return response.data;
    },
  });
}

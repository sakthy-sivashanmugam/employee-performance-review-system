import type { NewReview, Review, ReviewRegisterItem } from '../types/api'
import { apiGet, apiPost } from './client'

/** The review register: all submitted reviews, newest first. */
export function listReviews(signal?: AbortSignal): Promise<ReviewRegisterItem[]> {
  return apiGet<ReviewRegisterItem[]>('/api/reviews', { signal })
}

/**
 * Submits a review. The backend calculates the average rating, which is why none is sent, and
 * rejects an inactive employee, a closed period and a second review for the same employee and
 * period.
 */
export function createReview(data: NewReview, signal?: AbortSignal): Promise<Review> {
  return apiPost<Review>('/api/reviews', data, { signal })
}

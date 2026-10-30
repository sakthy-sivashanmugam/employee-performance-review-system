import type { ReviewRegisterItem } from '../types/api'
import { apiGet } from './client'

/** The review register: all submitted reviews, newest first. */
export function listReviews(signal?: AbortSignal): Promise<ReviewRegisterItem[]> {
  return apiGet<ReviewRegisterItem[]>('/api/reviews', { signal })
}

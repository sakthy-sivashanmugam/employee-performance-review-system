import type { NewReviewPeriod, ReviewPeriod } from '../types/api'
import { apiGet, apiPost } from './client'

export function listReviewPeriods(signal?: AbortSignal): Promise<ReviewPeriod[]> {
  return apiGet<ReviewPeriod[]>('/api/review-periods', { signal })
}

/** Creates a review period. The backend makes new periods Open, so no status is sent. */
export function createReviewPeriod(data: NewReviewPeriod, signal?: AbortSignal): Promise<ReviewPeriod> {
  return apiPost<ReviewPeriod>('/api/review-periods', data, { signal })
}

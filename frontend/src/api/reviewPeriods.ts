import type { ReviewPeriod } from '../types/api'
import { apiGet } from './client'

export function listReviewPeriods(signal?: AbortSignal): Promise<ReviewPeriod[]> {
  return apiGet<ReviewPeriod[]>('/api/review-periods', { signal })
}

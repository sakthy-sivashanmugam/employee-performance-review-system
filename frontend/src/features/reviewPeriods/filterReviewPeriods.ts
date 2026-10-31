import type { ReviewPeriod, ReviewPeriodStatus } from '../../types/api'

export type PeriodStatusFilter = 'All' | ReviewPeriodStatus

export interface ReviewPeriodFilter {
  search: string
  status: PeriodStatusFilter
}

/**
 * Narrows the review periods by status and a search text, and orders them newest first.
 *
 * Search looks at the name only, ignores case and surrounding spaces, and every word typed must
 * appear in the name. An empty search matches every period. The order is by start date, latest
 * first; periods that start on the same day go latest end date first, then the most recently
 * created (highest id) first.
 */
export function filterReviewPeriods(
  periods: ReviewPeriod[],
  { search, status }: ReviewPeriodFilter,
): ReviewPeriod[] {
  const words = search.toLowerCase().split(/\s+/).filter(Boolean)

  return periods
    .filter((period) => {
      if (status !== 'All' && period.status !== status) return false
      const name = period.name.toLowerCase()
      return words.every((word) => name.includes(word))
    })
    .sort(
      // ISO dates (YYYY-MM-DD) sort correctly as text.
      (a, b) => b.start_date.localeCompare(a.start_date) || b.end_date.localeCompare(a.end_date) || b.id - a.id,
    )
}

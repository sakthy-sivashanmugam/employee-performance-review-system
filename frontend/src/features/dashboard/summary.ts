import type { Employee, ReviewPeriod, ReviewRegisterItem } from '../../types/api'
import { toIsoDate } from '../../utils/dates'

export const RECENT_REVIEW_COUNT = 5

export interface CurrentPeriodSummary {
  period: ReviewPeriod
  /** Reviews submitted for this period. */
  reviewCount: number
}

export interface DashboardSummary {
  totalEmployees: number
  activeEmployees: number
  openReviewPeriods: number
  reviewsSubmitted: number
  currentPeriod: CurrentPeriodSummary | null
  recentReviews: ReviewRegisterItem[]
}

/**
 * Picks the "current" review period. The requirements do not define it, so this is an
 * assumption: among Open periods, prefer one whose dates include today; otherwise take the Open
 * period that started most recently. Returns null when no period is Open.
 */
export function selectCurrentPeriod(periods: ReviewPeriod[], today: Date): ReviewPeriod | null {
  const open = periods.filter((period) => period.status === 'Open')
  const todayIso = toIsoDate(today)
  const containingToday = open.filter(
    (period) => period.start_date <= todayIso && todayIso <= period.end_date,
  )
  const candidates = containingToday.length > 0 ? containingToday : open
  // ISO dates sort correctly as text. Latest start first; the higher id breaks ties.
  const sorted = [...candidates].sort(
    (a, b) => b.start_date.localeCompare(a.start_date) || b.id - a.id,
  )
  return sorted[0] ?? null
}

/** Turns the three API lists into the figures and sections shown on the dashboard. */
export function buildDashboardSummary(
  employees: Employee[],
  periods: ReviewPeriod[],
  reviews: ReviewRegisterItem[],
  today: Date,
): DashboardSummary {
  const current = selectCurrentPeriod(periods, today)
  return {
    totalEmployees: employees.length,
    activeEmployees: employees.filter((employee) => employee.status === 'Active').length,
    openReviewPeriods: periods.filter((period) => period.status === 'Open').length,
    reviewsSubmitted: reviews.length,
    currentPeriod: current && {
      period: current,
      reviewCount: reviews.filter((review) => review.review_period_id === current.id).length,
    },
    // The register already arrives newest first.
    recentReviews: reviews.slice(0, RECENT_REVIEW_COUNT),
  }
}

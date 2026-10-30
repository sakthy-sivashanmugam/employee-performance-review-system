import type { Employee, ReviewPeriod, ReviewRegisterItem } from '../../types/api'
import { buildDashboardSummary, RECENT_REVIEW_COUNT, selectCurrentPeriod } from './summary'

const TODAY = new Date(2026, 9, 30) // 30 October 2026 (months are 0-based)

function employee(id: number, status: Employee['status'] = 'Active'): Employee {
  return {
    id,
    employee_code: `EMP${id}`,
    name: `Employee ${id}`,
    department: 'Engineering',
    email: `e${id}@example.com`,
    status,
  }
}

function period(
  id: number,
  start: string,
  end: string,
  status: ReviewPeriod['status'] = 'Open',
): ReviewPeriod {
  return { id, name: `Period ${id}`, start_date: start, end_date: end, status }
}

function review(id: number, periodId: number): ReviewRegisterItem {
  return {
    id,
    employee_id: 1,
    employee_code: 'EMP1',
    employee_name: 'Employee 1',
    department: 'Engineering',
    review_period_id: periodId,
    review_period_name: `Period ${periodId}`,
    quality_of_work: 4,
    delivery_ownership: 4,
    teamwork_collaboration: 4,
    average_rating: 4,
    comments: 'ok',
    submitted_at: '2026-10-01T09:00:00+11:00',
  }
}

describe('selectCurrentPeriod', () => {
  it('returns null when no period is open', () => {
    expect(selectCurrentPeriod([period(1, '2026-01-01', '2026-06-30', 'Closed')], TODAY)).toBeNull()
    expect(selectCurrentPeriod([], TODAY)).toBeNull()
  })

  it('prefers the open period whose dates include today', () => {
    const periods = [
      period(1, '2026-07-01', '2026-12-31'), // includes today
      period(2, '2027-01-01', '2027-06-30'), // starts later, but is in the future
    ]

    expect(selectCurrentPeriod(periods, TODAY)?.id).toBe(1)
  })

  it('includes both the first and last day of a period', () => {
    expect(selectCurrentPeriod([period(1, '2026-10-30', '2026-12-31')], TODAY)?.id).toBe(1)
    expect(selectCurrentPeriod([period(2, '2026-01-01', '2026-10-30')], TODAY)?.id).toBe(2)
  })

  it('ignores a closed period even if it includes today', () => {
    const periods = [period(1, '2026-07-01', '2026-12-31', 'Closed'), period(2, '2026-01-01', '2026-03-31')]

    expect(selectCurrentPeriod(periods, TODAY)?.id).toBe(2)
  })

  it('falls back to the most recently started open period when none includes today', () => {
    const periods = [period(1, '2026-01-01', '2026-03-31'), period(2, '2026-04-01', '2026-06-30')]

    expect(selectCurrentPeriod(periods, TODAY)?.id).toBe(2)
  })

  it('picks the latest start, then the highest id, among periods that include today', () => {
    const periods = [
      period(1, '2026-01-01', '2026-12-31'),
      period(2, '2026-09-01', '2026-12-31'),
      period(3, '2026-09-01', '2026-12-31'),
    ]

    expect(selectCurrentPeriod(periods, TODAY)?.id).toBe(3)
  })
})

describe('buildDashboardSummary', () => {
  it('counts employees, open periods and reviews', () => {
    const summary = buildDashboardSummary(
      [employee(1), employee(2, 'Inactive'), employee(3)],
      [period(1, '2026-01-01', '2026-06-30', 'Closed'), period(2, '2026-07-01', '2026-12-31')],
      [review(3, 2), review(2, 2), review(1, 1)],
      TODAY,
    )

    expect(summary.totalEmployees).toBe(3)
    expect(summary.activeEmployees).toBe(2)
    expect(summary.openReviewPeriods).toBe(1)
    expect(summary.reviewsSubmitted).toBe(3)
  })

  it('counts the reviews of the current period only', () => {
    const summary = buildDashboardSummary(
      [employee(1)],
      [period(1, '2026-01-01', '2026-06-30', 'Closed'), period(2, '2026-07-01', '2026-12-31')],
      [review(3, 2), review(2, 2), review(1, 1)],
      TODAY,
    )

    expect(summary.currentPeriod?.period.id).toBe(2)
    expect(summary.currentPeriod?.reviewCount).toBe(2)
  })

  it('has no current period when none is open', () => {
    const summary = buildDashboardSummary([], [period(1, '2026-01-01', '2026-06-30', 'Closed')], [], TODAY)

    expect(summary.currentPeriod).toBeNull()
    expect(summary.openReviewPeriods).toBe(0)
  })

  it('keeps the newest reviews, in the order received, up to the limit', () => {
    const reviews = Array.from({ length: 8 }, (_, index) => review(8 - index, 1)) // ids 8..1, newest first

    const summary = buildDashboardSummary([employee(1)], [], reviews, TODAY)

    expect(summary.recentReviews).toHaveLength(RECENT_REVIEW_COUNT)
    expect(summary.recentReviews.map((r) => r.id)).toEqual([8, 7, 6, 5, 4])
    expect(summary.reviewsSubmitted).toBe(8)
  })

  it('handles an empty system', () => {
    expect(buildDashboardSummary([], [], [], TODAY)).toEqual({
      totalEmployees: 0,
      activeEmployees: 0,
      openReviewPeriods: 0,
      reviewsSubmitted: 0,
      currentPeriod: null,
      recentReviews: [],
    })
  })
})

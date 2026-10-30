import { listEmployees } from '../../api/employees'
import { listReviewPeriods } from '../../api/reviewPeriods'
import { listReviews } from '../../api/reviews'
import { useAsyncData } from '../../hooks/useAsyncData'
import { buildDashboardSummary } from './summary'

// Defined once at module level so the hook receives the same function on every render.
async function loadDashboard(signal: AbortSignal) {
  const [employees, periods, reviews] = await Promise.all([
    listEmployees(signal),
    listReviewPeriods(signal),
    listReviews(signal),
  ])
  return buildDashboardSummary(employees, periods, reviews, new Date())
}

/** Loads everything the dashboard shows from the backend's existing list endpoints. */
export function useDashboardData() {
  return useAsyncData(loadDashboard)
}

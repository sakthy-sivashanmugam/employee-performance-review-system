import { listActiveEmployees } from '../../api/employees'
import { listOpenReviewPeriods } from '../../api/reviewPeriods'
import { useAsyncData } from '../../hooks/useAsyncData'

// Defined once at module level so the hook receives the same function on every render.
async function loadReviewFormData(signal: AbortSignal) {
  const [employees, periods] = await Promise.all([listActiveEmployees(signal), listOpenReviewPeriods(signal)])
  return { employees, periods }
}

/** Loads what the Submit Review form offers: the Active employees and the Open review periods. */
export function useReviewFormData() {
  return useAsyncData(loadReviewFormData)
}

import { listReviewPeriods } from '../../api/reviewPeriods'
import { useAsyncData } from '../../hooks/useAsyncData'

// Defined once at module level so the hook receives the same function on every render.
const loadReviewPeriods = (signal: AbortSignal) => listReviewPeriods(signal)

/** Loads all review periods from the backend once; filtering happens in the browser. */
export function useReviewPeriods() {
  return useAsyncData(loadReviewPeriods)
}

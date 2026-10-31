import { listEmployees } from '../../api/employees'
import { useAsyncData } from '../../hooks/useAsyncData'

// Defined once at module level so the hook receives the same function on every render.
const loadEmployees = (signal: AbortSignal) => listEmployees(signal)

/** Loads all employees from the backend once; filtering happens in the browser. */
export function useEmployees() {
  return useAsyncData(loadEmployees)
}

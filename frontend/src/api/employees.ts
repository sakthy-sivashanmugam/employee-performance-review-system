import type { Employee } from '../types/api'
import { apiGet } from './client'

export function listEmployees(signal?: AbortSignal): Promise<Employee[]> {
  return apiGet<Employee[]>('/api/employees', { signal })
}

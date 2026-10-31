import type { Employee, NewEmployee } from '../types/api'
import { apiGet, apiPost } from './client'

export function listEmployees(signal?: AbortSignal): Promise<Employee[]> {
  return apiGet<Employee[]>('/api/employees', { signal })
}

/** Only Active employees: the only ones a review can be submitted for. */
export function listActiveEmployees(signal?: AbortSignal): Promise<Employee[]> {
  return apiGet<Employee[]>('/api/employees', { params: { status: 'Active' }, signal })
}

/** Creates an employee. The backend makes new employees Active, so no status is sent. */
export function createEmployee(data: NewEmployee, signal?: AbortSignal): Promise<Employee> {
  return apiPost<Employee>('/api/employees', data, { signal })
}

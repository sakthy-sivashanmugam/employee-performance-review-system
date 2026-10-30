import type { Employee, EmployeeStatus } from '../../types/api'

export type StatusFilter = 'All' | EmployeeStatus

export interface EmployeeFilter {
  search: string
  status: StatusFilter
}

/**
 * Narrows the employee list by status and a search text, keeping the original order.
 *
 * Search ignores case and surrounding spaces. Each word typed must appear somewhere in the
 * employee's name, code, email or department, so "alex eng" finds Alex Morgan in Engineering.
 * An empty search matches everyone.
 */
export function filterEmployees(employees: Employee[], { search, status }: EmployeeFilter): Employee[] {
  const words = search.toLowerCase().split(/\s+/).filter(Boolean)

  return employees.filter((employee) => {
    if (status !== 'All' && employee.status !== status) return false
    // The newline stops a word from matching across the end of one field and the start of the next.
    const text = [employee.name, employee.employee_code, employee.email, employee.department]
      .join('\n')
      .toLowerCase()
    return words.every((word) => text.includes(word))
  })
}

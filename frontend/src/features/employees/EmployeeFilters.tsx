import { ListFilters } from '../../components/ListFilters'
import type { StatusFilter } from './filterEmployees'

const STATUS_OPTIONS: readonly StatusFilter[] = ['All', 'Active', 'Inactive']

interface EmployeeFiltersProps {
  search: string
  onSearchChange: (search: string) => void
  status: StatusFilter
  onStatusChange: (status: StatusFilter) => void
}

/** The search box and the All / Active / Inactive switch above the employee list. */
export function EmployeeFilters({ search, onSearchChange, status, onStatusChange }: EmployeeFiltersProps) {
  return (
    <ListFilters
      searchLabel="Search employees"
      searchPlaceholder="Name, code, email or department"
      search={search}
      onSearchChange={onSearchChange}
      statusOptions={STATUS_OPTIONS}
      status={status}
      onStatusChange={onStatusChange}
      statusAriaLabel="Filter by status"
    />
  )
}

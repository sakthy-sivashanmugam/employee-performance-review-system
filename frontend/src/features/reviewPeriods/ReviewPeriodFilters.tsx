import { ListFilters } from '../../components/ListFilters'
import type { PeriodStatusFilter } from './filterReviewPeriods'

const STATUS_OPTIONS: readonly PeriodStatusFilter[] = ['All', 'Open', 'Closed']

interface ReviewPeriodFiltersProps {
  search: string
  onSearchChange: (search: string) => void
  status: PeriodStatusFilter
  onStatusChange: (status: PeriodStatusFilter) => void
}

/** The search box and the All / Open / Closed switch above the review period list. */
export function ReviewPeriodFilters({ search, onSearchChange, status, onStatusChange }: ReviewPeriodFiltersProps) {
  return (
    <ListFilters
      searchLabel="Search review periods"
      searchPlaceholder="Name"
      search={search}
      onSearchChange={onSearchChange}
      statusOptions={STATUS_OPTIONS}
      status={status}
      onStatusChange={onStatusChange}
      statusAriaLabel="Filter by status"
    />
  )
}

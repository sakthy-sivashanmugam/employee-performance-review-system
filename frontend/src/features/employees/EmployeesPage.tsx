import { useState } from 'react'
import { Button, Stack, Typography, useMediaQuery } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import AddIcon from '@mui/icons-material/Add'
import { Link as RouterLink } from 'react-router-dom'
import { FlashNotice } from '../../components/FlashNotice'
import { ListLoadingCard } from '../../components/ListLoadingCard'
import { LoadErrorAlert } from '../../components/LoadErrorAlert'
import { MessageCard } from '../../components/MessageCard'
import { PageHeader } from '../../layout/PageHeader'
import type { Employee } from '../../types/api'
import { EmployeeCards } from './EmployeeCards'
import { EmployeeFilters } from './EmployeeFilters'
import { EmployeeTable } from './EmployeeTable'
import { filterEmployees, type StatusFilter } from './filterEmployees'
import { useEmployees } from './useEmployees'

function AddEmployeeButton() {
  return (
    <Button component={RouterLink} to="/employees/new" variant="contained" startIcon={<AddIcon />}>
      Add Employee
    </Button>
  )
}

export function EmployeesPage() {
  const { state, reload } = useEmployees()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<StatusFilter>('All')

  // A table needs room: with the sidebar open it only fits from the "lg" width up. Narrower
  // screens (tablets and phones) get cards, so the page never scrolls sideways.
  const theme = useTheme()
  const showTable = useMediaQuery(theme.breakpoints.up('lg'), { noSsr: true })

  const clearFilters = () => {
    setSearch('')
    setStatus('All')
  }

  return (
    <Stack spacing={{ xs: 2, md: 3 }}>
      <PageHeader title="Employees" description="Manage employee records." actions={<AddEmployeeButton />} />

      <FlashNotice />

      {state.status === 'loading' && <ListLoadingCard label="Loading employees…" />}

      {state.status === 'error' && (
        <LoadErrorAlert subject="The employees" message={state.error.message} onRetry={reload} />
      )}

      {state.status === 'success' && (
        <EmployeeList employees={state.data} {...{ search, setSearch, status, setStatus, showTable, clearFilters }} />
      )}
    </Stack>
  )
}

interface EmployeeListProps {
  employees: Employee[]
  search: string
  setSearch: (search: string) => void
  status: StatusFilter
  setStatus: (status: StatusFilter) => void
  showTable: boolean
  clearFilters: () => void
}

function EmployeeList({ employees, search, setSearch, status, setStatus, showTable, clearFilters }: EmployeeListProps) {
  if (employees.length === 0) {
    return (
      <MessageCard>
        <Typography variant="h6" component="h2" gutterBottom>
          No employees yet
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Add the first employee to get started.
        </Typography>
        <AddEmployeeButton />
      </MessageCard>
    )
  }

  const visible = filterEmployees(employees, { search, status })

  return (
    <>
      <EmployeeFilters search={search} onSearchChange={setSearch} status={status} onStatusChange={setStatus} />

      <Typography variant="body2" color="text.secondary" role="status">
        Showing {visible.length} of {employees.length} {employees.length === 1 ? 'employee' : 'employees'}
      </Typography>

      {visible.length === 0 ? (
        <MessageCard>
          <Typography variant="h6" component="h2" gutterBottom>
            No employees match your search
          </Typography>
          <Button variant="outlined" onClick={clearFilters}>
            Clear filters
          </Button>
        </MessageCard>
      ) : showTable ? (
        <EmployeeTable employees={visible} />
      ) : (
        <EmployeeCards employees={visible} />
      )}
    </>
  )
}

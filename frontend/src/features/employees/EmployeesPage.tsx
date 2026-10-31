import { useEffect, useState, type ReactNode } from 'react'
import { Alert, Box, Button, Card, CardContent, Skeleton, Stack, Typography, useMediaQuery } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import AddIcon from '@mui/icons-material/Add'
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom'
import { PageHeader } from '../../layout/PageHeader'
import type { Employee } from '../../types/api'
import { EmployeeCards } from './EmployeeCards'
import { EmployeeFilters } from './EmployeeFilters'
import { EmployeeTable } from './EmployeeTable'
import { filterEmployees, type StatusFilter } from './filterEmployees'
import { useEmployees } from './useEmployees'

const visuallyHidden = {
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
} as const

function AddEmployeeButton() {
  return (
    <Button component={RouterLink} to="/employees/new" variant="contained" startIcon={<AddIcon />}>
      Add Employee
    </Button>
  )
}

function LoadingState() {
  return (
    <Card aria-busy="true">
      <CardContent>
        <Box role="status" sx={visuallyHidden}>
          Loading employees…
        </Box>
        <Stack spacing={1.5}>
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} variant="rounded" height={44} />
          ))}
        </Stack>
      </CardContent>
    </Card>
  )
}

function MessageCard({ children }: { children: ReactNode }) {
  return (
    <Card>
      <CardContent sx={{ textAlign: 'center', py: 5 }}>{children}</CardContent>
    </Card>
  )
}

export function EmployeesPage() {
  const { state, reload } = useEmployees()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<StatusFilter>('All')

  // A message sent by the previous screen (for example "Chris Bell (EMP106) was added."). It is
  // read once and then removed from the history entry, so refreshing the page does not repeat it.
  const location = useLocation()
  const navigate = useNavigate()
  const incomingNotice = (location.state as { notice?: string } | null)?.notice
  const [notice, setNotice] = useState<string | null>(incomingNotice ?? null)
  useEffect(() => {
    if (incomingNotice) navigate(location.pathname, { replace: true, state: null })
  }, [incomingNotice, location.pathname, navigate])

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

      {notice && (
        <Alert severity="success" role="status" onClose={() => setNotice(null)}>
          {notice}
        </Alert>
      )}

      {state.status === 'loading' && <LoadingState />}

      {state.status === 'error' && (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={reload}>
              Retry
            </Button>
          }
        >
          The employees could not be loaded. {state.error.message}
        </Alert>
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

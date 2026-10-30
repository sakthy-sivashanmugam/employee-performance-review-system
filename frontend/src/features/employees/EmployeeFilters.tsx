import { Box, InputAdornment, TextField, ToggleButton, ToggleButtonGroup } from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import { layout } from '../../theme'
import type { StatusFilter } from './filterEmployees'

const STATUS_OPTIONS: StatusFilter[] = ['All', 'Active', 'Inactive']

interface EmployeeFiltersProps {
  search: string
  onSearchChange: (search: string) => void
  status: StatusFilter
  onStatusChange: (status: StatusFilter) => void
}

/** The search box and the All / Active / Inactive switch above the employee list. */
export function EmployeeFilters({ search, onSearchChange, status, onStatusChange }: EmployeeFiltersProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'stretch', sm: 'center' },
        justifyContent: 'space-between',
        gap: 2,
      }}
    >
      <TextField
        type="search"
        label="Search employees"
        placeholder="Name, code, email or department"
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        sx={{ flex: 1, maxWidth: { sm: 420 }, bgcolor: 'background.paper' }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          },
        }}
      />

      <ToggleButtonGroup
        exclusive
        color="primary"
        value={status}
        aria-label="Filter by status"
        onChange={(_event, next: StatusFilter | null) => {
          // Pressing the selected button again reports null; keep the current choice.
          if (next !== null) onStatusChange(next)
        }}
        sx={{ bgcolor: 'background.paper' }}
      >
        {STATUS_OPTIONS.map((option) => (
          <ToggleButton
            key={option}
            value={option}
            sx={{ flex: { xs: 1, sm: 'none' }, px: 2.5, minHeight: layout.touchTarget, textTransform: 'none', fontWeight: 600 }}
          >
            {option}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Box>
  )
}

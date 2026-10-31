import { Box, InputAdornment, TextField, ToggleButton, ToggleButtonGroup } from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import { layout } from '../theme'

interface ListFiltersProps<Status extends string> {
  searchLabel: string
  searchPlaceholder: string
  search: string
  onSearchChange: (search: string) => void
  /** The status choices in order, including "All". */
  statusOptions: readonly Status[]
  status: Status
  onStatusChange: (status: Status) => void
  statusAriaLabel: string
}

/** The search box and the status switch above a list (for example All / Active / Inactive). */
export function ListFilters<Status extends string>({
  searchLabel,
  searchPlaceholder,
  search,
  onSearchChange,
  statusOptions,
  status,
  onStatusChange,
  statusAriaLabel,
}: ListFiltersProps<Status>) {
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
        label={searchLabel}
        placeholder={searchPlaceholder}
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
        aria-label={statusAriaLabel}
        onChange={(_event, next: Status | null) => {
          // Pressing the selected button again reports null; keep the current choice.
          if (next !== null) onStatusChange(next)
        }}
        sx={{ bgcolor: 'background.paper' }}
      >
        {statusOptions.map((option) => (
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

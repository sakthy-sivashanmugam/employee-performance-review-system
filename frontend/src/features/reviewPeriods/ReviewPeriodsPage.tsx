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
import type { ReviewPeriod } from '../../types/api'
import { filterReviewPeriods, type PeriodStatusFilter } from './filterReviewPeriods'
import { ReviewPeriodCards } from './ReviewPeriodCards'
import { ReviewPeriodFilters } from './ReviewPeriodFilters'
import { ReviewPeriodTable } from './ReviewPeriodTable'
import { useReviewPeriods } from './useReviewPeriods'

function CreateReviewPeriodButton() {
  return (
    <Button component={RouterLink} to="/review-periods/new" variant="contained" startIcon={<AddIcon />}>
      Create Review Period
    </Button>
  )
}

export function ReviewPeriodsPage() {
  const { state, reload } = useReviewPeriods()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<PeriodStatusFilter>('All')

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
      <PageHeader title="Review Periods" description="Manage review periods." actions={<CreateReviewPeriodButton />} />

      <FlashNotice />

      {state.status === 'loading' && <ListLoadingCard label="Loading review periods…" />}

      {state.status === 'error' && (
        <LoadErrorAlert subject="The review periods" message={state.error.message} onRetry={reload} />
      )}

      {state.status === 'success' && (
        <ReviewPeriodList periods={state.data} {...{ search, setSearch, status, setStatus, showTable, clearFilters }} />
      )}
    </Stack>
  )
}

interface ReviewPeriodListProps {
  periods: ReviewPeriod[]
  search: string
  setSearch: (search: string) => void
  status: PeriodStatusFilter
  setStatus: (status: PeriodStatusFilter) => void
  showTable: boolean
  clearFilters: () => void
}

function ReviewPeriodList({ periods, search, setSearch, status, setStatus, showTable, clearFilters }: ReviewPeriodListProps) {
  if (periods.length === 0) {
    return (
      <MessageCard>
        <Typography variant="h6" component="h2" gutterBottom>
          No review periods yet
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Create the first review period to get started.
        </Typography>
        <CreateReviewPeriodButton />
      </MessageCard>
    )
  }

  const visible = filterReviewPeriods(periods, { search, status })

  return (
    <>
      <ReviewPeriodFilters search={search} onSearchChange={setSearch} status={status} onStatusChange={setStatus} />

      <Typography variant="body2" color="text.secondary" role="status">
        Showing {visible.length} of {periods.length} {periods.length === 1 ? 'review period' : 'review periods'}
      </Typography>

      {visible.length === 0 ? (
        <MessageCard>
          <Typography variant="h6" component="h2" gutterBottom>
            No review periods match your search
          </Typography>
          <Button variant="outlined" onClick={clearFilters}>
            Clear filters
          </Button>
        </MessageCard>
      ) : showTable ? (
        <ReviewPeriodTable periods={visible} />
      ) : (
        <ReviewPeriodCards periods={visible} />
      )}
    </>
  )
}

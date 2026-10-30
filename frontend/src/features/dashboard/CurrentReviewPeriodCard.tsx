import { Box, Button, Skeleton, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { SectionCard } from '../../components/SectionCard'
import { StatusChip } from '../../components/StatusChip'
import { formatDateRange } from '../../utils/dates'
import type { CurrentPeriodSummary } from './summary'

interface CurrentReviewPeriodCardProps {
  /** Undefined while loading; null when no review period is Open. */
  current: CurrentPeriodSummary | null | undefined
}

export function CurrentReviewPeriodCard({ current }: CurrentReviewPeriodCardProps) {
  return (
    <SectionCard title="Current Review Period">
      {current === undefined ? (
        <Skeleton variant="rounded" height={72} />
      ) : current === null ? (
        <Box>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            There is no open review period.
          </Typography>
          <Button component={RouterLink} to="/review-periods/new" variant="outlined">
            Create Review Period
          </Button>
        </Box>
      ) : (
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', mb: 0.5 }}>
            <Typography variant="h5" component="h3">
              {current.period.name}
            </Typography>
            <StatusChip status={current.period.status} />
          </Box>
          <Typography color="text.secondary">
            {formatDateRange(current.period.start_date, current.period.end_date)}
          </Typography>
          <Typography sx={{ mt: 1.5 }}>
            {current.reviewCount === 1
              ? '1 review submitted'
              : `${current.reviewCount} reviews submitted`}{' '}
            in this period
          </Typography>
        </Box>
      )}
    </SectionCard>
  )
}

import { Box, Card, CardContent, Typography } from '@mui/material'
import { StatusChip } from '../../components/StatusChip'
import type { ReviewPeriod } from '../../types/api'
import { formatDate } from '../../utils/dates'

/** The review period list as cards (one column on phones, two on tablets), so nothing scrolls sideways. */
export function ReviewPeriodCards({ periods }: { periods: ReviewPeriod[] }) {
  return (
    <Box
      component="ul"
      aria-label="Review periods"
      sx={{
        listStyle: 'none',
        m: 0,
        p: 0,
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
        gap: 2,
      }}
    >
      {periods.map((period) => (
        <Card key={period.id} component="li">
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1, mb: 1 }}>
              <Typography variant="subtitle1" component="h2" sx={{ minWidth: 0 }}>
                {period.name}
              </Typography>
              <StatusChip status={period.status} />
            </Box>
            <Box component="dl" sx={{ m: 0, display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: 2, rowGap: 0.5 }}>
              <Typography component="dt" variant="body2" color="text.secondary">
                Start date
              </Typography>
              <Typography component="dd" variant="body2" sx={{ m: 0 }}>
                <time dateTime={period.start_date}>{formatDate(period.start_date)}</time>
              </Typography>
              <Typography component="dt" variant="body2" color="text.secondary">
                End date
              </Typography>
              <Typography component="dd" variant="body2" sx={{ m: 0 }}>
                <time dateTime={period.end_date}>{formatDate(period.end_date)}</time>
              </Typography>
            </Box>
          </CardContent>
        </Card>
      ))}
    </Box>
  )
}

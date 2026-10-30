import { Alert, Button, Grid, Stack } from '@mui/material'
import { PageHeader } from '../../layout/PageHeader'
import { CurrentReviewPeriodCard } from './CurrentReviewPeriodCard'
import { QuickActionsCard } from './QuickActionsCard'
import { RecentReviewsCard } from './RecentReviewsCard'
import { SummaryCards } from './SummaryCards'
import { useDashboardData } from './useDashboardData'

export function DashboardPage() {
  const { state, reload } = useDashboardData()
  const summary = state.status === 'success' ? state.data : null

  return (
    <Stack spacing={{ xs: 2, md: 3 }}>
      <PageHeader
        title="Dashboard"
        description="An overview of employees, review periods and submitted reviews."
      />

      {state.status === 'error' && (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={reload}>
              Retry
            </Button>
          }
        >
          The dashboard could not be loaded. {state.error.message}
        </Alert>
      )}

      {state.status !== 'error' && <SummaryCards summary={summary} />}

      <Grid container spacing={{ xs: 2, md: 3 }}>
        {state.status !== 'error' && (
          <Grid size={{ xs: 12, lg: 8 }}>
            <Stack spacing={{ xs: 2, md: 3 }}>
              <CurrentReviewPeriodCard current={summary ? summary.currentPeriod : undefined} />
              <RecentReviewsCard reviews={summary?.recentReviews} />
            </Stack>
          </Grid>
        )}
        <Grid size={{ xs: 12, lg: state.status === 'error' ? 12 : 4 }}>
          <QuickActionsCard />
        </Grid>
      </Grid>
    </Stack>
  )
}

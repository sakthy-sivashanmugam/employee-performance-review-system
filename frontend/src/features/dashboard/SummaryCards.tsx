import { Grid } from '@mui/material'
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined'
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined'
import HowToRegOutlinedIcon from '@mui/icons-material/HowToRegOutlined'
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined'
import { StatCard } from '../../components/StatCard'
import type { DashboardSummary } from './summary'

/** The four headline figures. Pass `summary={null}` while loading to show placeholders. */
export function SummaryCards({ summary }: { summary: DashboardSummary | null }) {
  const cards = [
    { title: 'Total Employees', value: summary?.totalEmployees, icon: <PeopleOutlinedIcon /> },
    { title: 'Active Employees', value: summary?.activeEmployees, icon: <HowToRegOutlinedIcon /> },
    {
      title: 'Open Review Periods',
      value: summary?.openReviewPeriods,
      icon: <EventAvailableOutlinedIcon />,
    },
    { title: 'Reviews Submitted', value: summary?.reviewsSubmitted, icon: <AssessmentOutlinedIcon /> },
  ]

  return (
    <Grid container spacing={{ xs: 2, md: 3 }}>
      {cards.map((card) => (
        <Grid key={card.title} size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard title={card.title} value={card.value} icon={card.icon} loading={!summary} />
        </Grid>
      ))}
    </Grid>
  )
}

import { Button, Stack } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined'
import RateReviewOutlinedIcon from '@mui/icons-material/RateReviewOutlined'
import { Link as RouterLink } from 'react-router-dom'
import { SectionCard } from '../../components/SectionCard'

const ACTIONS = [
  { label: 'Add Employee', to: '/employees/new', icon: <AddIcon /> },
  { label: 'Create Review Period', to: '/review-periods/new', icon: <EventAvailableOutlinedIcon /> },
  { label: 'Submit Review', to: '/reviews/new', icon: <RateReviewOutlinedIcon /> },
]

export function QuickActionsCard() {
  return (
    <SectionCard title="Quick Actions">
      <Stack spacing={1.5}>
        {ACTIONS.map((action, index) => (
          <Button
            key={action.to}
            component={RouterLink}
            to={action.to}
            variant={index === 0 ? 'contained' : 'outlined'}
            startIcon={action.icon}
            fullWidth
            sx={{ justifyContent: 'flex-start' }}
          >
            {action.label}
          </Button>
        ))}
      </Stack>
    </SectionCard>
  )
}

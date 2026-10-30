import { Box, Button, List, ListItem, ListItemText, Skeleton, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { SectionCard } from '../../components/SectionCard'
import { StarRating } from '../../components/StarRating'
import { formatTimestampDate } from '../../utils/dates'
import type { ReviewRegisterItem } from '../../types/api'

interface RecentReviewsCardProps {
  /** Undefined while loading. */
  reviews: ReviewRegisterItem[] | undefined
}

export function RecentReviewsCard({ reviews }: RecentReviewsCardProps) {
  return (
    <SectionCard
      title="Recent Reviews"
      action={
        <Button component={RouterLink} to="/review-register" size="small">
          View Review Register
        </Button>
      }
    >
      {reviews === undefined ? (
        <Skeleton variant="rounded" height={120} />
      ) : reviews.length === 0 ? (
        <Typography color="text.secondary">No reviews have been submitted yet.</Typography>
      ) : (
        <List disablePadding aria-label="Most recent reviews">
          {reviews.map((review, index) => (
            <ListItem
              key={review.id}
              disableGutters
              divider={index < reviews.length - 1}
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                alignItems: { xs: 'flex-start', sm: 'center' },
                justifyContent: 'space-between',
                gap: 1,
              }}
            >
              <ListItemText
                sx={{ minWidth: 0, m: 0 }}
                primary={`${review.employee_name} (${review.employee_code})`}
                secondary={`${review.review_period_name} · ${formatTimestampDate(review.submitted_at)}`}
                slotProps={{ primary: { sx: { fontWeight: 600 } } }}
              />
              <Box sx={{ flexShrink: 0 }}>
                {/* The average is calculated by the backend; this only displays it. */}
                <StarRating
                  readOnly
                  hideLabel
                  size="small"
                  label={`Average rating for ${review.employee_name}`}
                  value={review.average_rating}
                />
              </Box>
            </ListItem>
          ))}
        </List>
      )}
    </SectionCard>
  )
}

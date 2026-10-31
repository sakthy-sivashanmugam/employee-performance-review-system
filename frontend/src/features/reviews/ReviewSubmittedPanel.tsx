import { useEffect, useRef } from 'react'
import { Box, Button, Card, CardContent, Divider, Stack, Typography } from '@mui/material'
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined'
import { Link as RouterLink } from 'react-router-dom'
import { StarRating } from '../../components/StarRating'
import type { Review } from '../../types/api'
import { RATING_CRITERIA } from './reviewFormRules'

interface ReviewSubmittedPanelProps {
  review: Review
  employeeName: string
  employeeCode: string
  periodName: string
  onSubmitAnother: () => void
}

/** Shown after a review is saved: what was submitted, and the average the backend calculated. */
export function ReviewSubmittedPanel({
  review,
  employeeName,
  employeeCode,
  periodName,
  onSubmitAnother,
}: ReviewSubmittedPanelProps) {
  const headingRef = useRef<HTMLHeadingElement | null>(null)

  // Move to the confirmation so screen readers announce it.
  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  return (
    <Card component="section" aria-labelledby="review-submitted-heading" sx={{ maxWidth: 720 }}>
      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Stack spacing={3}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
            <CheckCircleOutlinedIcon color="success" sx={{ fontSize: 40 }} aria-hidden />
            <Box>
              <Typography
                id="review-submitted-heading"
                ref={headingRef}
                tabIndex={-1}
                variant="h5"
                component="h2"
                sx={{ outline: 'none' }}
              >
                Review submitted
              </Typography>
              <Typography color="text.secondary">
                The review for {employeeName} ({employeeCode}) in {periodName} was submitted.
              </Typography>
            </Box>
          </Box>

          <Divider />

          <Stack spacing={1.5}>
            {RATING_CRITERIA.map(({ key, label }) => (
              <StarRating key={key} readOnly label={label} value={review[key]} />
            ))}
            <Divider />
            {/* The average comes from the backend; the form never calculates or sends it. */}
            <StarRating readOnly label="Average rating" value={review.average_rating} />
          </Stack>

          <Box sx={{ display: 'flex', flexDirection: { xs: 'column-reverse', sm: 'row' }, justifyContent: 'flex-end', gap: 1.5 }}>
            <Button component={RouterLink} to="/" variant="outlined" sx={{ width: { xs: '100%', sm: 'auto' } }}>
              Back to dashboard
            </Button>
            <Button variant="contained" onClick={onSubmitAnother} sx={{ width: { xs: '100%', sm: 'auto' } }}>
              Submit another review
            </Button>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  )
}

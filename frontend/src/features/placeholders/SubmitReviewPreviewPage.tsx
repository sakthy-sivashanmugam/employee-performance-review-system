import { useState } from 'react'
import { Alert, Stack } from '@mui/material'
import { SectionCard } from '../../components/SectionCard'
import { StarRating } from '../../components/StarRating'
import { PageHeader } from '../../layout/PageHeader'

// The three review criteria, matching the backend's quality_of_work, delivery_ownership and
// teamwork_collaboration fields.
const CRITERIA = [
  { key: 'quality_of_work', label: 'Quality of Work' },
  { key: 'delivery_ownership', label: 'Delivery & Ownership' },
  { key: 'teamwork_collaboration', label: 'Teamwork & Collaboration' },
] as const

type CriterionKey = (typeof CRITERIA)[number]['key']

/**
 * Placeholder for the Submit Review screen. The form itself is not built yet; this page only
 * shows the star-rating control so the design can be reviewed. Nothing here is sent anywhere.
 */
export function SubmitReviewPreviewPage() {
  const [ratings, setRatings] = useState<Record<CriterionKey, number | null>>({
    quality_of_work: null,
    delivery_ownership: null,
    teamwork_collaboration: null,
  })

  return (
    <Stack spacing={{ xs: 2, md: 3 }}>
      <PageHeader
        title="Submit Review"
        description="Rate each criterion from 1 to 5 stars."
      />
      <Alert severity="info">
        Preview only: the review form is not built yet, so nothing on this page is saved or sent.
        When it is built, the backend will calculate the average rating from these three ratings.
      </Alert>
      <SectionCard title="Performance ratings">
        <Stack spacing={3}>
          {CRITERIA.map(({ key, label }) => (
            <StarRating
              key={key}
              label={label}
              value={ratings[key]}
              onChange={(value) => setRatings((current) => ({ ...current, [key]: value }))}
            />
          ))}
        </Stack>
      </SectionCard>
    </Stack>
  )
}

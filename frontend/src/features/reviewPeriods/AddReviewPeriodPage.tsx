import { Stack } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { createReviewPeriod } from '../../api/reviewPeriods'
import { PageHeader } from '../../layout/PageHeader'
import type { NewReviewPeriod } from '../../types/api'
import { messagesFromServer } from './reviewPeriodFormRules'
import { ReviewPeriodForm, type SubmitResult } from './ReviewPeriodForm'

export function AddReviewPeriodPage() {
  const navigate = useNavigate()

  async function save(data: NewReviewPeriod): Promise<SubmitResult> {
    try {
      const period = await createReviewPeriod(data)
      // Back to the list, which loads fresh and so includes the new period, with a confirmation.
      navigate('/review-periods', { state: { notice: `${period.name} was created.` } })
    } catch (error) {
      if (!(error instanceof ApiError)) return { formError: 'Something went wrong. Please try again.' }

      const fieldErrors = messagesFromServer(error.fieldErrors)
      if (Object.keys(fieldErrors).length > 0) return { fieldErrors }
      // The backend rejected the request without naming a field (for example the date order).
      if (error.status === 422) return { formError: 'The details were not accepted. Check the dates and try again.' }
      return { formError: error.message }
    }
  }

  return (
    <Stack spacing={{ xs: 2, md: 3 }}>
      <PageHeader title="Create Review Period" description="Set up a new review period." />
      <ReviewPeriodForm onSubmit={save} />
    </Stack>
  )
}

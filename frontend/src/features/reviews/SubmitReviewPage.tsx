import { useState } from 'react'
import { Button, Stack, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { createReview } from '../../api/reviews'
import { ListLoadingCard } from '../../components/ListLoadingCard'
import { LoadErrorAlert } from '../../components/LoadErrorAlert'
import { MessageCard } from '../../components/MessageCard'
import { PageHeader } from '../../layout/PageHeader'
import type { Employee, NewReview, Review, ReviewPeriod } from '../../types/api'
import { messagesFromServer } from './reviewFormRules'
import { ReviewSubmittedPanel } from './ReviewSubmittedPanel'
import { SubmitReviewForm, type SubmitResult } from './SubmitReviewForm'
import { useReviewFormData } from './useReviewFormData'

interface Submitted {
  review: Review
  employee: Employee
  period: ReviewPeriod
}

export function SubmitReviewPage() {
  const { state, reload } = useReviewFormData()
  // While the confirmation is showing the form is not on screen, so "Submit another review" simply
  // brings back a brand-new, empty form: nothing needs resetting by hand.
  const [submitted, setSubmitted] = useState<Submitted | null>(null)

  return (
    <Stack spacing={{ xs: 2, md: 3 }}>
      <PageHeader title="Submit Review" description="Rate each criterion from 1 to 5 stars and add your comments." />

      {state.status === 'loading' && <ListLoadingCard label="Loading the review form…" />}

      {state.status === 'error' && (
        <LoadErrorAlert subject="The review form" message={state.error.message} onRetry={reload} />
      )}

      {state.status === 'success' && (
        <ReviewSection
          employees={state.data.employees}
          periods={state.data.periods}
          submitted={submitted}
          onSaved={setSubmitted}
          onSubmitAnother={() => setSubmitted(null)}
        />
      )}
    </Stack>
  )
}

interface ReviewSectionProps {
  employees: Employee[]
  periods: ReviewPeriod[]
  submitted: Submitted | null
  onSaved: (submitted: Submitted) => void
  onSubmitAnother: () => void
}

function ReviewSection({ employees, periods, submitted, onSaved, onSubmitAnother }: ReviewSectionProps) {
  if (submitted) {
    return (
      <ReviewSubmittedPanel
        review={submitted.review}
        employeeName={submitted.employee.name}
        employeeCode={submitted.employee.employee_code}
        periodName={submitted.period.name}
        onSubmitAnother={onSubmitAnother}
      />
    )
  }

  // A review needs somebody to review and a period to put it in. Say what is missing, and where to fix it.
  if (employees.length === 0 || periods.length === 0) {
    return (
      <Stack spacing={2}>
        {employees.length === 0 && (
          <MessageCard>
            <Typography variant="h6" component="h2" gutterBottom>
              There are no active employees to review
            </Typography>
            <Button component={RouterLink} to="/employees" variant="outlined">
              Go to Employees
            </Button>
          </MessageCard>
        )}
        {periods.length === 0 && (
          <MessageCard>
            <Typography variant="h6" component="h2" gutterBottom>
              There is no open review period
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              Reviews can only be submitted for an open review period.
            </Typography>
            <Button component={RouterLink} to="/review-periods/new" variant="outlined">
              Create Review Period
            </Button>
          </MessageCard>
        )}
      </Stack>
    )
  }

  async function save(data: NewReview): Promise<SubmitResult> {
    try {
      const review = await createReview(data)
      // The ids come from the lists the form offered, so both are always found.
      const employee = employees.find((e) => e.id === review.employee_id)!
      const period = periods.find((p) => p.id === review.review_period_id)!
      onSaved({ review, employee, period })
    } catch (error) {
      if (!(error instanceof ApiError)) return { formError: 'Something went wrong. Please try again.' }

      const fieldErrors = messagesFromServer(error.fieldErrors)
      if (Object.keys(fieldErrors).length > 0) return { fieldErrors }
      // Everything else is a message about the review as a whole, for example "Employee EMP101
      // already has a review for '2026 H2'": show the backend's own words.
      if (error.status === 422) return { formError: 'The review was not accepted. Check it and try again.' }
      return { formError: error.message }
    }
  }

  return <SubmitReviewForm employees={employees} periods={periods} onSubmit={save} />
}

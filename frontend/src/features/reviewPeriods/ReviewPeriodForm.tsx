import { useRef, useState, type FormEvent } from 'react'
import { Alert, Card, CardContent, Stack, TextField, Typography } from '@mui/material'
import { FormActions } from '../../components/FormActions'
import type { NewReviewPeriod } from '../../types/api'
import {
  EMPTY_FORM,
  FORM_FIELDS,
  isValidIsoDate,
  toNewReviewPeriod,
  validateReviewPeriodForm,
  type ReviewPeriodFormErrors,
  type ReviewPeriodFormField,
} from './reviewPeriodFormRules'

/** What the page tells the form after trying to save. Nothing (undefined) means it worked. */
export type SubmitResult = void | { formError?: string; fieldErrors?: ReviewPeriodFormErrors }

interface ReviewPeriodFormProps {
  onSubmit: (data: NewReviewPeriod) => Promise<SubmitResult>
}

const FIELD_LABEL: Record<ReviewPeriodFormField, string> = {
  name: 'Name',
  start_date: 'Start date',
  end_date: 'End date',
}

/**
 * The Create Review Period form. It checks the input as the backend will (see
 * reviewPeriodFormRules.ts), shows each problem under its field, and puts the cursor on the first
 * field that needs fixing. Saving is up to the page, through `onSubmit`.
 */
export function ReviewPeriodForm({ onSubmit }: ReviewPeriodFormProps) {
  const [values, setValues] = useState(EMPTY_FORM)
  const [touched, setTouched] = useState<Partial<Record<ReviewPeriodFormField, boolean>>>({})
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [serverErrors, setServerErrors] = useState<ReviewPeriodFormErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const inputs = useRef<Partial<Record<ReviewPeriodFormField, HTMLInputElement | null>>>({})
  // A ref, not state: it blocks a second submit in the same moment, before a re-render happens.
  const saving = useRef(false)

  const clientErrors = validateReviewPeriodForm(values)

  /** A message from the backend wins; otherwise a rule message once the field has been left or submitted. */
  function errorFor(field: ReviewPeriodFormField): string | undefined {
    return serverErrors[field] ?? (touched[field] || submitAttempted ? clientErrors[field] : undefined)
  }

  function focusFirst(errors: ReviewPeriodFormErrors) {
    const first = FORM_FIELDS.find((field) => errors[field])
    if (first) inputs.current[first]?.focus()
  }

  function handleChange(field: ReviewPeriodFormField, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
    // A backend complaint is about the old value, so it goes away as soon as the value is edited.
    if (serverErrors[field]) setServerErrors(({ [field]: _removed, ...rest }) => rest)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (saving.current) return

    setSubmitAttempted(true)
    if (Object.keys(clientErrors).length > 0) {
      focusFirst(clientErrors)
      return
    }

    saving.current = true
    setSubmitting(true)
    setFormError(null)
    setServerErrors({})
    try {
      const result = await onSubmit(toNewReviewPeriod(values))
      if (result) {
        setServerErrors(result.fieldErrors ?? {})
        setFormError(result.formError ?? null)
        focusFirst(result.fieldErrors ?? {})
      }
    } catch {
      setFormError('Something went wrong. Please try again.')
    } finally {
      saving.current = false
      setSubmitting(false)
    }
  }

  return (
    <Card component="form" noValidate aria-label="Create review period" onSubmit={handleSubmit} sx={{ maxWidth: 640 }}>
      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Stack spacing={3}>
          {formError && <Alert severity="error">{formError}</Alert>}

          {FORM_FIELDS.map((field) => {
            const error = errorFor(field)
            const isDate = field !== 'name'
            return (
              <TextField
                key={field}
                id={`review-period-${field}`}
                name={field}
                label={FIELD_LABEL[field]}
                type={isDate ? 'date' : 'text'}
                value={values[field]}
                required
                fullWidth
                error={Boolean(error)}
                helperText={error}
                onChange={(event) => handleChange(field, event.target.value)}
                onBlur={() => setTouched((current) => ({ ...current, [field]: true }))}
                inputRef={(element: HTMLInputElement | null) => {
                  inputs.current[field] = element
                }}
                slotProps={{
                  // A date field always shows its label above the field (it is never "empty").
                  inputLabel: isDate ? { shrink: true } : undefined,
                  htmlInput: {
                    autoComplete: 'off',
                    // The date picker greys out days before the start date.
                    min: field === 'end_date' && isValidIsoDate(values.start_date) ? values.start_date : undefined,
                  },
                }}
              />
            )
          })}

          <Typography variant="body2" color="text.secondary">
            New review periods start as Open.
          </Typography>

          <FormActions
            cancelTo="/review-periods"
            submitLabel="Create Review Period"
            submittingLabel="Creating…"
            submitting={submitting}
          />
        </Stack>
      </CardContent>
    </Card>
  )
}

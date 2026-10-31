import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Alert, Autocomplete, Box, Card, CardContent, Stack, TextField, Typography } from '@mui/material'
import { FormActions } from '../../components/FormActions'
import { StarRating } from '../../components/StarRating'
import { filterEmployees } from '../employees/filterEmployees'
import { filterReviewPeriods } from '../reviewPeriods/filterReviewPeriods'
import type { Employee, NewReview, ReviewPeriod } from '../../types/api'
import { formatDateRange } from '../../utils/dates'
import {
  EMPTY_FORM,
  FORM_FIELDS,
  RATING_CRITERIA,
  toNewReview,
  validateReviewForm,
  type ReviewFormErrors,
  type ReviewFormField,
  type ReviewFormValues,
} from './reviewFormRules'

/** What the page tells the form after trying to save. Nothing (undefined) means it worked. */
export type SubmitResult = void | { formError?: string; fieldErrors?: ReviewFormErrors }

interface SubmitReviewFormProps {
  /** Active employees. */
  employees: Employee[]
  /** Open review periods. */
  periods: ReviewPeriod[]
  onSubmit: (data: NewReview) => Promise<SubmitResult>
}

const employeeLabel = (employee: Employee) => `${employee.name} (${employee.employee_code})`

/**
 * The Submit Review form: an employee, a review period, three 1-5 star ratings and comments. It
 * checks the input as the backend will (see reviewFormRules.ts), shows each problem under its
 * field and moves the cursor to the first one. Saving is up to the page, through `onSubmit`. The
 * form never sends an average: the backend calculates it.
 */
export function SubmitReviewForm({ employees, periods, onSubmit }: SubmitReviewFormProps) {
  // Offer employees A to Z, and periods newest first.
  const employeeOptions = useMemo(() => [...employees].sort((a, b) => a.name.localeCompare(b.name)), [employees])
  const periodOptions = useMemo(() => filterReviewPeriods(periods, { search: '', status: 'All' }), [periods])

  const [values, setValues] = useState<ReviewFormValues>(() => ({
    ...EMPTY_FORM,
    // With only one choice there is nothing to decide, so it is chosen already.
    period: periods.length === 1 ? periods[0] : null,
  }))
  const [touched, setTouched] = useState<Partial<Record<ReviewFormField, boolean>>>({})
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [serverErrors, setServerErrors] = useState<ReviewFormErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const formRef = useRef<HTMLFormElement | null>(null)
  const alertRef = useRef<HTMLDivElement | null>(null)
  // A ref, not state: it blocks a second submit in the same moment, before a re-render happens.
  const saving = useRef(false)

  const clientErrors = validateReviewForm(values)

  // A message at the top of a long form can be out of sight on a phone, so move to it.
  useEffect(() => {
    if (formError) alertRef.current?.focus()
  }, [formError])

  /** A message from the backend wins; otherwise a rule message once the field has been left or submitted. */
  function errorFor(field: ReviewFormField): string | undefined {
    return serverErrors[field] ?? (touched[field] || submitAttempted ? clientErrors[field] : undefined)
  }

  function focusFirst(errors: ReviewFormErrors) {
    const first = FORM_FIELDS.find((field) => errors[field])
    if (!first) return
    const element = formRef.current?.querySelector<HTMLElement>(`#review-${first}`)
    // A star rating's wrapper holds the radio buttons; the other fields are the input itself.
    ;(element?.matches('input, select, textarea') ? element : element?.querySelector<HTMLElement>('input'))?.focus()
  }

  function setValue<Field extends ReviewFormField>(field: Field, value: ReviewFormValues[Field]) {
    setValues((current) => ({ ...current, [field]: value }))
    // A backend complaint is about the old value, so it goes away as soon as the value is edited.
    if (serverErrors[field]) setServerErrors(({ [field]: _removed, ...rest }) => rest)
  }

  const markTouched = (field: ReviewFormField) => setTouched((current) => ({ ...current, [field]: true }))

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
      const result = await onSubmit(toNewReview(values))
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
    <Card
      component="form"
      ref={formRef}
      noValidate
      aria-label="Submit review"
      onSubmit={handleSubmit}
      sx={{ maxWidth: 720 }}
    >
      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Stack spacing={3}>
          {formError && (
            <Alert severity="error" ref={alertRef} tabIndex={-1}>
              {formError}
            </Alert>
          )}

          <Autocomplete
            id="review-employee"
            options={employeeOptions}
            value={values.employee}
            onChange={(_event, employee) => setValue('employee', employee)}
            onBlur={() => markTouched('employee')}
            getOptionLabel={employeeLabel}
            isOptionEqualToValue={(option, selected) => option.id === selected.id}
            // The same search as the Employees list: every word typed must match the name, code or department.
            filterOptions={(options, state) => filterEmployees(options, { search: state.inputValue, status: 'All' })}
            noOptionsText="No matching employees"
            autoHighlight
            renderOption={(props, employee) => {
              const { key, ...optionProps } = props
              return (
                <Box component="li" key={key} {...optionProps}>
                  <Box>
                    <Typography>{employeeLabel(employee)}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {employee.department}
                    </Typography>
                  </Box>
                </Box>
              )
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Employee"
                required
                error={Boolean(errorFor('employee'))}
                helperText={errorFor('employee') ?? 'Only active employees can be reviewed. Type to search.'}
              />
            )}
          />

          <TextField
            select
            id="review-period"
            label="Review period"
            required
            fullWidth
            value={values.period?.id ?? ''}
            onChange={(event) =>
              setValue('period', periodOptions.find((period) => String(period.id) === event.target.value) ?? null)
            }
            onBlur={() => markTouched('period')}
            error={Boolean(errorFor('period'))}
            helperText={errorFor('period') ?? 'Only open review periods are listed.'}
            slotProps={{ select: { native: true }, inputLabel: { shrink: true } }}
          >
            <option value="">Choose a review period</option>
            {periodOptions.map((period) => (
              <option key={period.id} value={period.id}>
                {period.name} ({formatDateRange(period.start_date, period.end_date)})
              </option>
            ))}
          </TextField>

          <Stack spacing={2.5} aria-label="Performance ratings" role="group">
            {RATING_CRITERIA.map(({ key, label }) => (
              <Box key={key} id={`review-${key}`}>
                <StarRating
                  label={label}
                  value={values[key]}
                  onChange={(rating) => setValue(key, rating)}
                  required
                  error={Boolean(errorFor(key))}
                  helperText={errorFor(key)}
                />
              </Box>
            ))}
          </Stack>

          <TextField
            id="review-comments"
            label="Comments"
            required
            fullWidth
            multiline
            minRows={4}
            value={values.comments}
            onChange={(event) => setValue('comments', event.target.value)}
            onBlur={() => markTouched('comments')}
            error={Boolean(errorFor('comments'))}
            helperText={errorFor('comments')}
          />

          <Typography variant="body2" color="text.secondary">
            The average rating is calculated automatically from the three ratings.
          </Typography>

          <FormActions cancelTo="/" submitLabel="Submit Review" submittingLabel="Submitting…" submitting={submitting} />
        </Stack>
      </CardContent>
    </Card>
  )
}

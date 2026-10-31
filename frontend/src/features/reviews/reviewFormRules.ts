import type { Employee, NewReview, ReviewPeriod } from '../../types/api'
import { trimLikeBackend } from '../../utils/backendText'

/** The three review criteria: the field name the backend uses, and the name shown to people. */
export const RATING_CRITERIA = [
  { key: 'quality_of_work', label: 'Quality of Work' },
  { key: 'delivery_ownership', label: 'Delivery & Ownership' },
  { key: 'teamwork_collaboration', label: 'Teamwork & Collaboration' },
] as const

export type RatingField = (typeof RATING_CRITERIA)[number]['key']
export type ReviewFormField = 'employee' | 'period' | RatingField | 'comments'

export interface ReviewFormValues {
  employee: Employee | null
  period: ReviewPeriod | null
  /** null until a rating is chosen: the form never guesses one. */
  quality_of_work: number | null
  delivery_ownership: number | null
  teamwork_collaboration: number | null
  comments: string
}

export type ReviewFormErrors = Partial<Record<ReviewFormField, string>>

/** The fields in the order they appear on the form (used to find the first one to fix). */
export const FORM_FIELDS: ReviewFormField[] = [
  'employee',
  'period',
  'quality_of_work',
  'delivery_ownership',
  'teamwork_collaboration',
  'comments',
]

export const EMPTY_FORM: ReviewFormValues = {
  employee: null,
  period: null,
  quality_of_work: null,
  delivery_ownership: null,
  teamwork_collaboration: null,
  comments: '',
}

export const MIN_RATING = 1
export const MAX_RATING_VALUE = 5

function isRating(value: number | null): value is number {
  return value !== null && Number.isInteger(value) && value >= MIN_RATING && value <= MAX_RATING_VALUE
}

/**
 * Checks one field the way the backend will. Ratings must be whole numbers from 1 to 5. Comments
 * are trimmed as on the backend and must not be blank; there is deliberately no length limit,
 * because the backend has none. Returns a message, or undefined when the value is fine.
 */
export function validateField(field: ReviewFormField, values: ReviewFormValues): string | undefined {
  switch (field) {
    case 'employee':
      return values.employee ? undefined : 'Choose an employee.'
    case 'period':
      return values.period ? undefined : 'Choose a review period.'
    case 'comments':
      return trimLikeBackend(values.comments) === '' ? 'Comments are required.' : undefined
    default: {
      // quality_of_work, delivery_ownership, teamwork_collaboration
      if (isRating(values[field])) return undefined
      const label = RATING_CRITERIA.find((criterion) => criterion.key === field)?.label ?? field
      return `Choose a rating for ${label}.`
    }
  }
}

export function validateReviewForm(values: ReviewFormValues): ReviewFormErrors {
  const errors: ReviewFormErrors = {}
  for (const field of FORM_FIELDS) {
    const message = validateField(field, values)
    if (message) errors[field] = message
  }
  return errors
}

/**
 * The request body: the two ids, the three ratings and the trimmed comments. There is no average,
 * because the backend calculates it. Only call this for a valid form.
 */
export function toNewReview(values: ReviewFormValues): NewReview {
  const { employee, period, quality_of_work, delivery_ownership, teamwork_collaboration } = values
  if (!employee || !period || !isRating(quality_of_work) || !isRating(delivery_ownership) || !isRating(teamwork_collaboration)) {
    throw new Error('The review form is not complete.')
  }
  return {
    employee_id: employee.id,
    review_period_id: period.id,
    quality_of_work,
    delivery_ownership,
    teamwork_collaboration,
    comments: trimLikeBackend(values.comments),
  }
}

// The backend names the employee and the period by their id fields.
const FORM_FIELD_FOR_BACKEND_FIELD: Record<string, ReviewFormField> = {
  employee_id: 'employee',
  review_period_id: 'period',
  quality_of_work: 'quality_of_work',
  delivery_ownership: 'delivery_ownership',
  teamwork_collaboration: 'teamwork_collaboration',
  comments: 'comments',
}

/**
 * Turns the backend's per-field validation errors (422) into messages for the form. The form
 * already checks the rules itself, and the backend's own wording is technical, so a field it still
 * rejects gets a generic message. Business-rule errors (404 and 409) name no field and are shown
 * as a message at the top of the form instead.
 */
export function messagesFromServer(fieldErrors: Record<string, string>): ReviewFormErrors {
  const errors: ReviewFormErrors = {}
  for (const backendField of Object.keys(fieldErrors)) {
    const field = FORM_FIELD_FOR_BACKEND_FIELD[backendField]
    if (field) errors[field] = 'This value was not accepted.'
  }
  return errors
}

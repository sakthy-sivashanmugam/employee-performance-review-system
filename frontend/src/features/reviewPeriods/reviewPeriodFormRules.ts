import type { NewReviewPeriod } from '../../types/api'
import { characterCount, trimLikeBackend } from '../../utils/backendText'

export interface ReviewPeriodFormValues {
  name: string
  start_date: string
  end_date: string
}

export type ReviewPeriodFormField = keyof ReviewPeriodFormValues
export type ReviewPeriodFormErrors = Partial<Record<ReviewPeriodFormField, string>>

/** The fields in the order they appear on the form (used to find the first one to fix). */
export const FORM_FIELDS: ReviewPeriodFormField[] = ['name', 'start_date', 'end_date']

export const EMPTY_FORM: ReviewPeriodFormValues = { name: '', start_date: '', end_date: '' }

/** The limit matches the database column and the backend schema (backend/app/schemas/review_period.py). */
const NAME_MAX_LENGTH = 100

const LABEL: Record<ReviewPeriodFormField, string> = {
  name: 'Name',
  start_date: 'Start date',
  end_date: 'End date',
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

/**
 * True for a real calendar date written as YYYY-MM-DD, which is the only shape the backend accepts
 * from this form. The year must be 0001-9999, so "2027-02-29" (not a leap year) is rejected.
 */
export function isValidIsoDate(text: string): boolean {
  const match = ISO_DATE.exec(text)
  if (!match) return false
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])]
  if (year < 1 || month < 1 || month > 12 || day < 1) return false
  const leapYear = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
  const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  return day <= daysInMonth[month - 1]
}

/**
 * Checks one field the way the backend will. The name is trimmed as on the backend. A date must
 * be a real date; the browser's date input always gives YYYY-MM-DD, or nothing when it is empty.
 * Returns a message, or undefined when the value is fine.
 */
export function validateField(field: ReviewPeriodFormField, value: string): string | undefined {
  if (field === 'name') {
    const text = trimLikeBackend(value)
    if (text === '') return 'Name is required.'
    if (characterCount(text) > NAME_MAX_LENGTH) return `Name must be ${NAME_MAX_LENGTH} characters or fewer.`
    return undefined
  }
  if (value === '') return `${LABEL[field]} is required.`
  if (!isValidIsoDate(value)) return `Enter a valid ${LABEL[field].toLowerCase()}.`
  return undefined
}

export const END_BEFORE_START_MESSAGE = 'End date must not be before the start date.'

/** Checks every field, and that the end date is not before the start date (the same day is fine). */
export function validateReviewPeriodForm(values: ReviewPeriodFormValues): ReviewPeriodFormErrors {
  const errors: ReviewPeriodFormErrors = {}
  for (const field of FORM_FIELDS) {
    const message = validateField(field, values[field])
    if (message) errors[field] = message
  }
  // Only compare the dates once each one is a real date. ISO dates compare correctly as text.
  if (!errors.start_date && !errors.end_date && values.end_date < values.start_date) {
    errors.end_date = END_BEFORE_START_MESSAGE
  }
  return errors
}

/** The request body: the name without surrounding spaces, and the two dates. No status is sent. */
export function toNewReviewPeriod(values: ReviewPeriodFormValues): NewReviewPeriod {
  return {
    name: trimLikeBackend(values.name),
    start_date: values.start_date,
    end_date: values.end_date,
  }
}

/**
 * Turns the backend's per-field errors into messages for the form. The form already checks the
 * rules itself, and the backend's own wording is technical, so a field the backend still rejects
 * gets a generic message.
 */
export function messagesFromServer(fieldErrors: Record<string, string>): ReviewPeriodFormErrors {
  const errors: ReviewPeriodFormErrors = {}
  for (const field of FORM_FIELDS) {
    if (field in fieldErrors) errors[field] = 'This value was not accepted.'
  }
  return errors
}

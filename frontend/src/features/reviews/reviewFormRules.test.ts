import type { Employee, ReviewPeriod } from '../../types/api'
import {
  EMPTY_FORM,
  FORM_FIELDS,
  messagesFromServer,
  RATING_CRITERIA,
  toNewReview,
  validateField,
  validateReviewForm,
  type ReviewFormValues,
} from './reviewFormRules'

const employee: Employee = {
  id: 7,
  employee_code: 'EMP107',
  name: 'Alex Morgan',
  department: 'Engineering',
  email: 'alex@corp.test',
  status: 'Active',
}
const period: ReviewPeriod = { id: 3, name: '2026 H2', start_date: '2026-07-01', end_date: '2026-12-31', status: 'Open' }

const valid: ReviewFormValues = {
  employee,
  period,
  quality_of_work: 4,
  delivery_ownership: 5,
  teamwork_collaboration: 3,
  comments: 'Strong quarter.',
}

// Invisible characters are built from code points so they are readable in source code.
const NEXT_LINE = String.fromCodePoint(0x0085)
const NO_BREAK_SPACE = String.fromCodePoint(0x00a0)
const BYTE_ORDER_MARK = String.fromCodePoint(0xfeff)

describe('review criteria', () => {
  it('has the three criteria, matching the backend field names', () => {
    expect(RATING_CRITERIA.map((c) => c.key)).toEqual(['quality_of_work', 'delivery_ownership', 'teamwork_collaboration'])
    expect(RATING_CRITERIA.map((c) => c.label)).toEqual(['Quality of Work', 'Delivery & Ownership', 'Teamwork & Collaboration'])
  })

  it('lists the form fields in reading order', () => {
    expect(FORM_FIELDS).toEqual(['employee', 'period', 'quality_of_work', 'delivery_ownership', 'teamwork_collaboration', 'comments'])
  })
})

describe('validateField: employee and period', () => {
  it('require a choice', () => {
    expect(validateField('employee', EMPTY_FORM)).toBe('Choose an employee.')
    expect(validateField('period', EMPTY_FORM)).toBe('Choose a review period.')
  })

  it('accept a chosen employee and period', () => {
    expect(validateField('employee', valid)).toBeUndefined()
    expect(validateField('period', valid)).toBeUndefined()
  })
})

describe('validateField: ratings', () => {
  it.each(RATING_CRITERIA)('$label must be chosen, and the message names it', ({ key, label }) => {
    expect(validateField(key, { ...valid, [key]: null })).toBe(`Choose a rating for ${label}.`)
  })

  it.each([1, 2, 3, 4, 5])('accepts %i', (rating) => {
    for (const { key } of RATING_CRITERIA) expect(validateField(key, { ...valid, [key]: rating })).toBeUndefined()
  })

  it.each([0, 6, -1, 4.5, 2.0001, Number.NaN, Number.POSITIVE_INFINITY])('rejects %s', (rating) => {
    expect(validateField('quality_of_work', { ...valid, quality_of_work: rating })).toBe('Choose a rating for Quality of Work.')
  })
})

describe('validateField: comments', () => {
  it.each(['', ' ', '   \n\t ', NEXT_LINE, NO_BREAK_SPACE + NEXT_LINE])('are required: %j is blank', (comments) => {
    expect(validateField('comments', { ...valid, comments })).toBe('Comments are required.')
  })

  it('accepts ordinary text, including text with surrounding spaces', () => {
    expect(validateField('comments', { ...valid, comments: 'ok' })).toBeUndefined()
    expect(validateField('comments', { ...valid, comments: '  ok  ' })).toBeUndefined()
  })

  it('has no length limit, because the backend has none', () => {
    expect(validateField('comments', { ...valid, comments: 'x'.repeat(100_000) })).toBeUndefined()
  })

  it('treats a byte-order mark as real text, because the backend does not strip it', () => {
    expect(validateField('comments', { ...valid, comments: BYTE_ORDER_MARK })).toBeUndefined()
  })
})

describe('validateReviewForm', () => {
  it('has no errors for a complete form', () => {
    expect(validateReviewForm(valid)).toEqual({})
  })

  it('reports every missing part at once, by field', () => {
    expect(validateReviewForm(EMPTY_FORM)).toEqual({
      employee: 'Choose an employee.',
      period: 'Choose a review period.',
      quality_of_work: 'Choose a rating for Quality of Work.',
      delivery_ownership: 'Choose a rating for Delivery & Ownership.',
      teamwork_collaboration: 'Choose a rating for Teamwork & Collaboration.',
      comments: 'Comments are required.',
    })
  })

  it('reports only what is missing', () => {
    expect(validateReviewForm({ ...valid, delivery_ownership: null, comments: ' ' })).toEqual({
      delivery_ownership: 'Choose a rating for Delivery & Ownership.',
      comments: 'Comments are required.',
    })
  })
})

describe('toNewReview', () => {
  it('builds exactly six fields: two ids, three ratings and the trimmed comments', () => {
    const body = toNewReview({ ...valid, comments: '  Strong quarter.  \n' })

    expect(body).toEqual({
      employee_id: 7,
      review_period_id: 3,
      quality_of_work: 4,
      delivery_ownership: 5,
      teamwork_collaboration: 3,
      comments: 'Strong quarter.',
    })
    expect(Object.keys(body).sort()).toEqual([
      'comments',
      'delivery_ownership',
      'employee_id',
      'quality_of_work',
      'review_period_id',
      'teamwork_collaboration',
    ])
  })

  it('never includes an average, a submission time, or the names', () => {
    const body = toNewReview(valid) as unknown as Record<string, unknown>

    for (const key of ['average_rating', 'submitted_at', 'employee', 'period', 'status']) expect(body).not.toHaveProperty(key)
  })

  it('removes spaces from the comments the way the backend does, and keeps the middle', () => {
    expect(toNewReview({ ...valid, comments: `${NEXT_LINE}Good  work${NEXT_LINE}` }).comments).toBe('Good  work')
  })

  it('refuses an incomplete form instead of sending a half-filled review', () => {
    expect(() => toNewReview(EMPTY_FORM)).toThrow('not complete')
    expect(() => toNewReview({ ...valid, teamwork_collaboration: null })).toThrow('not complete')
    expect(() => toNewReview({ ...valid, quality_of_work: 6 })).toThrow('not complete')
  })
})

describe('messagesFromServer', () => {
  it('maps backend field names to form fields with a generic message', () => {
    expect(
      messagesFromServer({ employee_id: 'x', review_period_id: 'y', quality_of_work: 'z', comments: 'w' }),
    ).toEqual({
      employee: 'This value was not accepted.',
      period: 'This value was not accepted.',
      quality_of_work: 'This value was not accepted.',
      comments: 'This value was not accepted.',
    })
  })

  it('ignores fields that are not on the form, and returns nothing for no fields', () => {
    expect(messagesFromServer({ average_rating: 'Extra inputs are not permitted' })).toEqual({})
    expect(messagesFromServer({})).toEqual({})
  })
})

import {
  EMPTY_FORM,
  END_BEFORE_START_MESSAGE,
  FORM_FIELDS,
  isValidIsoDate,
  messagesFromServer,
  toNewReviewPeriod,
  validateField,
  validateReviewPeriodForm,
  type ReviewPeriodFormValues,
} from './reviewPeriodFormRules'

const valid: ReviewPeriodFormValues = { name: '2027 H1', start_date: '2027-01-01', end_date: '2027-06-30' }

describe('isValidIsoDate', () => {
  it.each(['2027-01-01', '2026-12-31', '0001-01-01', '9999-12-31', '2028-02-29', '2000-02-29', '2027-04-30'])(
    'accepts the real date %s',
    (date) => {
      expect(isValidIsoDate(date)).toBe(true)
    },
  )

  it.each([
    ['2027-02-29', 'not a leap year'],
    ['1900-02-29', 'a century year that is not a leap year'],
    ['2027-04-31', 'April has 30 days'],
    ['2027-13-01', 'no month 13'],
    ['2027-00-10', 'no month 0'],
    ['2027-01-00', 'no day 0'],
    ['2027-01-32', 'no day 32'],
    ['0000-01-01', 'there is no year 0'],
    ['', 'empty'],
    ['2027-1-1', 'not zero padded'],
    ['27-01-01', 'two digit year'],
    ['275760-09-13', 'a six digit year (a browser can produce one)'],
    ['01/01/2027', 'not ISO'],
    ['2027/01/01', 'wrong separators'],
    [' 2027-01-01', 'leading space'],
    ['2027-01-01 ', 'trailing space'],
    ['2027-01-01T00:00:00', 'a timestamp'],
    ['not a date', 'text'],
  ])('rejects %j (%s)', (date) => {
    expect(isValidIsoDate(date)).toBe(false)
  })
})

describe('validateField: name', () => {
  it('is required, even if only spaces', () => {
    expect(validateField('name', '')).toBe('Name is required.')
    expect(validateField('name', '   ')).toBe('Name is required.')
  })

  it('allows 100 characters but not 101, counted after trimming', () => {
    expect(validateField('name', 'x'.repeat(100))).toBeUndefined()
    expect(validateField('name', `  ${'x'.repeat(100)}  `)).toBeUndefined()
    expect(validateField('name', 'x'.repeat(101))).toBe('Name must be 100 characters or fewer.')
  })

  it('accepts ordinary names, including digits and punctuation', () => {
    for (const name of ['2027 H1', 'Q1 Probation Review', "FY26/27 (mid-year)"]) {
      expect(validateField('name', name), name).toBeUndefined()
    }
  })
})

describe('validateField: dates', () => {
  it.each(['start_date', 'end_date'] as const)('%s is required', (field) => {
    expect(validateField(field, '')).toBe(`${field === 'start_date' ? 'Start' : 'End'} date is required.`)
  })

  it('asks for a valid date when the text is not a real date', () => {
    expect(validateField('start_date', '2027-02-29')).toBe('Enter a valid start date.')
    expect(validateField('end_date', '2027-13-01')).toBe('Enter a valid end date.')
  })

  it('accepts a real date', () => {
    expect(validateField('start_date', '2027-01-01')).toBeUndefined()
    expect(validateField('end_date', '2028-02-29')).toBeUndefined()
  })
})

describe('validateReviewPeriodForm', () => {
  it('has no errors for a valid form', () => {
    expect(validateReviewPeriodForm(valid)).toEqual({})
  })

  it('reports every missing field at once', () => {
    expect(validateReviewPeriodForm(EMPTY_FORM)).toEqual({
      name: 'Name is required.',
      start_date: 'Start date is required.',
      end_date: 'End date is required.',
    })
  })

  it('allows a period of one day (the end date equals the start date)', () => {
    expect(validateReviewPeriodForm({ ...valid, start_date: '2027-03-01', end_date: '2027-03-01' })).toEqual({})
  })

  it('puts "end before start" on the end date', () => {
    expect(validateReviewPeriodForm({ ...valid, start_date: '2027-07-01', end_date: '2027-06-30' })).toEqual({
      end_date: END_BEFORE_START_MESSAGE,
    })
  })

  it('compares real calendar order across months and years, not text order of days', () => {
    expect(validateReviewPeriodForm({ ...valid, start_date: '2027-01-31', end_date: '2027-02-01' })).toEqual({})
    expect(validateReviewPeriodForm({ ...valid, start_date: '2026-12-31', end_date: '2027-01-01' })).toEqual({})
    expect(validateReviewPeriodForm({ ...valid, start_date: '2027-01-01', end_date: '2026-12-31' })).toEqual({
      end_date: END_BEFORE_START_MESSAGE,
    })
  })

  it('does not compare the dates while one of them is missing or not a real date', () => {
    expect(validateReviewPeriodForm({ ...valid, end_date: '' })).toEqual({ end_date: 'End date is required.' })
    expect(validateReviewPeriodForm({ ...valid, start_date: '' })).toEqual({ start_date: 'Start date is required.' })
    expect(validateReviewPeriodForm({ ...valid, start_date: '2027-02-30', end_date: '2027-01-01' })).toEqual({
      start_date: 'Enter a valid start date.',
    })
  })

  it('lists the fields in the order they appear on the form', () => {
    expect(FORM_FIELDS).toEqual(['name', 'start_date', 'end_date'])
  })
})

describe('toNewReviewPeriod', () => {
  it('trims the name and sends exactly three fields, with no status', () => {
    const body = toNewReviewPeriod({ name: '  2027 H1 \n', start_date: '2027-01-01', end_date: '2027-06-30' })

    expect(body).toEqual({ name: '2027 H1', start_date: '2027-01-01', end_date: '2027-06-30' })
    expect(Object.keys(body).sort()).toEqual(['end_date', 'name', 'start_date'])
  })

  it('keeps spaces inside the name', () => {
    expect(toNewReviewPeriod({ ...valid, name: 'Mid  Year' }).name).toBe('Mid  Year')
  })
})

describe('messagesFromServer', () => {
  it('gives a generic message for each form field the backend rejected', () => {
    expect(messagesFromServer({ name: 'String should have at least 1 character', end_date: 'bad' })).toEqual({
      name: 'This value was not accepted.',
      end_date: 'This value was not accepted.',
    })
  })

  it('ignores fields that are not on the form, and returns nothing for no fields', () => {
    expect(messagesFromServer({ status: 'Extra inputs are not permitted' })).toEqual({})
    expect(messagesFromServer({})).toEqual({})
  })
})

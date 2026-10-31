import type { ReviewPeriod } from '../../types/api'
import { filterReviewPeriods, type ReviewPeriodFilter } from './filterReviewPeriods'

function period(id: number, name: string, start: string, end: string, status: ReviewPeriod['status'] = 'Open'): ReviewPeriod {
  return { id, name, start_date: start, end_date: end, status }
}

const h1 = period(1, '2026 H1', '2026-01-01', '2026-06-30', 'Closed')
const h2 = period(2, '2026 H2', '2026-07-01', '2026-12-31', 'Open')
const q1 = period(3, 'Q1 Probation Review', '2027-01-01', '2027-03-31', 'Open')
const ALL = [h1, h2, q1]

const none: ReviewPeriodFilter = { search: '', status: 'All' }

function names(filter: Partial<ReviewPeriodFilter>, list = ALL) {
  return filterReviewPeriods(list, { ...none, ...filter }).map((p) => p.name)
}

describe('filterReviewPeriods: order', () => {
  it('lists the newest start date first', () => {
    expect(names({})).toEqual(['Q1 Probation Review', '2026 H2', '2026 H1'])
  })

  it('does not depend on the order it was given', () => {
    expect(names({}, [q1, h1, h2])).toEqual(['Q1 Probation Review', '2026 H2', '2026 H1'])
  })

  it('puts the later end date first when two periods start on the same day', () => {
    const short = period(10, 'Short', '2026-07-01', '2026-07-31')
    const long = period(11, 'Long', '2026-07-01', '2026-12-31')

    expect(names({}, [short, long])).toEqual(['Long', 'Short'])
  })

  it('puts the most recently created first when dates are identical', () => {
    const first = period(20, 'Same', '2026-07-01', '2026-12-31')
    const second = period(21, 'Same', '2026-07-01', '2026-12-31')

    expect(filterReviewPeriods([first, second], none).map((p) => p.id)).toEqual([21, 20])
  })

  it('does not change the list it was given', () => {
    const input = [h1, h2, q1]
    filterReviewPeriods(input, none)

    expect(input.map((p) => p.id)).toEqual([1, 2, 3])
  })
})

describe('filterReviewPeriods: status', () => {
  it('shows only Open or only Closed periods', () => {
    expect(names({ status: 'Open' })).toEqual(['Q1 Probation Review', '2026 H2'])
    expect(names({ status: 'Closed' })).toEqual(['2026 H1'])
  })

  it('returns nothing when no period has that status', () => {
    expect(names({ status: 'Closed' }, [h2, q1])).toEqual([])
  })
})

describe('filterReviewPeriods: search', () => {
  it('matches part of the name, ignoring case', () => {
    expect(names({ search: 'h2' })).toEqual(['2026 H2'])
    expect(names({ search: 'PROBATION' })).toEqual(['Q1 Probation Review'])
  })

  it('matches several periods and keeps them newest first', () => {
    expect(names({ search: '2026' })).toEqual(['2026 H2', '2026 H1'])
  })

  it('needs every typed word to appear, in any order', () => {
    expect(names({ search: 'review probation' })).toEqual(['Q1 Probation Review'])
    expect(names({ search: 'probation h1' })).toEqual([])
  })

  it('ignores spaces around the text, and an all-space search matches everything', () => {
    expect(names({ search: '   h1   ' })).toEqual(['2026 H1'])
    expect(names({ search: '    ' })).toHaveLength(3)
  })

  it('looks at the name only, not at the dates or the status', () => {
    expect(names({ search: '2027' })).toEqual([]) // appears in dates, not in a name
    expect(names({ search: 'closed' })).toEqual([])
  })

  it('treats characters such as . and + literally', () => {
    expect(names({ search: '2026.h' })).toEqual([])
    expect(names({ search: '+' })).toEqual([])
  })
})

it('combines the search and the status', () => {
  expect(names({ search: '2026', status: 'Open' })).toEqual(['2026 H2'])
  expect(names({ search: '2026', status: 'Closed' })).toEqual(['2026 H1'])
  expect(names({ search: 'probation', status: 'Closed' })).toEqual([])
})

it('handles an empty list', () => {
  expect(filterReviewPeriods([], { search: 'x', status: 'Open' })).toEqual([])
})

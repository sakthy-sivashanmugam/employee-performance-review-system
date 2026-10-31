import { formatDate, formatDateRange, formatTimestampDate, toIsoDate } from './dates'

// The Australian locale (en-AU) writes the day first, then the month, then the year. Its own
// month names are used as they are: most are three letters ("Jan", "Dec"), but June, July and
// September are written "June", "July" and "Sept". The tests below document that.
describe('date formatting (Australian style: day, month, year)', () => {
  it('formats a YYYY-MM-DD date', () => {
    expect(formatDate('2026-12-31')).toBe('31 Dec 2026')
    expect(formatDate('2027-01-05')).toBe('5 Jan 2027')
    expect(formatDate('2026-10-30')).toBe('30 Oct 2026')
  })

  it("uses the locale's own names for June, July and September", () => {
    expect(formatDate('2026-07-01')).toBe('1 July 2026')
    expect(formatDate('2026-06-30')).toBe('30 June 2026')
    expect(formatDate('2026-09-15')).toBe('15 Sept 2026')
  })

  it('does not shift the day because of the time zone', () => {
    // new Date('2026-01-01') is midnight UTC, which is the previous evening in the Americas.
    expect(formatDate('2026-01-01')).toBe('1 Jan 2026')
    expect(formatDate('2026-03-01')).toBe('1 Mar 2026')
  })

  it('formats a range with an en dash', () => {
    expect(formatDateRange('2026-07-01', '2026-12-31')).toBe('1 July 2026 – 31 Dec 2026')
  })

  it('formats the date part of a timestamp', () => {
    expect(formatTimestampDate('2026-10-15T12:00:00+00:00')).toBe('15 Oct 2026')
  })

  it('puts the day before the month, not after (not the US order)', () => {
    expect(formatDate('2026-10-04')).toBe('4 Oct 2026')
    expect(formatDate('2026-10-04')).not.toMatch(/^Oct/)
  })
})

describe('toIsoDate', () => {
  it('builds local YYYY-MM-DD with leading zeros', () => {
    expect(toIsoDate(new Date(2026, 0, 5))).toBe('2026-01-05')
    expect(toIsoDate(new Date(2026, 11, 31))).toBe('2026-12-31')
  })
})

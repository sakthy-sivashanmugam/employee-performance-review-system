/** Today's date (or any date) as local YYYY-MM-DD, the same shape the API uses for dates. */
export function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/** Builds a local date from YYYY-MM-DD. new Date('2027-01-01') would be shifted by the time zone. */
function parseIsoDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(year, month - 1, day)
}

// Always Australian style ("1 Jul 2026"), whatever language the browser is set to, so every
// screen shows dates the same way. Change the locale here to change it everywhere.
const dateFormat = new Intl.DateTimeFormat('en-AU', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

/** "1 Jul 2026" from a YYYY-MM-DD date. */
export function formatDate(isoDate: string): string {
  return dateFormat.format(parseIsoDate(isoDate))
}

export function formatDateRange(startDate: string, endDate: string): string {
  return `${formatDate(startDate)} – ${formatDate(endDate)}`
}

/** "30 Oct 2026" from an ISO timestamp such as the API's submitted_at. */
export function formatTimestampDate(timestamp: string): string {
  return dateFormat.format(new Date(timestamp))
}

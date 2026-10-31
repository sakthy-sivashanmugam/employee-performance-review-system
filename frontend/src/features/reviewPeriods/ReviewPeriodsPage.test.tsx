import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReviewPeriod } from '../../types/api'
import { mockScreen, renderWithProviders } from '../../test/render'
import { ReviewPeriodsPage } from './ReviewPeriodsPage'

const periods: ReviewPeriod[] = [
  { id: 1, name: '2026 H1', start_date: '2026-01-01', end_date: '2026-06-30', status: 'Closed' },
  { id: 2, name: '2026 H2', start_date: '2026-07-01', end_date: '2026-12-31', status: 'Open' },
  { id: 3, name: 'Q1 Probation Review', start_date: '2027-01-01', end_date: '2027-03-31', status: 'Open' },
]

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

function stubPeriods(list: ReviewPeriod[] = periods) {
  const fetchMock = vi.fn(async () => json(list))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

async function renderLoaded(list: ReviewPeriod[] = periods) {
  const fetchMock = stubPeriods(list)
  renderWithProviders(<ReviewPeriodsPage />, { route: '/review-periods' })
  await screen.findByText(/Showing \d+ of \d+/)
  return fetchMock
}

/** Names shown in the list, in order, whichever layout is active. */
function shownNames() {
  const table = screen.queryByRole('table', { name: 'Review periods' })
  if (table) {
    return within(table)
      .getAllByRole('row')
      .slice(1) // the header row
      .map((row) => within(row).getByRole('rowheader').textContent)
  }
  return within(screen.getByRole('list', { name: 'Review periods' }))
    .getAllByRole('listitem')
    .map((item) => within(item).getByRole('heading').textContent)
}

const search = () => screen.getByRole('searchbox', { name: 'Search review periods' })
const statusButton = (name: string) => screen.getByRole('button', { name })

afterEach(() => vi.unstubAllGlobals())

describe('ReviewPeriodsPage on a wide screen (table)', () => {
  beforeEach(() => mockScreen(true))

  it('shows the periods newest first, in a table with labelled columns', async () => {
    await renderLoaded()

    const table = screen.getByRole('table', { name: 'Review periods' })
    expect(within(table).getAllByRole('columnheader').map((h) => h.textContent)).toEqual([
      'Name',
      'Start date',
      'End date',
      'Status',
    ])
    expect(shownNames()).toEqual(['Q1 Probation Review', '2026 H2', '2026 H1'])
    expect(screen.queryByRole('list', { name: 'Review periods' })).not.toBeInTheDocument()
  })

  it('shows dates in Australian style, and marks them as dates for assistive technology', async () => {
    await renderLoaded()

    const rows = within(screen.getByRole('table')).getAllByRole('row').slice(1)
    expect(within(rows[0]).getAllByRole('cell').map((c) => c.textContent)).toEqual(['1 Jan 2027', '31 Mar 2027', 'Open'])
    expect(within(rows[1]).getByText('1 July 2026')).toHaveAttribute('datetime', '2026-07-01')
    expect(within(rows[2]).getByText('30 June 2026')).toHaveAttribute('datetime', '2026-06-30')
  })

  it('shows each status as text with an icon, not only by colour', async () => {
    await renderLoaded()

    const rows = within(screen.getByRole('table')).getAllByRole('row').slice(1)
    expect(within(rows[1]).getByText('Open')).toBeInTheDocument()
    expect(within(rows[2]).getByText('Closed')).toBeInTheDocument()
  })

  it('shows the count, the heading and a link to create a period', async () => {
    await renderLoaded()

    expect(screen.getByText('Showing 3 of 3 review periods')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Review Periods' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Create Review Period' })).toHaveAttribute('href', '/review-periods/new')
  })
})

describe('ReviewPeriodsPage on a phone or tablet (cards)', () => {
  beforeEach(() => mockScreen(false))

  it('shows each period as a card, newest first, with no table', async () => {
    await renderLoaded()

    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    const items = within(screen.getByRole('list', { name: 'Review periods' })).getAllByRole('listitem')
    expect(items).toHaveLength(3)
    expect(shownNames()).toEqual(['Q1 Probation Review', '2026 H2', '2026 H1'])

    const first = items[0]
    expect(within(first).getByRole('heading', { name: 'Q1 Probation Review' })).toBeInTheDocument()
    expect(within(first).getByText('1 Jan 2027')).toBeInTheDocument()
    expect(within(first).getByText('31 Mar 2027')).toBeInTheDocument()
    expect(within(first).getByText('Open')).toBeInTheDocument()
    expect(within(first).getByText('Start date').tagName).toBe('DT')
    expect(within(first).getByText('End date').tagName).toBe('DT')
  })

  it('searches the same way in the card layout', async () => {
    await renderLoaded()

    await userEvent.type(search(), 'h1')

    expect(shownNames()).toEqual(['2026 H1'])
  })
})

describe('searching and filtering', () => {
  beforeEach(() => mockScreen(true))

  it('searches the name as you type, ignoring case, and keeps the newest-first order', async () => {
    await renderLoaded()

    await userEvent.type(search(), '2026')
    expect(shownNames()).toEqual(['2026 H2', '2026 H1'])
    expect(screen.getByText('Showing 2 of 3 review periods')).toBeInTheDocument()

    await userEvent.clear(search())
    await userEvent.type(search(), 'PROBATION')
    expect(shownNames()).toEqual(['Q1 Probation Review'])
  })

  it('needs every typed word to match the name', async () => {
    await renderLoaded()

    await userEvent.type(search(), 'review probation')
    expect(shownNames()).toEqual(['Q1 Probation Review'])
  })

  it('filters by status', async () => {
    await renderLoaded()

    await userEvent.click(statusButton('Open'))
    expect(shownNames()).toEqual(['Q1 Probation Review', '2026 H2'])
    expect(screen.getByText('Showing 2 of 3 review periods')).toBeInTheDocument()

    await userEvent.click(statusButton('Closed'))
    expect(shownNames()).toEqual(['2026 H1'])

    await userEvent.click(statusButton('All'))
    expect(shownNames()).toHaveLength(3)
  })

  it('marks the chosen status, and keeps it when the same button is pressed again', async () => {
    await renderLoaded()
    expect(statusButton('All')).toHaveAttribute('aria-pressed', 'true')

    await userEvent.click(statusButton('Open'))
    await userEvent.click(statusButton('Open'))

    expect(statusButton('Open')).toHaveAttribute('aria-pressed', 'true')
    expect(shownNames()).toEqual(['Q1 Probation Review', '2026 H2'])
  })

  it('explains when nothing matches, and Clear filters brings everything back', async () => {
    await renderLoaded()
    await userEvent.type(search(), 'zzz')
    await userEvent.click(statusButton('Closed'))

    expect(screen.getByText('No review periods match your search')).toBeInTheDocument()
    expect(screen.getByText('Showing 0 of 3 review periods')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }))

    expect(search()).toHaveValue('')
    expect(statusButton('All')).toHaveAttribute('aria-pressed', 'true')
    expect(shownNames()).toHaveLength(3)
  })

  it('filters in the browser: it loads the list once and never writes', async () => {
    const fetchMock = await renderLoaded()

    await userEvent.type(search(), 'h2')
    await userEvent.click(statusButton('Open'))
    await userEvent.click(statusButton('Closed'))

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, options] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('/api/review-periods')
    expect(options).not.toHaveProperty('method')
    expect(options).not.toHaveProperty('body')
  })
})

describe('loading, empty and error states', () => {
  beforeEach(() => mockScreen(true))

  it('announces loading and shows placeholders until the data arrives', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
    renderWithProviders(<ReviewPeriodsPage />, { route: '/review-periods' })

    expect(screen.getByRole('status')).toHaveTextContent('Loading review periods')
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
  })

  it('invites you to create the first period when there are none', async () => {
    stubPeriods([])
    renderWithProviders(<ReviewPeriodsPage />, { route: '/review-periods' })

    expect(await screen.findByText('No review periods yet')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Create Review Period' })).toHaveLength(2) // header and message
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
    expect(screen.queryByText(/Showing/)).not.toBeInTheDocument()
  })

  it('uses the singular for a single period', async () => {
    await renderLoaded([periods[0]])

    expect(screen.getByText('Showing 1 of 1 review period')).toBeInTheDocument()
  })

  it('shows an error with a Retry button, and recovers when retried', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    renderWithProviders(<ReviewPeriodsPage />, { route: '/review-periods' })

    expect(await screen.findByRole('alert')).toHaveTextContent(/review periods could not be loaded.*Cannot reach the server/i)
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.queryByText('No review periods yet')).not.toBeInTheDocument()

    stubPeriods()
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))

    expect(await screen.findByText('Showing 3 of 3 review periods')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows the message from the backend when it reports an error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ detail: 'Database unavailable' }, 500)))
    renderWithProviders(<ReviewPeriodsPage />, { route: '/review-periods' })

    expect(await screen.findByRole('alert')).toHaveTextContent('Database unavailable')
  })
})

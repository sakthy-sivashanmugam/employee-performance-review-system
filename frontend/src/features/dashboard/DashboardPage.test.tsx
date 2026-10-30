import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Employee, ReviewPeriod, ReviewRegisterItem } from '../../types/api'
import { renderWithProviders } from '../../test/render'
import { DashboardPage } from './DashboardPage'

const employees: Employee[] = [
  { id: 1, employee_code: 'EMP101', name: 'Alex Morgan', department: 'Engineering', email: 'a@x.com', status: 'Active' },
  { id: 2, employee_code: 'EMP102', name: 'Priya Nair', department: 'Marketing', email: 'p@x.com', status: 'Active' },
  { id: 3, employee_code: 'EMP103', name: 'Sam Carter', department: 'Finance', email: 's@x.com', status: 'Inactive' },
]

// A period with a date range that is always "now": starts long ago and ends far in the future.
const periods: ReviewPeriod[] = [
  { id: 1, name: '2020 H1', start_date: '2020-01-01', end_date: '2020-06-30', status: 'Closed' },
  { id: 2, name: 'Ongoing Period', start_date: '2000-01-01', end_date: '2999-12-31', status: 'Open' },
]

function register(id: number, employeeName: string, periodId: number, average: number): ReviewRegisterItem {
  return {
    id,
    employee_id: id,
    employee_code: `EMP10${id}`,
    employee_name: employeeName,
    department: 'Engineering',
    review_period_id: periodId,
    review_period_name: periodId === 2 ? 'Ongoing Period' : '2020 H1',
    quality_of_work: 4,
    delivery_ownership: 5,
    teamwork_collaboration: 4,
    average_rating: average,
    comments: 'Good',
    submitted_at: '2026-10-05T09:00:00+11:00',
  }
}

const reviews = [register(3, 'Sam Carter', 2, 4.33), register(2, 'Priya Nair', 2, 3), register(1, 'Alex Morgan', 1, 5)]

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

/** Answers the three list endpoints the dashboard reads. */
function stubApi(data: { employees?: Employee[]; periods?: ReviewPeriod[]; reviews?: ReviewRegisterItem[] } = {}) {
  const fetchMock = vi.fn(async (url: string) => {
    if (url === '/api/employees') return json(data.employees ?? employees)
    if (url === '/api/review-periods') return json(data.periods ?? periods)
    if (url === '/api/reviews') return json(data.reviews ?? reviews)
    return json({ detail: 'not found' }, 404)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => {
  vi.unstubAllGlobals()
})

function card(name: string) {
  return screen.getByRole('region', { name })
}

describe('DashboardPage', () => {
  it('shows the four summary figures from the API', async () => {
    stubApi()
    renderWithProviders(<DashboardPage />)

    expect(await within(card('Total Employees')).findByText('3')).toBeInTheDocument()
    expect(within(card('Active Employees')).getByText('2')).toBeInTheDocument()
    expect(within(card('Open Review Periods')).getByText('1')).toBeInTheDocument()
    expect(within(card('Reviews Submitted')).getByText('3')).toBeInTheDocument()
  })

  it('shows the current review period with its status and review count', async () => {
    stubApi()
    renderWithProviders(<DashboardPage />)

    const section = card('Current Review Period')
    expect(await within(section).findByText('Ongoing Period')).toBeInTheDocument()
    expect(within(section).getByText('Open')).toBeInTheDocument()
    expect(within(section).getByText('2 reviews submitted in this period')).toBeInTheDocument()
  })

  it('lists recent reviews with the backend-calculated average', async () => {
    stubApi()
    renderWithProviders(<DashboardPage />)

    const section = card('Recent Reviews')
    const items = await within(section).findAllByRole('listitem')
    expect(items).toHaveLength(3)
    expect(within(items[0]).getByText('Sam Carter (EMP103)')).toBeInTheDocument()
    expect(within(items[0]).getByText('4.33 / 5')).toBeInTheDocument()
    expect(within(items[2]).getByText('Alex Morgan (EMP101)')).toBeInTheDocument()
    expect(within(section).getByRole('link', { name: 'View Review Register' })).toHaveAttribute('href', '/review-register')
  })

  it('offers the three quick actions as links', async () => {
    stubApi()
    renderWithProviders(<DashboardPage />)

    const section = card('Quick Actions')
    expect(within(section).getByRole('link', { name: 'Add Employee' })).toHaveAttribute('href', '/employees/new')
    expect(within(section).getByRole('link', { name: 'Create Review Period' })).toHaveAttribute('href', '/review-periods/new')
    expect(within(section).getByRole('link', { name: 'Submit Review' })).toHaveAttribute('href', '/reviews/new')
  })

  it('shows helpful messages when there is no data yet', async () => {
    stubApi({ employees: [], periods: [], reviews: [] })
    renderWithProviders(<DashboardPage />)

    expect(await screen.findByText('There is no open review period.')).toBeInTheDocument()
    expect(screen.getByText('No reviews have been submitted yet.')).toBeInTheDocument()
    expect(within(card('Total Employees')).getByText('0')).toBeInTheDocument()
  })

  it('shows loading placeholders before the data arrives', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
    renderWithProviders(<DashboardPage />)

    expect(within(card('Total Employees')).queryByText('3')).not.toBeInTheDocument()
    expect(screen.queryByText('There is no open review period.')).not.toBeInTheDocument()
  })

  it('shows an error with a Retry button, and recovers when retried', async () => {
    const failing = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    vi.stubGlobal('fetch', failing)
    renderWithProviders(<DashboardPage />)

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not be loaded.*Cannot reach the server/i)
    // The quick actions stay usable, and no misleading zeros are shown.
    expect(card('Quick Actions')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Total Employees' })).not.toBeInTheDocument()

    stubApi()
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))

    expect(await within(card('Total Employees')).findByText('3')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows the message from the backend when it reports an error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ detail: 'Database unavailable' }, 500)))
    renderWithProviders(<DashboardPage />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Database unavailable')
  })

  it('reads only from existing list endpoints and never sends data', async () => {
    const fetchMock = stubApi()
    renderWithProviders(<DashboardPage />)
    await within(card('Total Employees')).findByText('3')

    const urls = fetchMock.mock.calls.map((call) => call[0]).sort()
    expect(urls).toEqual(['/api/employees', '/api/review-periods', '/api/reviews'])
    for (const call of fetchMock.mock.calls) {
      expect((call as unknown[])[1]).not.toHaveProperty('method')
      expect((call as unknown[])[1]).not.toHaveProperty('body')
    }
  })
})

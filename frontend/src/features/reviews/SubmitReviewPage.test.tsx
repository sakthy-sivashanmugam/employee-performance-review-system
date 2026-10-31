import { fireEvent, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import type { Employee, Review, ReviewPeriod } from '../../types/api'
import { mockScreen, renderWithProviders } from '../../test/render'
import { SubmitReviewPage } from './SubmitReviewPage'

const employees: Employee[] = [
  { id: 1, employee_code: 'EMP101', name: 'Alex Morgan', department: 'Engineering', email: 'a@corp.test', status: 'Active' },
  { id: 2, employee_code: 'EMP102', name: 'Priya Nair', department: 'Marketing', email: 'p@corp.test', status: 'Active' },
]
const periods: ReviewPeriod[] = [
  { id: 1, name: '2026 H2', start_date: '2026-07-01', end_date: '2026-12-31', status: 'Open' },
  { id: 2, name: '2027 H1', start_date: '2027-01-01', end_date: '2027-06-30', status: 'Open' },
]

/** What the backend would answer for Alex Morgan in "2026 H2" with ratings 4, 5 and 4 (average 4.33). */
const saved: Review = {
  id: 1,
  employee_id: 1,
  review_period_id: 1,
  quality_of_work: 4,
  delivery_ownership: 5,
  teamwork_collaboration: 4,
  average_rating: 4.33,
  comments: 'Strong quarter.',
  submitted_at: '2026-10-31T09:00:00+11:00',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

type PostHandler = (body: Record<string, unknown>) => Response | Promise<Response>

/** Answers the two lists the form reads and the create it sends. */
function stubApi(onPost: PostHandler = () => json(saved, 201), data: { employees?: Employee[]; periods?: ReviewPeriod[] } = {}) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (init?.method === 'POST') return onPost(JSON.parse(init.body as string))
    if (url === '/api/employees?status=Active') return json(data.employees ?? employees)
    if (url === '/api/review-periods?status=Open') return json(data.periods ?? periods)
    return json({ detail: `unexpected request ${url}` }, 404)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function renderPage() {
  return renderWithProviders(
    <Routes>
      <Route path="/reviews/new" element={<SubmitReviewPage />} />
      <Route path="/" element={<p>Dashboard stub</p>} />
    </Routes>,
    { route: '/reviews/new' },
  )
}

const employeeBox = () => screen.getByRole('combobox', { name: /^Employee/ })
const periodSelect = () => screen.getByRole('combobox', { name: /^Review period/ })
const ratingGroup = (label: string) => screen.getByRole('group', { name: new RegExp(`^${label}`) })
const comments = () => screen.getByRole('textbox', { name: /^Comments/ })
const submitButton = () => screen.getByRole('button', { name: /Submit Review|Submitting/ })

const posts = (fetchMock: ReturnType<typeof stubApi>) =>
  fetchMock.mock.calls.filter(([, init]) => (init as RequestInit | undefined)?.method === 'POST')

function rate(label: string, stars: number) {
  fireEvent.click(ratingGroup(label).querySelector(`input[value="${stars}"]`) as HTMLInputElement)
}

async function fillForm(commentText = 'Strong quarter.') {
  await userEvent.click(await screen.findByRole('combobox', { name: /^Employee/ }))
  await userEvent.click(await screen.findByRole('option', { name: /Alex Morgan/ }))
  await userEvent.selectOptions(periodSelect(), '1')
  rate('Quality of Work', 4)
  rate('Delivery & Ownership', 5)
  rate('Teamwork & Collaboration', 4)
  await userEvent.type(comments(), commentText)
}

async function fillAndSubmit() {
  await fillForm()
  await userEvent.click(submitButton())
}

beforeEach(() => mockScreen(true))
afterEach(() => vi.unstubAllGlobals())

describe('Submit Review page: loading what the form offers', () => {
  it('reads only Active employees and Open periods, with GET requests only', async () => {
    const fetchMock = stubApi()
    renderPage()
    await screen.findByRole('form', { name: 'Submit review' })

    expect(fetchMock.mock.calls.map((call) => call[0]).sort()).toEqual([
      '/api/employees?status=Active',
      '/api/review-periods?status=Open',
    ])
    expect(posts(fetchMock)).toHaveLength(0)
    expect(screen.getByRole('heading', { level: 1, name: 'Submit Review' })).toBeInTheDocument()
  })

  it('announces loading before the form appears', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
    renderPage()

    expect(screen.getByRole('status')).toHaveTextContent('Loading the review form')
    expect(screen.queryByRole('form', { name: 'Submit review' })).not.toBeInTheDocument()
  })

  it('shows an error with Retry, and recovers when retried', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent(/review form could not be loaded.*Cannot reach the server/i)
    expect(screen.queryByRole('form', { name: 'Submit review' })).not.toBeInTheDocument()

    stubApi()
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))

    expect(await screen.findByRole('form', { name: 'Submit review' })).toBeInTheDocument()
  })

  it('explains when there are no active employees, and links to Employees', async () => {
    stubApi(undefined, { employees: [] })
    renderPage()

    expect(await screen.findByText('There are no active employees to review')).toBeInTheDocument()
    expect(screen.queryByText('There is no open review period')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Go to Employees' })).toHaveAttribute('href', '/employees')
    expect(screen.queryByRole('form', { name: 'Submit review' })).not.toBeInTheDocument()
  })

  it('explains when there is no open review period, and links to creating one', async () => {
    stubApi(undefined, { periods: [] })
    renderPage()

    expect(await screen.findByText('There is no open review period')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Create Review Period' })).toHaveAttribute('href', '/review-periods/new')
    expect(screen.queryByRole('form', { name: 'Submit review' })).not.toBeInTheDocument()
  })

  it('explains both problems when both are missing', async () => {
    stubApi(undefined, { employees: [], periods: [] })
    renderPage()

    expect(await screen.findByText('There are no active employees to review')).toBeInTheDocument()
    expect(screen.getByText('There is no open review period')).toBeInTheDocument()
  })
})

describe('Submit Review page: submitting', () => {
  it('sends one POST with exactly the six review fields: no average, no time', async () => {
    const fetchMock = stubApi()
    renderPage()

    await fillAndSubmit()
    await screen.findByRole('heading', { name: 'Review submitted' })

    expect(posts(fetchMock)).toHaveLength(1)
    const [url, init] = posts(fetchMock)[0] as [string, RequestInit]
    const body = JSON.parse(init.body as string)
    expect(url).toBe('/api/reviews')
    expect(body).toEqual({
      employee_id: 1,
      review_period_id: 1,
      quality_of_work: 4,
      delivery_ownership: 5,
      teamwork_collaboration: 4,
      comments: 'Strong quarter.',
    })
    expect(body).not.toHaveProperty('average_rating')
    expect(body).not.toHaveProperty('submitted_at')
  })

  it('shows a confirmation with the ratings and the average the backend calculated', async () => {
    // The backend answers 4.2 here, not the 4.33 the ratings would give, to show the screen
    // displays what the backend says and never works the average out itself.
    stubApi(() => json({ ...saved, average_rating: 4.2 }, 201))
    renderPage()

    await fillAndSubmit()

    const heading = await screen.findByRole('heading', { name: 'Review submitted' })
    expect(heading).toHaveFocus()
    expect(screen.getByText('The review for Alex Morgan (EMP101) in 2026 H2 was submitted.')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '4 out of 5 stars, Quality of Work' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '5 out of 5 stars, Delivery & Ownership' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '4 out of 5 stars, Teamwork & Collaboration' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '4.2 out of 5 stars, Average rating' })).toBeInTheDocument()
    expect(screen.getByText('4.2 / 5')).toBeInTheDocument()
    expect(screen.queryByRole('form', { name: 'Submit review' })).not.toBeInTheDocument()
  })

  it('"Submit another review" gives a fresh, empty form with nothing preselected', async () => {
    const fetchMock = stubApi()
    renderPage()
    await fillAndSubmit()
    await screen.findByRole('heading', { name: 'Review submitted' })

    await userEvent.click(screen.getByRole('button', { name: 'Submit another review' }))

    expect(await screen.findByRole('form', { name: 'Submit review' })).toBeInTheDocument()
    expect(employeeBox()).toHaveValue('')
    expect(periodSelect()).toHaveValue('')
    expect(comments()).toHaveValue('')
    for (const label of ['Quality of Work', 'Delivery & Ownership', 'Teamwork & Collaboration']) {
      expect(within(ratingGroup(label)).getByText('Not rated')).toBeInTheDocument()
    }
    expect(screen.queryByText('Choose an employee.')).not.toBeInTheDocument()
    expect(posts(fetchMock)).toHaveLength(1) // nothing more was sent
  })

  it('"Back to dashboard" goes to the dashboard', async () => {
    stubApi()
    renderPage()
    await fillAndSubmit()
    await screen.findByRole('heading', { name: 'Review submitted' })

    await userEvent.click(screen.getByRole('link', { name: 'Back to dashboard' }))

    expect(await screen.findByText('Dashboard stub')).toBeInTheDocument()
  })

  it('sends nothing when the form is incomplete', async () => {
    const fetchMock = stubApi()
    renderPage()
    await screen.findByRole('form', { name: 'Submit review' })

    await userEvent.click(submitButton())

    expect(posts(fetchMock)).toHaveLength(0)
    expect(screen.getByText('Choose an employee.')).toBeInTheDocument()
  })

  it('creates one review even if Submit Review is pressed twice quickly', async () => {
    let finish: () => void = () => {}
    const fetchMock = stubApi(() => new Promise<Response>((resolve) => (finish = () => resolve(json(saved, 201)))))
    renderPage()
    await fillForm()

    await userEvent.click(submitButton())
    fireEvent.submit(screen.getByRole('form', { name: 'Submit review' }))

    expect(posts(fetchMock)).toHaveLength(1)
    finish()
    expect(await screen.findByRole('heading', { name: 'Review submitted' })).toBeInTheDocument()
  })

  it('Cancel goes back to the dashboard without sending anything', async () => {
    const fetchMock = stubApi()
    renderPage()
    await screen.findByRole('form', { name: 'Submit review' })

    await userEvent.click(screen.getByRole('link', { name: 'Cancel' }))

    expect(await screen.findByText('Dashboard stub')).toBeInTheDocument()
    expect(posts(fetchMock)).toHaveLength(0)
  })
})

describe('Submit Review page: problems from the backend', () => {
  it.each([
    [409, "Employee EMP101 already has a review for '2026 H2'"],
    [409, 'Employee EMP101 is not Active'],
    [409, "Review period '2026 H2' is not Open"],
    [404, 'Employee 1 not found'],
    [404, 'Review period 1 not found'],
  ])('shows the backend message for a %i in an alert, and keeps everything entered', async (status, detail) => {
    stubApi(() => json({ detail }, status))
    renderPage()

    await fillAndSubmit()

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(detail)
    expect(alert).toHaveFocus()
    expect(screen.queryByRole('heading', { name: 'Review submitted' })).not.toBeInTheDocument()
    expect(employeeBox()).toHaveValue('Alex Morgan (EMP101)')
    expect(periodSelect()).toHaveValue('1')
    expect(comments()).toHaveValue('Strong quarter.')
    expect(within(ratingGroup('Quality of Work')).getByText('4 / 5')).toBeInTheDocument()
    expect(submitButton()).toBeEnabled()
  })

  it('lets you fix the problem and submit again after a duplicate was reported', async () => {
    let attempts = 0
    const fetchMock = stubApi(() =>
      ++attempts === 1 ? json({ detail: "Employee EMP101 already has a review for '2026 H2'" }, 409) : json(saved, 201),
    )
    renderPage()
    await fillAndSubmit()
    await screen.findByRole('alert')

    await userEvent.selectOptions(periodSelect(), '2') // choose a different period
    await userEvent.click(submitButton())

    expect(await screen.findByRole('heading', { name: 'Review submitted' })).toBeInTheDocument()
    expect(posts(fetchMock)).toHaveLength(2)
    expect(JSON.parse((posts(fetchMock)[1][1] as RequestInit).body as string).review_period_id).toBe(2)
  })

  it('shows a generic message under a field the backend rejected (422), and focuses it', async () => {
    stubApi(() => json({ detail: [{ loc: ['body', 'comments'], msg: 'String should have at least 1 character' }] }, 422))
    renderPage()

    await fillAndSubmit()

    expect(await screen.findByText('This value was not accepted.')).toBeInTheDocument()
    expect(comments()).toHaveFocus()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows a generic alert when the backend rejects the review without naming a field', async () => {
    stubApi(() => json({ detail: [{ loc: ['body'], msg: 'Something is wrong' }] }, 422))
    renderPage()

    await fillAndSubmit()

    expect(await screen.findByRole('alert')).toHaveTextContent('The review was not accepted. Check it and try again.')
  })

  it('shows the backend message for a server error, and keeps the form', async () => {
    stubApi(() => json({ detail: 'Database unavailable' }, 500))
    renderPage()

    await fillAndSubmit()

    expect(await screen.findByRole('alert')).toHaveTextContent('Database unavailable')
    expect(comments()).toHaveValue('Strong quarter.')
  })

  it('explains when the backend cannot be reached, and lets you try again', async () => {
    let up = false
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === 'POST') {
        if (!up) throw new TypeError('Failed to fetch')
        return json(saved, 201)
      }
      return json(url.includes('employees') ? employees : periods)
    })
    vi.stubGlobal('fetch', fetchMock)
    renderPage()

    await fillAndSubmit()
    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot reach the server')
    expect(comments()).toHaveValue('Strong quarter.')

    up = true
    await userEvent.click(submitButton())

    expect(await screen.findByRole('heading', { name: 'Review submitted' })).toBeInTheDocument()
  })
})

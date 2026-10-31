import { fireEvent, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes, useLocation } from 'react-router-dom'
import type { ReviewPeriod } from '../../types/api'
import { mockScreen, renderWithProviders } from '../../test/render'
import { AddReviewPeriodPage } from './AddReviewPeriodPage'
import { ReviewPeriodsPage } from './ReviewPeriodsPage'

const existing: ReviewPeriod[] = [
  { id: 1, name: '2026 H2', start_date: '2026-07-01', end_date: '2026-12-31', status: 'Open' },
]
const created: ReviewPeriod = {
  id: 2,
  name: '2027 H1',
  start_date: '2027-01-01',
  end_date: '2027-06-30',
  status: 'Open',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

/** Shows the router state, so a test can check the confirmation was cleared after it was shown. */
function LocationProbe() {
  const location = useLocation()
  return <output aria-label="router state">{JSON.stringify(location.state)}</output>
}

type PostHandler = (body: Record<string, unknown>) => Response | Promise<Response>

/** Answers the list (GET) and the create (POST) the two screens use. */
function stubApi(onPost: PostHandler = () => json(created, 201)) {
  let saved = false
  const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
    if (init?.method === 'POST') {
      const response = await onPost(JSON.parse(init.body as string))
      saved = response.ok
      return response
    }
    return json(saved ? [...existing, created] : existing)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function renderApp(route = '/review-periods/new') {
  return renderWithProviders(
    <>
      <Routes>
        <Route path="/review-periods" element={<ReviewPeriodsPage />} />
        <Route path="/review-periods/new" element={<AddReviewPeriodPage />} />
      </Routes>
      <LocationProbe />
    </>,
    { route },
  )
}

const nameField = () => screen.getByRole('textbox', { name: /^Name/ })
const startField = () => screen.getByLabelText(/^Start date/) as HTMLInputElement
const endField = () => screen.getByLabelText(/^End date/) as HTMLInputElement
const createButton = () => screen.getByRole('button', { name: /Create Review Period|Creating/ })

async function fillAndSubmit() {
  await userEvent.type(nameField(), '2027 H1')
  fireEvent.change(startField(), { target: { value: '2027-01-01' } })
  fireEvent.change(endField(), { target: { value: '2027-06-30' } })
  await userEvent.click(createButton())
}

const posts = (fetchMock: ReturnType<typeof stubApi>) =>
  fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST')

beforeEach(() => mockScreen(true))
afterEach(() => vi.unstubAllGlobals())

describe('Create Review Period page', () => {
  it('has the page heading and a breadcrumb back to Review Periods', () => {
    stubApi()
    renderApp()

    expect(screen.getByRole('heading', { level: 1, name: 'Create Review Period' })).toBeInTheDocument()
    const crumbs = screen.getByRole('navigation', { name: 'Breadcrumb' })
    expect(within(crumbs).getByRole('link', { name: 'Review Periods' })).toHaveAttribute('href', '/review-periods')
  })

  it('sends one POST with exactly the name and two dates, then shows the list with a confirmation', async () => {
    const fetchMock = stubApi()
    renderApp()

    await fillAndSubmit()

    const [[url, init]] = posts(fetchMock) as [[string, RequestInit]]
    expect(posts(fetchMock)).toHaveLength(1)
    expect(url).toBe('/api/review-periods')
    expect(JSON.parse(init.body as string)).toEqual({
      name: '2027 H1',
      start_date: '2027-01-01',
      end_date: '2027-06-30',
    })

    // Now on the Review Periods screen, which loaded fresh and includes the new period.
    expect(await screen.findByRole('heading', { level: 1, name: 'Review Periods' })).toBeInTheDocument()
    expect(await screen.findByText('Showing 2 of 2 review periods')).toBeInTheDocument()
    expect(screen.getByText('2027 H1 was created.')).toBeInTheDocument()
    expect(within(screen.getByRole('table')).getByText('1 Jan 2027')).toBeInTheDocument()
  })

  it('shows the confirmation once: it is cleared from the history, and can be dismissed', async () => {
    stubApi()
    renderApp()
    await fillAndSubmit()
    await screen.findByText('2027 H1 was created.')

    await vi.waitFor(() => expect(screen.getByLabelText('router state')).toHaveTextContent('null'))

    await userEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByText('2027 H1 was created.')).not.toBeInTheDocument()
  })

  it('does not send anything when the form is invalid', async () => {
    const fetchMock = stubApi()
    renderApp()

    await userEvent.type(nameField(), '2027 H1')
    fireEvent.change(startField(), { target: { value: '2027-07-01' } })
    fireEvent.change(endField(), { target: { value: '2027-06-30' } })
    await userEvent.click(createButton())

    expect(posts(fetchMock)).toHaveLength(0)
    expect(screen.getByText('End date must not be before the start date.')).toBeInTheDocument()
  })

  it('Cancel goes back to the list without saving', async () => {
    const fetchMock = stubApi()
    renderApp()
    await userEvent.type(nameField(), 'Half entered')

    await userEvent.click(screen.getByRole('link', { name: 'Cancel' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Review Periods' })).toBeInTheDocument()
    expect(posts(fetchMock)).toHaveLength(0)
    expect(screen.queryByText(/was created/)).not.toBeInTheDocument()
  })
})

describe('Create Review Period page: problems from the backend', () => {
  it('shows a generic message under a field the backend rejected (422), and focuses it', async () => {
    stubApi(() => json({ detail: [{ loc: ['body', 'name'], msg: 'String should have at least 1 character' }] }, 422))
    renderApp()

    await fillAndSubmit()

    expect(await screen.findByText('This value was not accepted.')).toBeInTheDocument()
    expect(nameField()).toHaveFocus()
    expect(startField()).toHaveValue('2027-01-01')
  })

  it('shows a message in an alert when the backend rejects the request without naming a field', async () => {
    stubApi(() => json({ detail: [{ loc: ['body'], msg: 'Value error, end_date must not be before start_date' }] }, 422))
    renderApp()

    await fillAndSubmit()

    expect(await screen.findByRole('alert')).toHaveTextContent('The details were not accepted. Check the dates and try again.')
    expect(nameField()).toHaveValue('2027 H1')
  })

  it('shows the backend message for a server error, and keeps the form', async () => {
    stubApi(() => json({ detail: 'Database unavailable' }, 500))
    renderApp()

    await fillAndSubmit()

    expect(await screen.findByRole('alert')).toHaveTextContent('Database unavailable')
    expect(endField()).toHaveValue('2027-06-30')
    expect(createButton()).toBeEnabled()
  })

  it('explains when the backend cannot be reached, and lets you try again', async () => {
    let up = false
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === 'POST') {
        if (!up) throw new TypeError('Failed to fetch')
        return json(created, 201)
      }
      return json([...existing, created])
    })
    vi.stubGlobal('fetch', fetchMock)
    renderApp()

    await fillAndSubmit()
    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot reach the server')
    expect(nameField()).toHaveValue('2027 H1')

    up = true
    await userEvent.click(createButton())

    expect(await screen.findByText('2027 H1 was created.')).toBeInTheDocument()
  })

  it('creates one period even if Create Review Period is pressed twice quickly', async () => {
    let finish: () => void = () => {}
    const fetchMock = stubApi(() => new Promise<Response>((resolve) => (finish = () => resolve(json(created, 201)))))
    renderApp()

    await fillAndSubmit()
    await userEvent.type(nameField(), '{Enter}')

    expect(posts(fetchMock)).toHaveLength(1)
    finish()
    expect(await screen.findByText('2027 H1 was created.')).toBeInTheDocument()
  })
})

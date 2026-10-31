import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { App } from './App'
import { mockScreen } from './test/render'

function renderApp(route: string) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <App />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  mockScreen(true)
  // The dashboard loads data; an empty system keeps these routing tests simple.
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } })),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('application routes', () => {
  it.each([
    ['/', 'Dashboard'],
    ['/employees', 'Employees'],
    ['/employees/new', 'Add Employee'],
    ['/review-periods', 'Review Periods'],
    ['/review-periods/new', 'Create Review Period'],
    ['/review-register', 'Review Register'],
    ['/reviews/new', 'Submit Review'],
  ])('%s shows the "%s" page', async (route, title) => {
    renderApp(route)

    expect(await screen.findByRole('heading', { level: 1, name: title })).toBeInTheDocument()
  })

  it('shows a not-found page for unknown addresses, still inside the layout', async () => {
    renderApp('/nothing-here')

    expect(await screen.findByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument()
  })

  it('moves between pages from the sidebar', async () => {
    renderApp('/')
    await userEvent.click(screen.getByRole('link', { name: 'Review Register' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Review Register' })).toBeInTheDocument()
  })

  it('opens the planned screens from the dashboard quick actions', async () => {
    renderApp('/')
    await userEvent.click(await screen.findByRole('link', { name: 'Submit Review' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Submit Review' })).toBeInTheDocument()
  })

  it('explains on the Submit Review page when there is nobody to review and no open period', async () => {
    renderApp('/reviews/new') // the stubbed API returns empty lists

    expect(await screen.findByText('There are no active employees to review')).toBeInTheDocument()
    expect(screen.getByText('There is no open review period')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Go to Employees' })).toHaveAttribute('href', '/employees')
    expect(screen.queryByRole('form', { name: 'Submit review' })).not.toBeInTheDocument()
  })
})

import { fireEvent, render, screen } from '@testing-library/react'
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

  it('previews the three star ratings on the Submit Review page without sending anything', async () => {
    renderApp('/reviews/new')

    for (const criterion of ['Quality of Work', 'Delivery & Ownership', 'Teamwork & Collaboration']) {
      expect(await screen.findByRole('group', { name: criterion })).toBeInTheDocument()
    }
    // 3 criteria x 5 stars (each group also has a hidden "Empty" radio while it has no rating).
    const stars = (screen.getAllByRole('radio') as HTMLInputElement[]).filter((radio) => radio.value !== '')
    expect(stars).toHaveLength(15)

    // fireEvent: see StarRating.test.tsx for why a simulated pointer move cannot be used in jsdom.
    const quality = screen.getByRole('group', { name: 'Quality of Work' })
    fireEvent.click(quality.querySelector('input[value="4"]') as HTMLInputElement)

    expect(quality).toHaveTextContent('4 / 5')
    expect(screen.getByRole('group', { name: 'Delivery & Ownership' })).toHaveTextContent('Not rated')
    // Nothing is submitted, and no average is shown or calculated on this page.
    expect(fetch).not.toHaveBeenCalled()
    expect(screen.queryByText(/average rating:/i)).not.toBeInTheDocument()
  })
})

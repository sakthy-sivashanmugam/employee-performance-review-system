import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { mockScreen, renderWithProviders } from '../test/render'
import { PageHeader } from './PageHeader'
import { AppShell } from './AppShell'

function renderShell(route: string) {
  return renderWithProviders(
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<PageHeader title="Dashboard" />} />
        <Route path="employees" element={<PageHeader title="Employees" />} />
        <Route path="employees/new" element={<PageHeader title="Add Employee" />} />
      </Route>
    </Routes>,
    { route },
  )
}

const NAV_LABELS = ['Dashboard', 'Employees', 'Review Periods', 'Review Register']

describe('AppShell on a wide screen', () => {
  beforeEach(() => mockScreen(true))

  it('shows the header with the application name and the placeholders', () => {
    renderShell('/')

    expect(screen.getByText('Employee Performance Review System')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Notifications (placeholder)' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'User profile (placeholder)' })).toBeInTheDocument()
  })

  it('shows the four navigation links in a sidebar', () => {
    renderShell('/')

    const nav = screen.getByRole('navigation', { name: 'Main navigation' })
    expect(within(nav).getAllByRole('link').map((link) => link.textContent)).toEqual(NAV_LABELS)
    expect(within(nav).getByRole('link', { name: 'Employees' })).toHaveAttribute('href', '/employees')
    expect(within(nav).getByRole('link', { name: 'Review Register' })).toHaveAttribute('href', '/review-register')
  })

  it('marks the current page, not just by colour', () => {
    renderShell('/employees')

    const nav = screen.getByRole('navigation', { name: 'Main navigation' })
    expect(within(nav).getByRole('link', { name: 'Employees' })).toHaveAttribute('aria-current', 'page')
    expect(within(nav).getByRole('link', { name: 'Dashboard' })).not.toHaveAttribute('aria-current')
  })

  it('keeps the parent section highlighted on a sub-page', () => {
    renderShell('/employees/new')

    const nav = screen.getByRole('navigation', { name: 'Main navigation' })
    expect(within(nav).getByRole('link', { name: 'Employees' })).toHaveAttribute('aria-current', 'page')
  })

  it('collapses to icons and expands again, keeping every link reachable by name', async () => {
    renderShell('/')

    await userEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }))
    const nav = screen.getByRole('navigation', { name: 'Main navigation' })
    expect(within(nav).getAllByRole('link')).toHaveLength(4)
    expect(within(nav).getByRole('link', { name: 'Review Periods' })).toBeInTheDocument()
    expect(within(nav).queryByText('Review Periods')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Expand sidebar' }))
    expect(within(nav).getByText('Review Periods')).toBeInTheDocument()
  })

  it('has a skip link to the main content', () => {
    renderShell('/')

    expect(screen.getByRole('link', { name: 'Skip to main content' })).toHaveAttribute('href', '#main-content')
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content')
  })
})

describe('AppShell on a phone or tablet', () => {
  beforeEach(() => mockScreen(false))

  it('hides the navigation until the menu button is pressed', async () => {
    renderShell('/')
    expect(screen.queryByRole('navigation', { name: 'Main navigation' })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Open navigation menu' }))

    const nav = await screen.findByRole('navigation', { name: 'Main navigation' })
    expect(within(nav).getAllByRole('link').map((link) => link.textContent)).toEqual(NAV_LABELS)
  })

  it('closes the drawer after a link is chosen', async () => {
    renderShell('/')
    await userEvent.click(screen.getByRole('button', { name: 'Open navigation menu' }))

    await userEvent.click(within(await screen.findByRole('navigation', { name: 'Main navigation' })).getByRole('link', { name: 'Employees' }))

    expect(await screen.findByRole('heading', { name: 'Employees' })).toBeInTheDocument()
    await vi.waitFor(() => expect(screen.queryByRole('navigation', { name: 'Main navigation' })).not.toBeInTheDocument())
  })

  it('closes the drawer with the Escape key', async () => {
    renderShell('/')
    await userEvent.click(screen.getByRole('button', { name: 'Open navigation menu' }))
    await screen.findByRole('navigation', { name: 'Main navigation' })

    await userEvent.keyboard('{Escape}')

    await vi.waitFor(() => expect(screen.queryByRole('navigation', { name: 'Main navigation' })).not.toBeInTheDocument())
  })
})

describe('PageHeader', () => {
  beforeEach(() => mockScreen(true))

  it('shows a breadcrumb trail on sub-pages and sets the browser tab title', () => {
    renderShell('/employees/new')

    const crumbs = screen.getByRole('navigation', { name: 'Breadcrumb' })
    expect(within(crumbs).getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/')
    expect(within(crumbs).getByRole('link', { name: 'Employees' })).toHaveAttribute('href', '/employees')
    expect(within(crumbs).getByText('Add Employee')).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('heading', { level: 1, name: 'Add Employee' })).toBeInTheDocument()
    expect(document.title).toBe('Add Employee · Employee Performance Review System')
  })

  it('shows no breadcrumb on the dashboard', () => {
    renderShell('/')

    expect(screen.queryByRole('navigation', { name: 'Breadcrumb' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument()
  })
})

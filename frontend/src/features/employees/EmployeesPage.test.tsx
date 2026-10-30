import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Employee } from '../../types/api'
import { mockScreen, renderWithProviders } from '../../test/render'
import { EmployeesPage } from './EmployeesPage'

const employees: Employee[] = [
  { id: 1, employee_code: 'EMP101', name: 'Alex Morgan', department: 'Engineering', email: 'alex.morgan@corp.test', status: 'Active' },
  { id: 2, employee_code: 'EMP102', name: 'Priya Nair', department: 'Engineering', email: 'priya.nair@corp.test', status: 'Active' },
  { id: 3, employee_code: 'EMP103', name: 'Jordan Lee', department: 'Marketing', email: 'jordan.lee@corp.test', status: 'Inactive' },
  { id: 4, employee_code: 'EMP104', name: 'Sam Carter', department: 'Finance', email: 'sam.carter@corp.test', status: 'Active' },
  { id: 5, employee_code: 'EMP105', name: 'Mei Tanaka', department: 'Human Resources', email: 'mei.tanaka@corp.test', status: 'Inactive' },
]

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

function stubEmployees(list: Employee[] = employees) {
  const fetchMock = vi.fn(async () => json(list))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

async function renderLoaded(list: Employee[] = employees) {
  const fetchMock = stubEmployees(list)
  renderWithProviders(<EmployeesPage />, { route: '/employees' })
  await screen.findByText(/Showing \d+ of \d+/)
  return fetchMock
}

/** Names shown in the list, whichever layout is active. */
function shownNames() {
  const table = screen.queryByRole('table', { name: 'Employees' })
  if (table) {
    return within(table)
      .getAllByRole('row')
      .slice(1) // the header row
      .map((row) => within(row).getAllByRole('cell')[0].textContent)
  }
  return within(screen.getByRole('list', { name: 'Employees' }))
    .getAllByRole('listitem')
    .map((item) => within(item).getByRole('heading').textContent)
}

const search = () => screen.getByRole('searchbox', { name: 'Search employees' })
const statusButton = (name: string) => screen.getByRole('button', { name })

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('EmployeesPage on a wide screen (table)', () => {
  beforeEach(() => mockScreen(true))

  it('shows every employee in a table with labelled columns', async () => {
    await renderLoaded()

    const table = screen.getByRole('table', { name: 'Employees' })
    expect(within(table).getAllByRole('columnheader').map((h) => h.textContent)).toEqual([
      'Employee code',
      'Name',
      'Department',
      'Email',
      'Status',
    ])
    const rows = within(table).getAllByRole('row').slice(1)
    expect(rows).toHaveLength(5)
    expect(within(rows[0]).getAllByRole('cell').map((c) => c.textContent)).toEqual([
      'Alex Morgan',
      'Engineering',
      'alex.morgan@corp.test',
      'Active',
    ])
    expect(within(rows[0]).getByRole('rowheader')).toHaveTextContent('EMP101')
    expect(screen.queryByRole('list', { name: 'Employees' })).not.toBeInTheDocument()
  })

  it('shows each status as text with an icon, not only by colour', async () => {
    await renderLoaded()

    const rows = within(screen.getByRole('table')).getAllByRole('row').slice(1)
    expect(within(rows[0]).getByText('Active')).toBeInTheDocument()
    expect(within(rows[2]).getByText('Inactive')).toBeInTheDocument()
  })

  it('shows the count, and offers Add Employee as a link', async () => {
    await renderLoaded()

    expect(screen.getByText('Showing 5 of 5 employees')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Add Employee' })).toHaveAttribute('href', '/employees/new')
    expect(screen.getByRole('heading', { level: 1, name: 'Employees' })).toBeInTheDocument()
  })
})

describe('EmployeesPage on a phone or tablet (cards)', () => {
  beforeEach(() => mockScreen(false))

  it('shows each employee as a card, with no table', async () => {
    await renderLoaded()

    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    const items = within(screen.getByRole('list', { name: 'Employees' })).getAllByRole('listitem')
    expect(items).toHaveLength(5)

    const first = items[0]
    expect(within(first).getByRole('heading', { name: 'Alex Morgan' })).toBeInTheDocument()
    expect(within(first).getByText('EMP101')).toBeInTheDocument()
    expect(within(first).getByText('Engineering')).toBeInTheDocument()
    expect(within(first).getByText('alex.morgan@corp.test')).toBeInTheDocument()
    expect(within(first).getByText('Active')).toBeInTheDocument()
    // Labels are real term/definition pairs for screen readers.
    expect(within(first).getByText('Department').tagName).toBe('DT')
    expect(within(first).getByText('Email').tagName).toBe('DT')
  })

  it('search and filters work the same way in the card layout', async () => {
    await renderLoaded()

    await userEvent.type(search(), 'marketing')

    expect(shownNames()).toEqual(['Jordan Lee'])
  })
})

describe('searching and filtering', () => {
  beforeEach(() => mockScreen(true))

  it('searches name, code, email and department as you type, ignoring case', async () => {
    await renderLoaded()

    await userEvent.type(search(), 'ENGINEERING')
    expect(shownNames()).toEqual(['Alex Morgan', 'Priya Nair'])
    expect(screen.getByText('Showing 2 of 5 employees')).toBeInTheDocument()

    await userEvent.clear(search())
    await userEvent.type(search(), 'emp104')
    expect(shownNames()).toEqual(['Sam Carter'])

    await userEvent.clear(search())
    await userEvent.type(search(), 'tanaka@corp')
    expect(shownNames()).toEqual(['Mei Tanaka'])
  })

  it('needs every typed word to match', async () => {
    await renderLoaded()

    await userEvent.type(search(), 'alex engineering')
    expect(shownNames()).toEqual(['Alex Morgan'])
  })

  it('filters by status', async () => {
    await renderLoaded()

    await userEvent.click(statusButton('Active'))
    expect(shownNames()).toEqual(['Alex Morgan', 'Priya Nair', 'Sam Carter'])
    expect(screen.getByText('Showing 3 of 5 employees')).toBeInTheDocument()

    await userEvent.click(statusButton('Inactive'))
    expect(shownNames()).toEqual(['Jordan Lee', 'Mei Tanaka'])

    await userEvent.click(statusButton('All'))
    expect(shownNames()).toHaveLength(5)
  })

  it('marks the chosen status, and keeps it when the same button is pressed again', async () => {
    await renderLoaded()
    expect(statusButton('All')).toHaveAttribute('aria-pressed', 'true')

    await userEvent.click(statusButton('Active'))
    expect(statusButton('Active')).toHaveAttribute('aria-pressed', 'true')
    expect(statusButton('All')).toHaveAttribute('aria-pressed', 'false')

    await userEvent.click(statusButton('Active'))
    expect(statusButton('Active')).toHaveAttribute('aria-pressed', 'true')
    expect(shownNames()).toEqual(['Alex Morgan', 'Priya Nair', 'Sam Carter'])
  })

  it('combines the search and the status', async () => {
    await renderLoaded()

    await userEvent.type(search(), 'engineering')
    await userEvent.click(statusButton('Inactive'))
    expect(screen.getByText('No employees match your search')).toBeInTheDocument()

    await userEvent.click(statusButton('Active'))
    expect(shownNames()).toEqual(['Alex Morgan', 'Priya Nair'])
  })

  it('explains when nothing matches, and Clear filters brings everyone back', async () => {
    await renderLoaded()
    await userEvent.type(search(), 'zzz')
    await userEvent.click(statusButton('Inactive'))

    expect(screen.getByText('No employees match your search')).toBeInTheDocument()
    expect(screen.getByText('Showing 0 of 5 employees')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }))

    expect(search()).toHaveValue('')
    expect(statusButton('All')).toHaveAttribute('aria-pressed', 'true')
    expect(shownNames()).toHaveLength(5)
  })

  it('filters in the browser: it loads the list once and never writes', async () => {
    const fetchMock = await renderLoaded()

    await userEvent.type(search(), 'alex')
    await userEvent.click(statusButton('Active'))
    await userEvent.click(statusButton('Inactive'))

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, options] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('/api/employees')
    expect(options).not.toHaveProperty('method')
    expect(options).not.toHaveProperty('body')
  })
})

describe('loading, empty and error states', () => {
  beforeEach(() => mockScreen(true))

  it('announces loading and shows placeholders until the data arrives', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
    renderWithProviders(<EmployeesPage />, { route: '/employees' })

    expect(screen.getByRole('status')).toHaveTextContent('Loading employees')
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
  })

  it('invites you to add the first employee when there are none', async () => {
    stubEmployees([])
    renderWithProviders(<EmployeesPage />, { route: '/employees' })

    expect(await screen.findByText('No employees yet')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Add Employee' })).toHaveLength(2) // header and message
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
    expect(screen.queryByText(/Showing/)).not.toBeInTheDocument()
  })

  it('uses the singular for a single employee', async () => {
    await renderLoaded([employees[0]])

    expect(screen.getByText('Showing 1 of 1 employee')).toBeInTheDocument()
  })

  it('shows an error with a Retry button, and recovers when retried', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    renderWithProviders(<EmployeesPage />, { route: '/employees' })

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not be loaded.*Cannot reach the server/i)
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    // No misleading "No employees yet" message when the data simply failed to load.
    expect(screen.queryByText('No employees yet')).not.toBeInTheDocument()

    stubEmployees()
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))

    expect(await screen.findByText('Showing 5 of 5 employees')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows the message from the backend when it reports an error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ detail: 'Database unavailable' }, 500)))
    renderWithProviders(<EmployeesPage />, { route: '/employees' })

    expect(await screen.findByRole('alert')).toHaveTextContent('Database unavailable')
  })
})

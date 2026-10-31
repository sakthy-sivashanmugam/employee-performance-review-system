import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes, useLocation } from 'react-router-dom'
import type { Employee } from '../../types/api'
import { mockScreen, renderWithProviders } from '../../test/render'
import { AddEmployeePage } from './AddEmployeePage'
import { EmployeesPage } from './EmployeesPage'

const existing: Employee[] = [
  { id: 1, employee_code: 'EMP101', name: 'Alex Morgan', department: 'Engineering', email: 'alex@corp.test', status: 'Active' },
]
const created: Employee = {
  id: 2,
  employee_code: 'EMP106',
  name: 'Chris Bell',
  department: 'Finance',
  email: 'chris.bell@corp.test',
  status: 'Active',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

/** Shows the router state, so a test can check the success message was cleared after it was shown. */
function LocationProbe() {
  const location = useLocation()
  return <output aria-label="router state">{JSON.stringify(location.state)}</output>
}

type PostHandler = (body: Record<string, unknown>) => Response | Promise<Response> | never

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

function renderApp(route = '/employees/new') {
  return renderWithProviders(
    <>
      <Routes>
        <Route path="/employees" element={<EmployeesPage />} />
        <Route path="/employees/new" element={<AddEmployeePage />} />
      </Routes>
      <LocationProbe />
    </>,
    { route },
  )
}

const code = () => screen.getByRole('textbox', { name: /^Employee code/ })
const name = () => screen.getByRole('textbox', { name: /^Name/ })
const department = () => screen.getByRole('textbox', { name: /^Department/ })
const email = () => screen.getByRole('textbox', { name: /^Email/ })
const addButton = () => screen.getByRole('button', { name: /Add Employee|Adding/ })

async function fillAndSubmit() {
  await userEvent.type(code(), 'EMP106')
  await userEvent.type(name(), 'Chris Bell')
  await userEvent.type(department(), 'Finance')
  await userEvent.type(email(), 'chris.bell@corp.test')
  await userEvent.click(addButton())
}

const posts = (fetchMock: ReturnType<typeof stubApi>) =>
  fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST')

beforeEach(() => mockScreen(true))
afterEach(() => vi.unstubAllGlobals())

describe('Add Employee page', () => {
  it('has the page heading and breadcrumb back to Employees', () => {
    stubApi()
    renderApp()

    expect(screen.getByRole('heading', { level: 1, name: 'Add Employee' })).toBeInTheDocument()
    const crumbs = screen.getByRole('navigation', { name: 'Breadcrumb' })
    expect(within(crumbs).getByRole('link', { name: 'Employees' })).toHaveAttribute('href', '/employees')
  })

  it('sends one POST with exactly the four fields, then shows the list with a confirmation', async () => {
    const fetchMock = stubApi()
    renderApp()

    await fillAndSubmit()

    const [[url, init]] = posts(fetchMock) as [[string, RequestInit]]
    expect(posts(fetchMock)).toHaveLength(1)
    expect(url).toBe('/api/employees')
    expect(JSON.parse(init.body as string)).toEqual({
      employee_code: 'EMP106',
      name: 'Chris Bell',
      department: 'Finance',
      email: 'chris.bell@corp.test',
    })

    // Now on the Employees screen, which loaded fresh and includes the new employee.
    expect(await screen.findByRole('heading', { level: 1, name: 'Employees' })).toBeInTheDocument()
    expect(await screen.findByText('Showing 2 of 2 employees')).toBeInTheDocument()
    expect(screen.getByText('Chris Bell (EMP106) was added.')).toBeInTheDocument()
    expect(within(screen.getByRole('table')).getByText('Chris Bell')).toBeInTheDocument()
  })

  it('shows the confirmation once: it is cleared from the history, and can be dismissed', async () => {
    stubApi()
    renderApp()
    await fillAndSubmit()
    await screen.findByText('Chris Bell (EMP106) was added.')

    await vi.waitFor(() => expect(screen.getByLabelText('router state')).toHaveTextContent('null'))

    await userEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByText('Chris Bell (EMP106) was added.')).not.toBeInTheDocument()
  })

  it('does not send anything when the form is invalid', async () => {
    const fetchMock = stubApi()
    renderApp()

    await userEvent.type(code(), 'emp106')
    await userEvent.click(addButton())

    expect(posts(fetchMock)).toHaveLength(0)
    expect(screen.getByText('Use EMP followed by digits, for example EMP106.')).toBeInTheDocument()
  })

  it('Cancel goes back to the list without saving', async () => {
    const fetchMock = stubApi()
    renderApp()
    await userEvent.type(name(), 'Half typed')

    await userEvent.click(screen.getByRole('link', { name: 'Cancel' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Employees' })).toBeInTheDocument()
    expect(posts(fetchMock)).toHaveLength(0)
    expect(screen.queryByText(/was added/)).not.toBeInTheDocument()
  })
})

describe('Add Employee page: problems from the backend', () => {
  it('shows a duplicate employee code under that field, keeps the form, and focuses the field', async () => {
    stubApi(() => json({ detail: "employee_code 'EMP106' already exists" }, 409))
    renderApp()

    await fillAndSubmit()

    expect(await screen.findByText('That employee code is already in use.')).toBeInTheDocument()
    expect(code()).toHaveFocus()
    expect(code()).toHaveAttribute('aria-invalid', 'true')
    expect(name()).toHaveValue('Chris Bell')
    expect(screen.getByRole('heading', { level: 1, name: 'Add Employee' })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows a duplicate email under the email field', async () => {
    stubApi(() => json({ detail: "email 'chris.bell@corp.test' already exists" }, 409))
    renderApp()

    await fillAndSubmit()

    expect(await screen.findByText('That email is already in use.')).toBeInTheDocument()
    expect(email()).toHaveFocus()
  })

  it('lets you correct a duplicate code and save again', async () => {
    let attempts = 0
    stubApi(() =>
      ++attempts === 1 ? json({ detail: "employee_code 'EMP106' already exists" }, 409) : json(created, 201),
    )
    renderApp()
    await fillAndSubmit()
    await screen.findByText('That employee code is already in use.')

    await userEvent.type(code(), '7')
    expect(screen.queryByText('That employee code is already in use.')).not.toBeInTheDocument()
    await userEvent.click(addButton())

    expect(await screen.findByRole('heading', { level: 1, name: 'Employees' })).toBeInTheDocument()
    expect(attempts).toBe(2)
  })

  it('shows a conflict the backend could not pin on a field as a general message', async () => {
    stubApi(() => json({ detail: 'employee_code or email already exists' }, 409))
    renderApp()

    await fillAndSubmit()

    expect(await screen.findByRole('alert')).toHaveTextContent('That employee code or email is already in use.')
  })

  it('shows a generic message under a field the backend rejected as invalid (422)', async () => {
    stubApi(() => json({ detail: [{ loc: ['body', 'name'], msg: 'String should have at least 1 character' }] }, 422))
    renderApp()

    await fillAndSubmit()

    expect(await screen.findByText('This value was not accepted.')).toBeInTheDocument()
    expect(name()).toHaveFocus()
  })

  it('shows the backend message for a server error, and keeps the form', async () => {
    stubApi(() => json({ detail: 'Database unavailable' }, 500))
    renderApp()

    await fillAndSubmit()

    expect(await screen.findByRole('alert')).toHaveTextContent('Database unavailable')
    expect(code()).toHaveValue('EMP106')
    expect(addButton()).toBeEnabled()
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
    expect(name()).toHaveValue('Chris Bell')

    up = true
    await userEvent.click(addButton())

    expect(await screen.findByText('Chris Bell (EMP106) was added.')).toBeInTheDocument()
  })

  it('creates one employee even if Add Employee is pressed twice quickly', async () => {
    let finish: () => void = () => {}
    const fetchMock = stubApi(
      () => new Promise<Response>((resolve) => (finish = () => resolve(json(created, 201)))),
    )
    renderApp()

    await userEvent.type(code(), 'EMP106')
    await userEvent.type(name(), 'Chris Bell')
    await userEvent.type(department(), 'Finance')
    await userEvent.type(email(), 'chris.bell@corp.test')
    await userEvent.click(addButton())
    await userEvent.type(email(), '{Enter}')

    expect(posts(fetchMock)).toHaveLength(1)
    finish()
    expect(await screen.findByText('Chris Bell (EMP106) was added.')).toBeInTheDocument()
  })
})

import { fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../test/render'
import { EmployeeForm, type SubmitResult } from './EmployeeForm'

const code = () => screen.getByRole('textbox', { name: /^Employee code/ })
const name = () => screen.getByRole('textbox', { name: /^Name/ })
const department = () => screen.getByRole('textbox', { name: /^Department/ })
const email = () => screen.getByRole('textbox', { name: /^Email/ })
const addButton = () => screen.getByRole('button', { name: /Add Employee|Adding/ })

function renderForm(onSubmit: (data: unknown) => Promise<SubmitResult> = async () => undefined) {
  const submit = vi.fn(onSubmit)
  renderWithProviders(<EmployeeForm onSubmit={submit} />, { route: '/employees/new' })
  return submit
}

async function fillValid(user = userEvent) {
  await user.type(code(), 'EMP106')
  await user.type(name(), 'Chris Bell')
  await user.type(department(), 'Finance')
  await user.type(email(), 'chris.bell@corp.test')
}

describe('EmployeeForm: layout and accessibility', () => {
  it('has four labelled, required fields and no status field', () => {
    renderForm()

    for (const field of [code(), name(), department(), email()]) expect(field).toBeRequired()
    expect(screen.getAllByRole('textbox')).toHaveLength(4)
    expect(screen.queryByLabelText(/status/i)).not.toBeInTheDocument()
    expect(screen.getByText('New employees start as Active.')).toBeInTheDocument()
    expect(screen.getByRole('form', { name: 'Add employee' })).toBeInTheDocument()
  })

  it('shows an example for the code, and an email keyboard on phones', () => {
    renderForm()

    expect(screen.getByText('EMP followed by digits, for example EMP106.')).toBeInTheDocument()
    expect(email()).toHaveAttribute('inputmode', 'email')
  })

  it('offers Cancel as a link back to the list', () => {
    renderForm()

    expect(screen.getByRole('link', { name: 'Cancel' })).toHaveAttribute('href', '/employees')
  })

  it('can be completed with the keyboard alone, in reading order', async () => {
    renderForm()

    await userEvent.tab()
    expect(code()).toHaveFocus()
    await userEvent.tab()
    expect(name()).toHaveFocus()
    await userEvent.tab()
    expect(department()).toHaveFocus()
    await userEvent.tab()
    expect(email()).toHaveFocus()
    await userEvent.tab()
    expect(screen.getByRole('link', { name: 'Cancel' })).toHaveFocus()
    await userEvent.tab()
    expect(addButton()).toHaveFocus()
  })
})

describe('EmployeeForm: validation messages', () => {
  it('shows no errors before anything has been touched', () => {
    renderForm()

    expect(screen.queryByText(/is required/)).not.toBeInTheDocument()
    for (const field of [code(), name(), department(), email()]) expect(field).toHaveAttribute('aria-invalid', 'false')
  })

  it('shows a problem when you leave a field, linked to the field for screen readers', async () => {
    renderForm()

    await userEvent.type(code(), 'emp1')
    await userEvent.tab()

    const message = screen.getByText('Use EMP followed by digits, for example EMP106.')
    expect(code()).toHaveAttribute('aria-invalid', 'true')
    expect(code().getAttribute('aria-describedby')).toContain(message.id)
    // The other fields have not been visited yet, so they stay quiet.
    expect(screen.queryByText('Name is required.')).not.toBeInTheDocument()
  })

  it('removes the message as soon as the value is fixed', async () => {
    renderForm()
    await userEvent.type(code(), 'emp1')
    await userEvent.tab()
    expect(code()).toHaveAttribute('aria-invalid', 'true')

    await userEvent.clear(code())
    await userEvent.type(code(), 'EMP1')

    expect(code()).toHaveAttribute('aria-invalid', 'false')
    expect(screen.queryByText(/Use EMP followed/)).not.toBeInTheDocument()
  })

  it('does not require an email format', async () => {
    const submit = renderForm()
    await fillValid()
    await userEvent.clear(email())
    await userEvent.type(email(), 'not-an-email')

    await userEvent.click(addButton())

    expect(submit).toHaveBeenCalledWith(expect.objectContaining({ email: 'not-an-email' }))
  })
})

describe('EmployeeForm: submitting', () => {
  it('shows every problem and puts the cursor on the first field when the form is empty', async () => {
    const submit = renderForm()

    await userEvent.click(addButton())

    expect(screen.getByText('Employee code is required.')).toBeInTheDocument()
    expect(screen.getByText('Name is required.')).toBeInTheDocument()
    expect(screen.getByText('Department is required.')).toBeInTheDocument()
    expect(screen.getByText('Email is required.')).toBeInTheDocument()
    expect(code()).toHaveFocus()
    expect(submit).not.toHaveBeenCalled()
  })

  it('moves the cursor to the first field that is wrong, not always the first field', async () => {
    const submit = renderForm()
    await userEvent.type(code(), 'EMP106')
    await userEvent.type(department(), 'Finance')
    await userEvent.type(email(), 'a@b.c')

    await userEvent.click(addButton())

    expect(name()).toHaveFocus()
    expect(screen.getByText('Name is required.')).toBeInTheDocument()
    expect(submit).not.toHaveBeenCalled()
  })

  it('sends the four trimmed fields, and nothing else, when the form is valid', async () => {
    const submit = renderForm()
    await userEvent.type(code(), '  EMP106 ')
    await userEvent.type(name(), ' Chris Bell ')
    await userEvent.type(department(), ' Finance')
    await userEvent.type(email(), 'Chris.Bell@Corp.test ')

    await userEvent.click(addButton())

    expect(submit).toHaveBeenCalledTimes(1)
    expect(submit).toHaveBeenCalledWith({
      employee_code: 'EMP106',
      name: 'Chris Bell',
      department: 'Finance',
      email: 'Chris.Bell@Corp.test',
    })
  })

  it('submits with the Enter key from a field', async () => {
    const submit = renderForm()
    await fillValid()

    await userEvent.type(email(), '{Enter}')

    expect(submit).toHaveBeenCalledTimes(1)
  })

  it('blocks a second submit while the first is still saving', async () => {
    let finish: (value: SubmitResult) => void = () => {}
    const submit = renderForm(() => new Promise<SubmitResult>((resolve) => (finish = resolve)))
    await fillValid()

    await userEvent.click(addButton())

    const busy = screen.getByRole('button', { name: 'Adding…' })
    expect(busy).toBeDisabled()
    expect(busy).toHaveAttribute('aria-busy', 'true')
    await userEvent.type(email(), '{Enter}') // Enter in a field also tries to submit
    fireEvent.click(busy) // user-event refuses to click a disabled button; force the click through
    fireEvent.submit(screen.getByRole('form', { name: 'Add employee' })) // and a direct form submit
    expect(submit).toHaveBeenCalledTimes(1)

    finish(undefined)
    expect(await screen.findByRole('button', { name: 'Add Employee' })).toBeEnabled()
  })
})

describe('EmployeeForm: problems reported by the backend', () => {
  it('shows a field message from the backend, keeps the input, and focuses that field', async () => {
    renderForm(async () => ({ fieldErrors: { employee_code: 'That employee code is already in use.' } }))
    await fillValid()

    await userEvent.click(addButton())

    expect(await screen.findByText('That employee code is already in use.')).toBeInTheDocument()
    expect(code()).toHaveAttribute('aria-invalid', 'true')
    expect(code()).toHaveFocus()
    expect(code()).toHaveValue('EMP106')
    expect(name()).toHaveValue('Chris Bell')
    expect(addButton()).toBeEnabled()
  })

  it('removes a backend message when that field is edited, but keeps messages on other fields', async () => {
    renderForm(async () => ({
      fieldErrors: { employee_code: 'code taken', email: 'email taken' },
    }))
    await fillValid()
    await userEvent.click(addButton())
    await screen.findByText('code taken')

    await userEvent.type(code(), '7')

    expect(screen.queryByText('code taken')).not.toBeInTheDocument()
    expect(screen.getByText('email taken')).toBeInTheDocument()
  })

  it('shows a general problem in an alert and keeps everything typed', async () => {
    renderForm(async () => ({ formError: 'Cannot reach the server. Check that the backend is running.' }))
    await fillValid()

    await userEvent.click(addButton())

    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot reach the server')
    expect(email()).toHaveValue('chris.bell@corp.test')
    expect(addButton()).toBeEnabled()
  })

  it('clears an old alert when you try again', async () => {
    const submit = renderForm()
    submit.mockResolvedValueOnce({ formError: 'First attempt failed.' })
    await fillValid()
    await userEvent.click(addButton())
    expect(await screen.findByRole('alert')).toHaveTextContent('First attempt failed.')

    await userEvent.click(addButton())

    await vi.waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
    expect(submit).toHaveBeenCalledTimes(2)
  })

  it('copes with an unexpected failure', async () => {
    renderForm(async () => {
      throw new Error('boom')
    })
    await fillValid()

    await userEvent.click(addButton())

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong. Please try again.')
    expect(addButton()).toBeEnabled()
  })
})

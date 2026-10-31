import { fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../test/render'
import { ReviewPeriodForm, type SubmitResult } from './ReviewPeriodForm'

const nameField = () => screen.getByRole('textbox', { name: /^Name/ })
const startField = () => screen.getByLabelText(/^Start date/) as HTMLInputElement
const endField = () => screen.getByLabelText(/^End date/) as HTMLInputElement
const createButton = () => screen.getByRole('button', { name: /Create Review Period|Creating/ })

function renderForm(onSubmit: (data: unknown) => Promise<SubmitResult> = async () => undefined) {
  const submit = vi.fn(onSubmit)
  renderWithProviders(<ReviewPeriodForm onSubmit={submit} />, { route: '/review-periods/new' })
  return submit
}

/** A date input gives the whole value at once (YYYY-MM-DD), so the tests set it in one step. */
function setDate(input: HTMLInputElement, value: string) {
  fireEvent.change(input, { target: { value } })
}

async function fillValid() {
  await userEvent.type(nameField(), '2027 H1')
  setDate(startField(), '2027-01-01')
  setDate(endField(), '2027-06-30')
}

describe('ReviewPeriodForm: layout and accessibility', () => {
  it('has a name field and two date fields, all required, and no status field', () => {
    renderForm()

    for (const field of [nameField(), startField(), endField()]) expect(field).toBeRequired()
    expect(startField()).toHaveAttribute('type', 'date')
    expect(endField()).toHaveAttribute('type', 'date')
    expect(screen.queryByLabelText(/status/i)).not.toBeInTheDocument()
    expect(screen.getByText('New review periods start as Open.')).toBeInTheDocument()
    expect(screen.getByRole('form', { name: 'Create review period' })).toBeInTheDocument()
  })

  it('offers Cancel as a link back to the list', () => {
    renderForm()

    expect(screen.getByRole('link', { name: 'Cancel' })).toHaveAttribute('href', '/review-periods')
  })

  it('can be completed with the keyboard alone, in reading order', async () => {
    renderForm()

    await userEvent.tab()
    expect(nameField()).toHaveFocus()
    await userEvent.tab()
    expect(startField()).toHaveFocus()
    await userEvent.tab()
    expect(endField()).toHaveFocus()
    await userEvent.tab()
    expect(screen.getByRole('link', { name: 'Cancel' })).toHaveFocus()
    await userEvent.tab()
    expect(createButton()).toHaveFocus()
  })

  it('limits the end date picker to days on or after the start date', () => {
    renderForm()
    expect(endField()).not.toHaveAttribute('min')

    setDate(startField(), '2027-03-15')

    expect(endField()).toHaveAttribute('min', '2027-03-15')
  })
})

describe('ReviewPeriodForm: validation messages', () => {
  it('shows no errors before anything has been touched', () => {
    renderForm()

    expect(screen.queryByText(/is required/)).not.toBeInTheDocument()
    for (const field of [nameField(), startField(), endField()]) expect(field).toHaveAttribute('aria-invalid', 'false')
  })

  it('shows a problem when you leave a field, linked to the field for screen readers', async () => {
    renderForm()

    await userEvent.click(nameField())
    await userEvent.tab()

    const message = screen.getByText('Name is required.')
    expect(nameField()).toHaveAttribute('aria-invalid', 'true')
    expect(nameField().getAttribute('aria-describedby')).toContain(message.id)
    expect(screen.queryByText('Start date is required.')).not.toBeInTheDocument()
  })

  it('removes the message as soon as the value is fixed', async () => {
    renderForm()
    await userEvent.click(nameField())
    await userEvent.tab()

    await userEvent.type(nameField(), 'X')

    expect(nameField()).toHaveAttribute('aria-invalid', 'false')
    expect(screen.queryByText('Name is required.')).not.toBeInTheDocument()
  })

  it('says when the end date is before the start date, and clears it when corrected', async () => {
    renderForm()
    setDate(startField(), '2027-07-01')
    setDate(endField(), '2027-06-30')
    fireEvent.blur(endField())

    expect(screen.getByText('End date must not be before the start date.')).toBeInTheDocument()
    expect(endField()).toHaveAttribute('aria-invalid', 'true')

    setDate(endField(), '2027-07-01') // the same day is allowed
    expect(screen.queryByText('End date must not be before the start date.')).not.toBeInTheDocument()
  })

  it('shows the order problem if the start date is moved past an end date you already entered', async () => {
    renderForm()
    setDate(startField(), '2027-01-01')
    setDate(endField(), '2027-03-31')
    fireEvent.blur(endField())
    expect(endField()).toHaveAttribute('aria-invalid', 'false')

    setDate(startField(), '2027-04-15')

    expect(screen.getByText('End date must not be before the start date.')).toBeInTheDocument()
  })

  it('treats an impossible date as missing, because a date input discards it', () => {
    renderForm()

    // The browser's date input only ever holds a real YYYY-MM-DD date or nothing: a value such as
    // 2027-02-30 is thrown away and the input reports an empty value. (The rules file also guards
    // against impossible dates; see reviewPeriodFormRules.test.ts.)
    setDate(startField(), '2027-02-30')
    fireEvent.blur(startField())

    expect(startField()).toHaveValue('')
    expect(screen.getByText('Start date is required.')).toBeInTheDocument()
  })
})

describe('ReviewPeriodForm: submitting', () => {
  it('shows every problem and puts the cursor on the name when the form is empty', async () => {
    const submit = renderForm()

    await userEvent.click(createButton())

    expect(screen.getByText('Name is required.')).toBeInTheDocument()
    expect(screen.getByText('Start date is required.')).toBeInTheDocument()
    expect(screen.getByText('End date is required.')).toBeInTheDocument()
    expect(nameField()).toHaveFocus()
    expect(submit).not.toHaveBeenCalled()
  })

  it('moves the cursor to the first field that is wrong', async () => {
    const submit = renderForm()
    await userEvent.type(nameField(), '2027 H1')
    setDate(startField(), '2027-01-01')

    await userEvent.click(createButton())

    expect(endField()).toHaveFocus()
    expect(screen.getByText('End date is required.')).toBeInTheDocument()
    expect(submit).not.toHaveBeenCalled()
  })

  it('does not send when the end date is before the start date', async () => {
    const submit = renderForm()
    await userEvent.type(nameField(), '2027 H1')
    setDate(startField(), '2027-07-01')
    setDate(endField(), '2027-06-30')

    await userEvent.click(createButton())

    expect(submit).not.toHaveBeenCalled()
    expect(endField()).toHaveFocus()
  })

  it('sends the trimmed name and both dates, and nothing else, when the form is valid', async () => {
    const submit = renderForm()
    await userEvent.type(nameField(), '  2027 H1 ')
    setDate(startField(), '2027-01-01')
    setDate(endField(), '2027-06-30')

    await userEvent.click(createButton())

    expect(submit).toHaveBeenCalledTimes(1)
    expect(submit).toHaveBeenCalledWith({ name: '2027 H1', start_date: '2027-01-01', end_date: '2027-06-30' })
  })

  it('accepts a one-day period', async () => {
    const submit = renderForm()
    await userEvent.type(nameField(), 'Away day')
    setDate(startField(), '2027-03-01')
    setDate(endField(), '2027-03-01')

    await userEvent.click(createButton())

    expect(submit).toHaveBeenCalledTimes(1)
  })

  it('submits with the Enter key from the name field', async () => {
    const submit = renderForm()
    await fillValid()

    await userEvent.type(nameField(), '{Enter}')

    expect(submit).toHaveBeenCalledTimes(1)
  })

  it('blocks a second submit while the first is still saving', async () => {
    let finish: (value: SubmitResult) => void = () => {}
    const submit = renderForm(() => new Promise<SubmitResult>((resolve) => (finish = resolve)))
    await fillValid()

    await userEvent.click(createButton())

    const busy = screen.getByRole('button', { name: 'Creating…' })
    expect(busy).toBeDisabled()
    expect(busy).toHaveAttribute('aria-busy', 'true')
    await userEvent.type(nameField(), '{Enter}')
    fireEvent.click(busy)
    fireEvent.submit(screen.getByRole('form', { name: 'Create review period' }))
    expect(submit).toHaveBeenCalledTimes(1)

    finish(undefined)
    expect(await screen.findByRole('button', { name: 'Create Review Period' })).toBeEnabled()
  })
})

describe('ReviewPeriodForm: problems reported by the backend', () => {
  it('shows a field message from the backend, keeps the input, and focuses that field', async () => {
    renderForm(async () => ({ fieldErrors: { start_date: 'This value was not accepted.' } }))
    await fillValid()

    await userEvent.click(createButton())

    expect(await screen.findByText('This value was not accepted.')).toBeInTheDocument()
    expect(startField()).toHaveAttribute('aria-invalid', 'true')
    expect(startField()).toHaveFocus()
    expect(startField()).toHaveValue('2027-01-01')
    expect(nameField()).toHaveValue('2027 H1')
    expect(createButton()).toBeEnabled()
  })

  it('removes a backend message when that field is edited, but keeps messages on other fields', async () => {
    renderForm(async () => ({ fieldErrors: { name: 'name rejected', end_date: 'end rejected' } }))
    await fillValid()
    await userEvent.click(createButton())
    await screen.findByText('name rejected')

    await userEvent.type(nameField(), '!')

    expect(screen.queryByText('name rejected')).not.toBeInTheDocument()
    expect(screen.getByText('end rejected')).toBeInTheDocument()
  })

  it('shows a general problem in an alert and keeps everything entered', async () => {
    renderForm(async () => ({ formError: 'Cannot reach the server. Check that the backend is running.' }))
    await fillValid()

    await userEvent.click(createButton())

    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot reach the server')
    expect(endField()).toHaveValue('2027-06-30')
    expect(createButton()).toBeEnabled()
  })

  it('copes with an unexpected failure', async () => {
    renderForm(async () => {
      throw new Error('boom')
    })
    await fillValid()

    await userEvent.click(createButton())

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong. Please try again.')
    expect(createButton()).toBeEnabled()
  })
})

import { fireEvent, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Employee, ReviewPeriod } from '../../types/api'
import { renderWithProviders } from '../../test/render'
import { SubmitReviewForm, type SubmitResult } from './SubmitReviewForm'

const employees: Employee[] = [
  { id: 3, employee_code: 'EMP103', name: 'Sam Carter', department: 'Finance', email: 's@corp.test', status: 'Active' },
  { id: 1, employee_code: 'EMP101', name: 'Alex Morgan', department: 'Engineering', email: 'a@corp.test', status: 'Active' },
  { id: 2, employee_code: 'EMP102', name: 'Priya Nair', department: 'Engineering', email: 'p@corp.test', status: 'Active' },
]
const periods: ReviewPeriod[] = [
  { id: 1, name: '2026 H2', start_date: '2026-07-01', end_date: '2026-12-31', status: 'Open' },
  { id: 2, name: '2027 H1', start_date: '2027-01-01', end_date: '2027-06-30', status: 'Open' },
]

const employeeBox = () => screen.getByRole('combobox', { name: /^Employee/ })
const periodSelect = () => screen.getByRole('combobox', { name: /^Review period/ }) as HTMLSelectElement
const ratingGroup = (label: string) => screen.getByRole('group', { name: new RegExp(`^${label}`) })
const comments = () => screen.getByRole('textbox', { name: /^Comments/ })
/** The employee choices shown in the open list (not the review period select's own options). */
const employeeOptions = async () =>
  within(await screen.findByRole('listbox')).getAllByRole('option').map((option) => option.textContent)
const submitButton = () => screen.getByRole('button', { name: /Submit Review|Submitting/ })

function renderForm(
  onSubmit: (data: unknown) => Promise<SubmitResult> = async () => undefined,
  props: { employees?: Employee[]; periods?: ReviewPeriod[] } = {},
) {
  const submit = vi.fn(onSubmit)
  renderWithProviders(
    <SubmitReviewForm employees={props.employees ?? employees} periods={props.periods ?? periods} onSubmit={submit} />,
    { route: '/reviews/new' },
  )
  return submit
}

async function chooseEmployee(name: RegExp | string = /Alex Morgan/) {
  await userEvent.click(employeeBox())
  await userEvent.click(await screen.findByRole('option', { name }))
}

async function choosePeriod(id = '1') {
  await userEvent.selectOptions(periodSelect(), id)
}

/** Stars are chosen with fireEvent; see StarRating.test.tsx for why a simulated pointer move cannot be used in jsdom. */
function rate(label: string, stars: number) {
  fireEvent.click(ratingGroup(label).querySelector(`input[value="${stars}"]`) as HTMLInputElement)
}

async function fillValid(commentText = 'Strong quarter.') {
  await chooseEmployee()
  await choosePeriod('1')
  rate('Quality of Work', 4)
  rate('Delivery & Ownership', 5)
  rate('Teamwork & Collaboration', 3)
  await userEvent.type(comments(), commentText)
}

describe('SubmitReviewForm: layout and accessibility', () => {
  it('has an employee, a period, three star ratings and comments, all required, and no average', () => {
    renderForm()

    expect(employeeBox()).toBeRequired()
    expect(periodSelect()).toBeRequired()
    expect(comments()).toBeRequired()
    for (const label of ['Quality of Work', 'Delivery & Ownership', 'Teamwork & Collaboration']) {
      expect(ratingGroup(label)).toBeInTheDocument()
      expect(within(ratingGroup(label)).getByText('Not rated')).toBeInTheDocument()
    }
    expect(screen.getByRole('form', { name: 'Submit review' })).toBeInTheDocument()
    expect(screen.queryByLabelText(/average/i)).not.toBeInTheDocument()
    expect(screen.getByText('The average rating is calculated automatically from the three ratings.')).toBeInTheDocument()
  })

  it('shows hints about who and which periods are offered', () => {
    renderForm()

    expect(screen.getByText('Only active employees can be reviewed. Type to search.')).toBeInTheDocument()
    expect(screen.getByText('Only open review periods are listed.')).toBeInTheDocument()
  })

  it('offers Cancel as a link back to the dashboard', () => {
    renderForm()

    expect(screen.getByRole('link', { name: 'Cancel' })).toHaveAttribute('href', '/')
  })

  it('lists employees A to Z, with their department', async () => {
    renderForm()
    await userEvent.click(employeeBox())

    expect(await employeeOptions()).toEqual([
      'Alex Morgan (EMP101)Engineering',
      'Priya Nair (EMP102)Engineering',
      'Sam Carter (EMP103)Finance',
    ])
  })

  it('lists periods newest first, with their dates', () => {
    renderForm()

    const options = within(periodSelect()).getAllByRole('option').map((o) => o.textContent)
    expect(options).toEqual(['Choose a review period', '2027 H1 (1 Jan 2027 – 30 June 2027)', '2026 H2 (1 July 2026 – 31 Dec 2026)'])
  })

  it('can be completed with the keyboard, in reading order', async () => {
    renderForm()

    await userEvent.tab()
    expect(employeeBox()).toHaveFocus()
    await userEvent.tab()
    // Tabbing from the employee box may pass through its clear/open buttons; the next field is the period.
    for (let presses = 0; presses < 4 && document.activeElement !== periodSelect(); presses++) await userEvent.tab()
    expect(periodSelect()).toHaveFocus()
    await userEvent.tab()
    expect(within(ratingGroup('Quality of Work')).getAllByRole('radio').includes(document.activeElement as HTMLInputElement)).toBe(true)
  })
})

describe('SubmitReviewForm: choosing an employee and a period', () => {
  it('finds an employee by name, code, department, or several words', async () => {
    renderForm()
    await userEvent.click(employeeBox())

    await userEvent.type(employeeBox(), 'nair')
    expect(await employeeOptions()).toEqual(['Priya Nair (EMP102)Engineering'])

    await userEvent.clear(employeeBox())
    await userEvent.type(employeeBox(), 'emp103')
    expect(await employeeOptions()).toEqual(['Sam Carter (EMP103)Finance'])

    await userEvent.clear(employeeBox())
    await userEvent.type(employeeBox(), 'engineering alex')
    expect(await employeeOptions()).toEqual(['Alex Morgan (EMP101)Engineering'])
  })

  it('says when nobody matches', async () => {
    renderForm()

    await userEvent.type(employeeBox(), 'zzz')

    expect(await screen.findByText('No matching employees')).toBeInTheDocument()
  })

  it('chooses an employee with the keyboard', async () => {
    renderForm()

    await userEvent.type(employeeBox(), 'sam{Enter}')

    expect(employeeBox()).toHaveValue('Sam Carter (EMP103)')
  })

  it('still lists everyone when you open the list again after choosing', async () => {
    renderForm()
    await chooseEmployee(/Alex Morgan/)

    await userEvent.click(screen.getByRole('button', { name: 'Open' }))

    expect(await employeeOptions()).toHaveLength(3)
  })

  it('has no period chosen when there are several', () => {
    renderForm()

    expect(periodSelect()).toHaveValue('')
  })

  it('has the period chosen already when there is only one', () => {
    renderForm(async () => undefined, { periods: [periods[1]] })

    expect(periodSelect()).toHaveValue('2')
  })
})

describe('SubmitReviewForm: validation messages', () => {
  it('shows no errors before anything has been touched', () => {
    renderForm()

    for (const message of ['Choose an employee.', 'Choose a review period.', 'Comments are required.']) {
      expect(screen.queryByText(message)).not.toBeInTheDocument()
    }
    expect(screen.queryByText(/^Choose a rating for/)).not.toBeInTheDocument()
  })

  it('shows a problem when you leave the employee, period or comments empty', async () => {
    renderForm()

    await userEvent.click(employeeBox())
    await userEvent.tab()
    expect(await screen.findByText('Choose an employee.')).toBeInTheDocument()

    await userEvent.click(periodSelect())
    await userEvent.tab()
    expect(await screen.findByText('Choose a review period.')).toBeInTheDocument()

    await userEvent.click(comments())
    await userEvent.tab()
    expect(await screen.findByText('Comments are required.')).toBeInTheDocument()
    expect(comments()).toHaveAttribute('aria-invalid', 'true')
  })

  it('removes a message as soon as the value is fixed', async () => {
    renderForm()
    await userEvent.click(comments())
    await userEvent.tab()
    expect(screen.getByText('Comments are required.')).toBeInTheDocument()

    await userEvent.type(comments(), 'ok')

    expect(screen.queryByText('Comments are required.')).not.toBeInTheDocument()
  })

  it('does not accept comments that are only spaces', async () => {
    const submit = renderForm()
    await fillValid('   ')

    await userEvent.click(submitButton())

    expect(screen.getByText('Comments are required.')).toBeInTheDocument()
    expect(comments()).toHaveFocus()
    expect(submit).not.toHaveBeenCalled()
  })
})

describe('SubmitReviewForm: submitting', () => {
  it('shows every problem and puts the cursor on the employee when the form is empty', async () => {
    const submit = renderForm()

    await userEvent.click(submitButton())

    expect(screen.getByText('Choose an employee.')).toBeInTheDocument()
    expect(screen.getByText('Choose a review period.')).toBeInTheDocument()
    expect(screen.getByText('Choose a rating for Quality of Work.')).toBeInTheDocument()
    expect(screen.getByText('Choose a rating for Delivery & Ownership.')).toBeInTheDocument()
    expect(screen.getByText('Choose a rating for Teamwork & Collaboration.')).toBeInTheDocument()
    expect(screen.getByText('Comments are required.')).toBeInTheDocument()
    expect(employeeBox()).toHaveFocus()
    expect(submit).not.toHaveBeenCalled()
  })

  it('moves the cursor to the first missing star rating', async () => {
    const submit = renderForm()
    await chooseEmployee()
    await choosePeriod('1')
    rate('Quality of Work', 4)
    await userEvent.type(comments(), 'ok')

    await userEvent.click(submitButton())

    expect(screen.getByText('Choose a rating for Delivery & Ownership.')).toBeInTheDocument()
    expect(within(ratingGroup('Delivery & Ownership')).getAllByRole('radio')).toContain(document.activeElement)
    expect(submit).not.toHaveBeenCalled()
  })

  it('moves the cursor to the period when only the period is missing', async () => {
    renderForm()
    await chooseEmployee()
    rate('Quality of Work', 4)
    rate('Delivery & Ownership', 4)
    rate('Teamwork & Collaboration', 4)
    await userEvent.type(comments(), 'ok')

    await userEvent.click(submitButton())

    expect(periodSelect()).toHaveFocus()
  })

  it('sends the two ids, the three ratings and the trimmed comments, and nothing else', async () => {
    const submit = renderForm()
    await fillValid('  Strong quarter.  ')

    await userEvent.click(submitButton())

    expect(submit).toHaveBeenCalledTimes(1)
    expect(submit).toHaveBeenCalledWith({
      employee_id: 1,
      review_period_id: 1,
      quality_of_work: 4,
      delivery_ownership: 5,
      teamwork_collaboration: 3,
      comments: 'Strong quarter.',
    })
  })

  it('lets you change a rating before sending, and sends the final one', async () => {
    const submit = renderForm()
    await fillValid()
    rate('Quality of Work', 2)
    rate('Quality of Work', 5)

    await userEvent.click(submitButton())

    expect(submit).toHaveBeenCalledWith(expect.objectContaining({ quality_of_work: 5 }))
  })

  it('sends multi-line comments as they are written', async () => {
    const submit = renderForm()
    await fillValid()
    await userEvent.type(comments(), '{Enter}Second line.')

    await userEvent.click(submitButton())

    expect(submit).toHaveBeenCalledWith(expect.objectContaining({ comments: 'Strong quarter.\nSecond line.' }))
  })

  it('blocks a second submit while the first is still saving', async () => {
    let finish: (value: SubmitResult) => void = () => {}
    const submit = renderForm(() => new Promise<SubmitResult>((resolve) => (finish = resolve)))
    await fillValid()

    await userEvent.click(submitButton())

    const busy = screen.getByRole('button', { name: 'Submitting…' })
    expect(busy).toBeDisabled()
    expect(busy).toHaveAttribute('aria-busy', 'true')
    fireEvent.click(busy)
    fireEvent.submit(screen.getByRole('form', { name: 'Submit review' }))
    expect(submit).toHaveBeenCalledTimes(1)

    finish(undefined)
    expect(await screen.findByRole('button', { name: 'Submit Review' })).toBeEnabled()
  })
})

describe('SubmitReviewForm: problems reported by the backend', () => {
  it('shows a field message from the backend, keeps the input, and focuses that field', async () => {
    renderForm(async () => ({ fieldErrors: { comments: 'This value was not accepted.' } }))
    await fillValid()

    await userEvent.click(submitButton())

    expect(await screen.findByText('This value was not accepted.')).toBeInTheDocument()
    expect(comments()).toHaveFocus()
    expect(comments()).toHaveValue('Strong quarter.')
    expect(employeeBox()).toHaveValue('Alex Morgan (EMP101)')
    expect(submitButton()).toBeEnabled()
  })

  it('removes a backend message when that field is edited', async () => {
    renderForm(async () => ({ fieldErrors: { comments: 'rejected' } }))
    await fillValid()
    await userEvent.click(submitButton())
    await screen.findByText('rejected')

    await userEvent.type(comments(), '!')

    expect(screen.queryByText('rejected')).not.toBeInTheDocument()
  })

  it('shows a message about the review as a whole in an alert, moves to it, and keeps everything', async () => {
    renderForm(async () => ({ formError: "Employee EMP101 already has a review for '2026 H2'" }))
    await fillValid()

    await userEvent.click(submitButton())

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent("Employee EMP101 already has a review for '2026 H2'")
    expect(alert).toHaveFocus()
    expect(periodSelect()).toHaveValue('1')
    expect(within(ratingGroup('Quality of Work')).getByText('4 / 5')).toBeInTheDocument()
    expect(submitButton()).toBeEnabled()
  })

  it('clears an old alert when you try again', async () => {
    const submit = renderForm()
    submit.mockResolvedValueOnce({ formError: 'First attempt failed.' })
    await fillValid()
    await userEvent.click(submitButton())
    expect(await screen.findByRole('alert')).toHaveTextContent('First attempt failed.')

    await userEvent.click(submitButton())

    await vi.waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
    expect(submit).toHaveBeenCalledTimes(2)
  })

  it('copes with an unexpected failure', async () => {
    renderForm(async () => {
      throw new Error('boom')
    })
    await fillValid()

    await userEvent.click(submitButton())

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong. Please try again.')
    expect(submitButton()).toBeEnabled()
  })
})

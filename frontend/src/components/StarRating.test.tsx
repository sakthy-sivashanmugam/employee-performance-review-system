import { useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider } from '@mui/material'
import { theme } from '../theme'
import { StarRating } from './StarRating'

function renderRating(ui: React.ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>)
}

/** The five star choices. While nothing is selected MUI also adds a hidden "Empty" radio; skip it. */
function starRadios() {
  return (screen.getAllByRole('radio') as HTMLInputElement[]).filter((radio) => radio.value !== '')
}

/**
 * Clicks a star. Mouse clicks are simulated with fireEvent because MUI works out the hovered star
 * from the pointer position inside the stars' box; jsdom has no layout, so a pointer move
 * (as user-event does) produces NaN there. Real browsers are not affected.
 */
function clickStar(name: string) {
  fireEvent.click(screen.getByLabelText(name))
}

/** Holds the value like a real form would, so the component behaves as a controlled input. */
function Controlled({ initial = null, onChange }: { initial?: number | null; onChange?: (v: number) => void }) {
  const [value, setValue] = useState<number | null>(initial)
  return (
    <StarRating
      label="Quality of Work"
      value={value}
      onChange={(next) => {
        setValue(next)
        onChange?.(next)
      }}
    />
  )
}

describe('StarRating (interactive)', () => {
  it('is a labelled group with five star choices, from 1 to 5', () => {
    renderRating(<StarRating label="Quality of Work" value={null} onChange={() => {}} />)

    expect(screen.getByRole('group', { name: 'Quality of Work' })).toBeInTheDocument()
    expect(starRadios().map((star) => star.value)).toEqual(['1', '2', '3', '4', '5'])
    expect(screen.getByLabelText('1 star')).toBeInTheDocument()
    for (const n of [2, 3, 4, 5]) expect(screen.getByLabelText(`${n} stars`)).toBeInTheDocument()
  })

  it('says "Not rated" until a rating is chosen', () => {
    renderRating(<StarRating label="Quality of Work" value={null} onChange={() => {}} />)

    expect(screen.getByText('Not rated')).toBeInTheDocument()
    expect(starRadios().some((star) => star.checked)).toBe(false)
  })

  it('shows the chosen rating as text and marks that star as selected', () => {
    renderRating(<StarRating label="Quality of Work" value={4} onChange={() => {}} />)

    expect(screen.getByText('4 / 5')).toBeInTheDocument()
    expect(screen.getByLabelText('4 stars')).toBeChecked()
    expect(screen.getByLabelText('5 stars')).not.toBeChecked()
  })

  it('reports a whole number when a star is clicked', () => {
    const onChange = vi.fn()
    renderRating(<StarRating label="Quality of Work" value={null} onChange={onChange} />)

    clickStar('4 stars')

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith(4)
  })

  it('reports every rating from 1 to 5', () => {
    const onChange = vi.fn()
    renderRating(<StarRating label="Quality of Work" value={null} onChange={onChange} />)

    clickStar('1 star')
    for (const n of [2, 3, 4, 5]) clickStar(`${n} stars`)

    expect(onChange.mock.calls.map((call) => call[0])).toEqual([1, 2, 3, 4, 5])
  })

  it('updates the displayed rating when the value changes', () => {
    renderRating(<Controlled />)

    clickStar('2 stars')
    expect(screen.getByText('2 / 5')).toBeInTheDocument()

    clickStar('5 stars')
    expect(screen.getByText('5 / 5')).toBeInTheDocument()
  })

  it('keeps the rating when the selected star is clicked again (it cannot be cleared)', () => {
    const onChange = vi.fn()
    renderRating(<Controlled initial={3} onChange={onChange} />)

    // MUI treats a second click on the selected star as "clear" and reports null. A non-zero
    // position is needed because MUI ignores clicks at (0, 0), which it takes for the keyboard.
    fireEvent.click(screen.getByLabelText('3 stars'), { clientX: 10, clientY: 10 })

    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getByText('3 / 5')).toBeInTheDocument()
    expect(screen.getByLabelText('3 stars')).toBeChecked()
  })

  it('can be changed with the keyboard (Tab to the control, then the arrow keys)', async () => {
    const onChange = vi.fn()
    renderRating(<Controlled initial={2} onChange={onChange} />)

    await userEvent.tab()
    expect(screen.getByLabelText('2 stars')).toHaveFocus()

    await userEvent.keyboard('{ArrowRight}')
    expect(onChange).toHaveBeenLastCalledWith(3)
    expect(screen.getByText('3 / 5')).toBeInTheDocument()

    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}')
    expect(onChange).toHaveBeenLastCalledWith(1)
    expect(screen.getByText('1 / 5')).toBeInTheDocument()
  })

  it('never reports "no rating" to the form, even when the arrow keys move past star 1', async () => {
    const onChange = vi.fn()
    renderRating(<Controlled initial={1} onChange={onChange} />)

    await userEvent.tab()
    await userEvent.keyboard('{ArrowLeft}')

    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getByText('1 / 5')).toBeInTheDocument()
  })

  it('shows helper text for validation messages', () => {
    renderRating(
      <StarRating label="Quality of Work" value={null} onChange={() => {}} error helperText="Choose a rating" />,
    )

    expect(screen.getByText('Choose a rating')).toBeInTheDocument()
  })
})

describe('StarRating (read-only)', () => {
  it('shows an average with two decimals, named for screen readers, with no input controls', () => {
    renderRating(<StarRating readOnly label="Average rating" value={4.33} />)

    expect(screen.getByRole('img', { name: '4.33 out of 5 stars, Average rating' })).toBeInTheDocument()
    expect(screen.getByText('4.33 / 5')).toBeInTheDocument()
    expect(screen.queryAllByRole('radio')).toHaveLength(0)
  })

  it('shows whole numbers without decimals', () => {
    renderRating(<StarRating readOnly label="Average rating" value={5} />)

    expect(screen.getByText('5 / 5')).toBeInTheDocument()
  })

  it('can hide the visible label while keeping the accessible name', () => {
    renderRating(<StarRating readOnly hideLabel label="Average rating for Alex" value={3} />)

    expect(screen.queryByText('Average rating for Alex')).not.toBeInTheDocument()
    expect(screen.getByRole('img', { name: '3 out of 5 stars, Average rating for Alex' })).toBeInTheDocument()
  })

  it('says "Not rated" when there is no value', () => {
    renderRating(<StarRating readOnly label="Average rating" value={null} />)

    expect(screen.getByText('Not rated')).toBeInTheDocument()
  })

  it('does not call onChange when the stars are clicked', () => {
    const onChange = vi.fn()
    renderRating(<StarRating readOnly label="Average rating" value={2} onChange={onChange} />)

    fireEvent.click(screen.getByRole('img'), { clientX: 10, clientY: 10 })

    expect(onChange).not.toHaveBeenCalled()
  })
})

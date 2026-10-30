import type { ReactElement } from 'react'
import { ThemeProvider } from '@mui/material'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { theme } from '../theme'

/** Renders a component inside the app theme and a router, starting at `route`. */
export function renderWithProviders(ui: ReactElement, { route = '/' }: { route?: string } = {}) {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </ThemeProvider>,
  )
}

/** jsdom has no matchMedia. Make every media query match (a wide screen) or none (a phone). */
export function mockScreen(wide: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: wide,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia
}

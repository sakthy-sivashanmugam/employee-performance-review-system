import { CssBaseline, ThemeProvider } from '@mui/material'
import { AppRoutes } from './routes'
import { theme } from './theme'

/** The application. The router is supplied by main.tsx (or by a test). */
export function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppRoutes />
    </ThemeProvider>
  )
}

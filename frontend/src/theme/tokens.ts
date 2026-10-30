/**
 * Design tokens: the raw values the whole UI is built from. Change a value here and the theme,
 * and therefore every component, follows. Components should read colours from the MUI theme
 * (`theme.palette...`) and sizes from `layout`, not repeat these values.
 *
 * Contrast notes (WCAG AA): navy and text colours reach at least 4.5:1 on white and on the
 * page background; the rating colours reach at least 3:1 (the minimum for UI graphics).
 */
export const colors = {
  navy: {
    light: '#3d5f8f',
    main: '#1f3a5f',
    dark: '#142842',
  },
  slate: {
    main: '#4b5d73',
  },
  background: {
    default: '#f4f6f9',
    paper: '#ffffff',
  },
  text: {
    primary: '#1b2430',
    secondary: '#4a5663',
  },
  divider: '#dde3ea',
  success: '#1e7a4c',
  warning: '#9a5b00',
  error: '#b42318',
  info: '#175cd3',
  rating: {
    filled: '#b7791f',
    empty: '#6b7785',
    hover: '#8f5e12',
  },
} as const

export const typography = {
  fontFamily:
    '"Segoe UI", system-ui, -apple-system, "Helvetica Neue", Roboto, Arial, sans-serif',
} as const

export const shape = {
  borderRadius: 10,
} as const

/** Sizes shared by the application layout. */
export const layout = {
  sidebarWidth: 264,
  sidebarCollapsedWidth: 76,
  /** Minimum size of tap targets on touch screens. */
  touchTarget: 44,
} as const

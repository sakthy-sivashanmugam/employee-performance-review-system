import { createTheme } from '@mui/material/styles'
import { colors, layout, shape, typography } from './tokens'

// Adds the star-rating colours to the MUI palette so components can use `palette.rating`.
declare module '@mui/material/styles' {
  interface RatingPalette {
    filled: string
    empty: string
    hover: string
  }
  interface Palette {
    rating: RatingPalette
  }
  interface PaletteOptions {
    rating?: RatingPalette
  }
}

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { ...colors.navy, contrastText: '#ffffff' },
    secondary: { main: colors.slate.main, contrastText: '#ffffff' },
    success: { main: colors.success },
    warning: { main: colors.warning },
    error: { main: colors.error },
    info: { main: colors.info },
    background: colors.background,
    text: colors.text,
    divider: colors.divider,
    rating: colors.rating,
  },
  shape,
  typography: {
    fontFamily: typography.fontFamily,
    h1: { fontSize: '2rem', fontWeight: 700, lineHeight: 1.25 },
    h2: { fontSize: '1.75rem', fontWeight: 700, lineHeight: 1.3 },
    // Page titles.
    h4: { fontSize: '1.75rem', fontWeight: 700, lineHeight: 1.3, letterSpacing: '-0.01em' },
    h5: { fontSize: '1.25rem', fontWeight: 600, lineHeight: 1.35 },
    // Section titles inside cards.
    h6: { fontSize: '1.0625rem', fontWeight: 600, lineHeight: 1.4 },
    subtitle1: { fontWeight: 600 },
    body1: { lineHeight: 1.6 },
    body2: { lineHeight: 1.55 },
    button: { textTransform: 'none', fontWeight: 600 },
    overline: { fontWeight: 600, letterSpacing: '0.06em' },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        html: { WebkitTextSizeAdjust: '100%' },
        // Keep long words and URLs from forcing horizontal scrolling.
        body: { overflowWrap: 'anywhere' },
      },
    },
    MuiPaper: {
      styleOverrides: { root: { backgroundImage: 'none' } },
    },
    MuiCard: {
      defaultProps: { variant: 'outlined' },
      styleOverrides: { root: { borderColor: colors.divider } },
    },
    MuiAppBar: {
      defaultProps: { elevation: 0, color: 'inherit' },
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundColor: theme.palette.background.paper,
          color: theme.palette.text.primary,
          borderBottom: `1px solid ${theme.palette.divider}`,
        }),
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: theme.shape.borderRadius,
          // Comfortable tap target on phones and tablets.
          [theme.breakpoints.down('md')]: { minHeight: layout.touchTarget },
        }),
      },
    },
    MuiIconButton: {
      styleOverrides: {
        // 24px icon + 2 x 10px padding = 44px tap target.
        root: { padding: 10 },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: theme.shape.borderRadius,
          minHeight: layout.touchTarget,
        }),
      },
    },
    MuiChip: {
      styleOverrides: { root: { fontWeight: 600 } },
    },
    MuiRating: {
      styleOverrides: {
        iconFilled: ({ theme }) => ({ color: theme.palette.rating.filled }),
        iconEmpty: ({ theme }) => ({ color: theme.palette.rating.empty }),
        iconHover: ({ theme }) => ({ color: theme.palette.rating.hover }),
      },
    },
  },
})

import { useState } from 'react'
import { Box, Link, Toolbar, useMediaQuery } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { Sidebar } from './Sidebar'

/**
 * The frame around every page: header on top, navigation on the left, page content in the middle.
 * Pages are rendered through <Outlet />. Phones and tablets get a slide-in navigation drawer;
 * wider screens get a permanent sidebar that can be collapsed to icons.
 */
export function AppShell() {
  const theme = useTheme()
  // noSsr: this app only runs in the browser, so read the real screen size on the first render.
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'), { noSsr: true })
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Link
        href="#main-content"
        sx={{
          position: 'absolute',
          left: -9999,
          zIndex: (t) => t.zIndex.tooltip,
          bgcolor: 'background.paper',
          p: 1.5,
          '&:focus': { left: 16, top: 16 },
        }}
      >
        Skip to main content
      </Link>

      <Header
        isDesktop={isDesktop}
        sidebarCollapsed={collapsed}
        onMenuClick={() => (isDesktop ? setCollapsed((value) => !value) : setMobileOpen(true))}
      />
      <Sidebar
        isDesktop={isDesktop}
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <Box
        component="main"
        id="main-content"
        tabIndex={-1}
        // minWidth: 0 lets the content shrink inside the flex row instead of overflowing sideways.
        sx={{ flexGrow: 1, minWidth: 0, p: { xs: 2, sm: 3, lg: 4 }, outline: 'none' }}
      >
        {/* Spacer so the fixed header does not cover the top of the page. */}
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  )
}

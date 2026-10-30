import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Tooltip,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import { Link as RouterLink, useLocation } from 'react-router-dom'
import { layout } from '../theme'
import { NAV_ITEMS } from './navigation'
import { findPage } from './pages'

interface SidebarProps {
  /** Wide screens: a permanent sidebar that can be collapsed to icons. Otherwise a drawer. */
  isDesktop: boolean
  collapsed: boolean
  mobileOpen: boolean
  onMobileClose: () => void
}

function NavList({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const { pathname } = useLocation()
  const activeNavPath = findPage(pathname)?.navPath

  return (
    <List component="nav" aria-label="Main navigation" sx={{ px: 1.5, py: 2 }}>
      {NAV_ITEMS.map(({ label, path, icon: Icon }) => {
        const active = path === activeNavPath
        return (
          <ListItem key={path} disablePadding sx={{ display: 'block', mb: 0.5 }}>
            <Tooltip title={collapsed ? label : ''} placement="right">
              <ListItemButton
                component={RouterLink}
                to={path}
                selected={active}
                aria-current={active ? 'page' : undefined}
                onClick={onNavigate}
                sx={(theme) => ({
                  color: alpha(theme.palette.common.white, 0.82),
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  px: collapsed ? 1 : 2,
                  '&:hover': { backgroundColor: alpha(theme.palette.common.white, 0.08) },
                  '&.Mui-selected, &.Mui-selected:hover': {
                    color: theme.palette.common.white,
                    backgroundColor: alpha(theme.palette.common.white, 0.16),
                    // A bar as well as the colour change, so the current page is not colour-only.
                    boxShadow: `inset 3px 0 0 ${theme.palette.common.white}`,
                  },
                  '&.Mui-focusVisible': { outline: `2px solid ${theme.palette.common.white}` },
                })}
              >
                <ListItemIcon
                  sx={{ color: 'inherit', minWidth: 0, mr: collapsed ? 0 : 2, justifyContent: 'center' }}
                >
                  <Icon />
                </ListItemIcon>
                {/* Collapsed: the tooltip supplies the accessible name of the icon-only button. */}
                {!collapsed && <ListItemText primary={label} slotProps={{ primary: { sx: { fontWeight: 600 } } }} />}
              </ListItemButton>
            </Tooltip>
          </ListItem>
        )
      })}
    </List>
  )
}

/** Left navigation: permanent (collapsible) on wide screens, a slide-in drawer on small ones. */
export function Sidebar({ isDesktop, collapsed, mobileOpen, onMobileClose }: SidebarProps) {
  const paperSx = {
    backgroundColor: 'primary.dark',
    color: 'primary.contrastText',
    borderRight: 'none',
    overflowX: 'hidden',
  } as const

  if (isDesktop) {
    const width = collapsed ? layout.sidebarCollapsedWidth : layout.sidebarWidth
    return (
      <Drawer
        variant="permanent"
        sx={{
          width,
          flexShrink: 0,
          transition: (theme) => theme.transitions.create('width'),
          '& .MuiDrawer-paper': { ...paperSx, width, transition: (theme) => theme.transitions.create('width') },
        }}
      >
        {/* Spacer so the fixed header does not cover the first item. */}
        <Toolbar />
        <NavList collapsed={collapsed} />
      </Drawer>
    )
  }

  return (
    <Drawer
      variant="temporary"
      open={mobileOpen}
      onClose={onMobileClose}
      sx={{ '& .MuiDrawer-paper': { ...paperSx, width: layout.sidebarWidth, maxWidth: '85vw' } }}
    >
      <Toolbar />
      <NavList collapsed={false} onNavigate={onMobileClose} />
    </Drawer>
  )
}

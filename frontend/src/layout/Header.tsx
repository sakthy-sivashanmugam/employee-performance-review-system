import { AppBar, Avatar, Badge, IconButton, Toolbar, Tooltip, Typography } from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import MenuOpenIcon from '@mui/icons-material/MenuOpen'
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone'
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined'
import { APP_NAME } from '../config/app'

interface HeaderProps {
  /** Wide screens: the sidebar sits beside the content and the button collapses it. */
  isDesktop: boolean
  sidebarCollapsed: boolean
  onMenuClick: () => void
}

/** Top bar: sidebar button, application name, and the notification and profile placeholders. */
export function Header({ isDesktop, sidebarCollapsed, onMenuClick }: HeaderProps) {
  const menuLabel = !isDesktop
    ? 'Open navigation menu'
    : sidebarCollapsed
      ? 'Expand sidebar'
      : 'Collapse sidebar'

  return (
    <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
      <Toolbar sx={{ gap: 1 }}>
        <IconButton edge="start" aria-label={menuLabel} onClick={onMenuClick}>
          {isDesktop && !sidebarCollapsed ? <MenuOpenIcon /> : <MenuIcon />}
        </IconButton>

        <Typography variant="h6" component="p" noWrap sx={{ flexGrow: 1, fontWeight: 700 }}>
          {APP_NAME}
        </Typography>

        {/* Placeholders only: there is no notification or user-account feature yet. */}
        <Tooltip title="Notifications (coming later)">
          <IconButton aria-label="Notifications (placeholder)">
            <Badge color="error" variant="dot" invisible>
              <NotificationsNoneIcon />
            </Badge>
          </IconButton>
        </Tooltip>
        <Tooltip title="User profile (coming later)">
          <IconButton edge="end" aria-label="User profile (placeholder)">
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
              <PersonOutlinedIcon fontSize="small" />
            </Avatar>
          </IconButton>
        </Tooltip>
      </Toolbar>
    </AppBar>
  )
}

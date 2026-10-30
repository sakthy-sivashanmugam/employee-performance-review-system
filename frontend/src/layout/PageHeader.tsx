import { useEffect, type ReactNode } from 'react'
import { Box, Breadcrumbs, Link, Typography } from '@mui/material'
import { Link as RouterLink, useLocation } from 'react-router-dom'
import { APP_NAME } from '../config/app'
import { breadcrumbTrail, findPage } from './pages'

interface PageHeaderProps {
  title: string
  description?: string
  /** Optional buttons shown beside the title. */
  actions?: ReactNode
}

/** The title block at the top of every page: breadcrumbs, the page heading and a short summary. */
export function PageHeader({ title, description, actions }: PageHeaderProps) {
  const { pathname } = useLocation()
  const page = findPage(pathname)
  const trail = page ? breadcrumbTrail(page) : []

  // Screen readers and browser tabs announce the page by its title.
  useEffect(() => {
    document.title = `${title} · ${APP_NAME}`
  }, [title])

  return (
    <Box sx={{ mb: { xs: 2, md: 3 } }}>
      {trail.length > 1 && (
        <Breadcrumbs aria-label="Breadcrumb" sx={{ mb: 1 }}>
          {trail.map((crumb, index) =>
            index === trail.length - 1 ? (
              <Typography key={crumb.path} variant="body2" color="text.primary" aria-current="page">
                {crumb.title}
              </Typography>
            ) : (
              <Link key={crumb.path} component={RouterLink} to={crumb.path} variant="body2" underline="hover">
                {crumb.title}
              </Link>
            ),
          )}
        </Breadcrumbs>
      )}
      <Box
        sx={{
          display: 'flex',
          alignItems: { xs: 'flex-start', sm: 'center' },
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h4" component="h1">
            {title}
          </Typography>
          {description && (
            <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
              {description}
            </Typography>
          )}
        </Box>
        {actions}
      </Box>
    </Box>
  )
}

import { useId, type ReactNode } from 'react'
import { Avatar, Box, Card, CardContent, Skeleton, Typography } from '@mui/material'

interface StatCardProps {
  title: string
  /** Undefined while loading. */
  value: number | undefined
  icon: ReactNode
  loading?: boolean
}

/** A summary figure with a title and an icon, e.g. "Total Employees 24". */
export function StatCard({ title, value, icon, loading = false }: StatCardProps) {
  const titleId = useId()
  return (
    <Card component="section" aria-labelledby={titleId} sx={{ height: '100%' }}>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, p: { xs: 2, sm: 3 } }}>
        <Avatar
          variant="rounded"
          sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', width: 48, height: 48 }}
        >
          {icon}
        </Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography id={titleId} variant="body2" color="text.secondary">
            {title}
          </Typography>
          {loading || value === undefined ? (
            <Skeleton variant="text" width={56} sx={{ fontSize: '2rem' }} />
          ) : (
            <Typography variant="h4" component="p">
              {value}
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  )
}

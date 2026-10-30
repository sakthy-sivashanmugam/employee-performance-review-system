import { useId, type ReactNode } from 'react'
import { Box, Card, CardContent, Divider, Typography } from '@mui/material'

interface SectionCardProps {
  title: string
  /** Optional control shown at the right of the title, e.g. a link. */
  action?: ReactNode
  children: ReactNode
}

/** A titled card used for the dashboard sections. The title names the region for screen readers. */
export function SectionCard({ title, action, children }: SectionCardProps) {
  const titleId = useId()
  return (
    <Card component="section" aria-labelledby={titleId}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          flexWrap: 'wrap',
          px: { xs: 2, sm: 3 },
          py: 2,
        }}
      >
        <Typography id={titleId} variant="h6" component="h2">
          {title}
        </Typography>
        {action}
      </Box>
      <Divider />
      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>{children}</CardContent>
    </Card>
  )
}

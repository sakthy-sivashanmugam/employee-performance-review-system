import type { ReactNode } from 'react'
import { Card, CardContent } from '@mui/material'

/** A centred card for "nothing here" messages, such as an empty list or a search with no match. */
export function MessageCard({ children }: { children: ReactNode }) {
  return (
    <Card>
      <CardContent sx={{ textAlign: 'center', py: 5 }}>{children}</CardContent>
    </Card>
  )
}

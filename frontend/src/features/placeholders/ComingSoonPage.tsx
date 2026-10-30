import { Alert, Stack } from '@mui/material'
import { PageHeader } from '../../layout/PageHeader'

interface ComingSoonPageProps {
  title: string
  description: string
}

/** A stand-in for a screen that has not been built yet, so every sidebar link works. */
export function ComingSoonPage({ title, description }: ComingSoonPageProps) {
  return (
    <Stack spacing={2}>
      <PageHeader title={title} description={description} />
      <Alert severity="info">This screen has not been built yet. It is planned for a later step.</Alert>
    </Stack>
  )
}

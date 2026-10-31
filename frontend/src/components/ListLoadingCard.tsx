import { Box, Card, CardContent, Skeleton, Stack } from '@mui/material'

const visuallyHidden = {
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
} as const

/** Placeholder rows shown while a list loads. The label is announced to screen readers. */
export function ListLoadingCard({ label }: { label: string }) {
  return (
    <Card aria-busy="true">
      <CardContent>
        <Box role="status" sx={visuallyHidden}>
          {label}
        </Box>
        <Stack spacing={1.5}>
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} variant="rounded" height={44} />
          ))}
        </Stack>
      </CardContent>
    </Card>
  )
}

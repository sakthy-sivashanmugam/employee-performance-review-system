import { Alert, Button } from '@mui/material'

interface LoadErrorAlertProps {
  /** What failed to load, e.g. "The employees". */
  subject: string
  message: string
  onRetry: () => void
}

/** The error shown when a list could not be loaded, with a Retry button. */
export function LoadErrorAlert({ subject, message, onRetry }: LoadErrorAlertProps) {
  return (
    <Alert
      severity="error"
      action={
        <Button color="inherit" size="small" onClick={onRetry}>
          Retry
        </Button>
      }
    >
      {subject} could not be loaded. {message}
    </Alert>
  )
}

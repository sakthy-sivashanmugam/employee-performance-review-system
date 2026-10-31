import { Box, Button, CircularProgress } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'

interface FormActionsProps {
  /** Where Cancel goes. */
  cancelTo: string
  submitLabel: string
  /** Shown on the button while saving, e.g. "Adding…". */
  submittingLabel: string
  submitting: boolean
}

/**
 * The button row at the bottom of a form: Cancel and a submit button. While saving, the submit
 * button is disabled and shows progress. On phones the buttons stack, with the main one on top.
 */
export function FormActions({ cancelTo, submitLabel, submittingLabel, submitting }: FormActionsProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column-reverse', sm: 'row' },
        justifyContent: 'flex-end',
        gap: 1.5,
      }}
    >
      <Button component={RouterLink} to={cancelTo} variant="outlined" sx={{ width: { xs: '100%', sm: 'auto' } }}>
        Cancel
      </Button>
      <Button
        type="submit"
        variant="contained"
        disabled={submitting}
        aria-busy={submitting}
        startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : undefined}
        sx={{ width: { xs: '100%', sm: 'auto' } }}
      >
        {submitting ? submittingLabel : submitLabel}
      </Button>
    </Box>
  )
}

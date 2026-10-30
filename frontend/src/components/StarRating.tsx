import { useId } from 'react'
import { Box, FormControl, FormHelperText, FormLabel, Rating, Typography } from '@mui/material'
import { formatRating } from '../utils/format'

export const MAX_RATING = 5

interface StarRatingProps {
  /** Name of the criterion, e.g. "Quality of Work". Used as the visible label and for screen readers. */
  label: string
  value: number | null
  /** Called with a whole number from 1 to 5. Omit it together with `readOnly` to display a value. */
  onChange?: (value: number) => void
  /** Display only. Allows fractional values such as an average of 4.33. */
  readOnly?: boolean
  /** Read-only only: hide the visible label (it still names the stars for screen readers). */
  hideLabel?: boolean
  size?: 'small' | 'medium' | 'large'
  required?: boolean
  error?: boolean
  helperText?: string
}

/**
 * A 1-5 star rating control, used for the three review criteria.
 *
 * Interactive: whole stars only. Selecting the star that is already selected keeps the rating
 * (it cannot be cleared back to nothing), the chosen rating is shown as text ("4 / 5"), and it
 * is a labelled group of radio buttons, so arrow keys and screen readers work natively.
 * Filled and outlined stars differ in shape, so colour is not the only signal.
 *
 * Read-only: shows a value (including averages) with the same look.
 */
export function StarRating({
  label,
  value,
  onChange,
  readOnly = false,
  hideLabel = false,
  size = 'large',
  required = false,
  error = false,
  helperText,
}: StarRatingProps) {
  const name = useId()

  if (readOnly) {
    const shown = value ?? 0
    return (
      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
        {!hideLabel && (
          <Typography variant="body2" color="text.secondary" component="span">
            {label}
          </Typography>
        )}
        <Rating
          readOnly
          name={name}
          value={shown}
          precision={0.1}
          max={MAX_RATING}
          size={size}
          // MUI would build this from a value rounded to 0.1 (4.33 would read "4.3"), so use the exact one.
          getLabelText={() => `${formatRating(shown)} out of ${MAX_RATING} stars, ${label}`}
        />
        <Typography variant="body2" component="span" sx={{ fontWeight: 600 }}>
          {value === null ? 'Not rated' : `${formatRating(value)} / ${MAX_RATING}`}
        </Typography>
      </Box>
    )
  }

  return (
    <FormControl component="fieldset" error={error} required={required} variant="standard">
      <FormLabel component="legend" sx={{ mb: 0.5, color: 'text.primary', fontWeight: 600 }}>
        {label}
      </FormLabel>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
        <Rating
          name={name}
          value={value}
          precision={1}
          max={MAX_RATING}
          size={size}
          // Stars are at least 44px wide on phones (tap target) and a little smaller with a mouse.
          sx={{ fontSize: { xs: '2.75rem', sm: '2.25rem' } }}
          onChange={(_event, newValue) => {
            // Clicking the selected star again reports null; keep the current rating instead.
            if (newValue !== null) onChange?.(newValue)
          }}
          getLabelText={(stars) => `${stars} ${stars === 1 ? 'star' : 'stars'}`}
        />
        <Typography
          component="span"
          variant="body1"
          aria-live="polite"
          sx={{ fontWeight: 600, minWidth: '4.5ch' }}
        >
          {value === null ? 'Not rated' : `${value} / ${MAX_RATING}`}
        </Typography>
      </Box>
      {helperText && <FormHelperText>{helperText}</FormHelperText>}
    </FormControl>
  )
}

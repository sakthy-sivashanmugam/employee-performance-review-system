import { Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material'
import { StatusChip } from '../../components/StatusChip'
import type { ReviewPeriod } from '../../types/api'
import { formatDate } from '../../utils/dates'

/** The review period list as a table, for wide screens. */
export function ReviewPeriodTable({ periods }: { periods: ReviewPeriod[] }) {
  return (
    <TableContainer component={Paper} variant="outlined">
      <Table aria-label="Review periods">
        <TableHead>
          <TableRow sx={{ bgcolor: 'background.default' }}>
            {['Name', 'Start date', 'End date', 'Status'].map((heading) => (
              <TableCell key={heading} sx={{ fontWeight: 700 }}>
                {heading}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {periods.map((period) => (
            <TableRow key={period.id} hover>
              <TableCell component="th" scope="row">
                {period.name}
              </TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>
                <time dateTime={period.start_date}>{formatDate(period.start_date)}</time>
              </TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>
                <time dateTime={period.end_date}>{formatDate(period.end_date)}</time>
              </TableCell>
              <TableCell>
                <StatusChip status={period.status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

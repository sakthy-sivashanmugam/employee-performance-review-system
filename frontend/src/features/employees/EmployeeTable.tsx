import { Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material'
import { StatusChip } from '../../components/StatusChip'
import type { Employee } from '../../types/api'

/** The employee list as a table, for wide screens. */
export function EmployeeTable({ employees }: { employees: Employee[] }) {
  return (
    <TableContainer component={Paper} variant="outlined">
      <Table aria-label="Employees">
        <TableHead>
          <TableRow sx={{ bgcolor: 'background.default' }}>
            {['Employee code', 'Name', 'Department', 'Email', 'Status'].map((heading) => (
              <TableCell key={heading} sx={{ fontWeight: 700 }}>
                {heading}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {employees.map((employee) => (
            <TableRow key={employee.id} hover>
              <TableCell component="th" scope="row" sx={{ whiteSpace: 'nowrap' }}>
                {employee.employee_code}
              </TableCell>
              <TableCell>{employee.name}</TableCell>
              <TableCell>{employee.department}</TableCell>
              <TableCell>{employee.email}</TableCell>
              <TableCell>
                <StatusChip status={employee.status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

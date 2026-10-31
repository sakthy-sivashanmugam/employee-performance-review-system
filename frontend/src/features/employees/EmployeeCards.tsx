import { Box, Card, CardContent, Typography } from '@mui/material'
import { StatusChip } from '../../components/StatusChip'
import type { Employee } from '../../types/api'

/** The employee list as cards (one column on phones, two on tablets), so nothing scrolls sideways. */
export function EmployeeCards({ employees }: { employees: Employee[] }) {
  return (
    <Box
      component="ul"
      aria-label="Employees"
      sx={{
        listStyle: 'none',
        m: 0,
        p: 0,
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
        gap: 2,
      }}
    >
      {employees.map((employee) => (
        <Card key={employee.id} component="li">
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1, mb: 1 }}>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="subtitle1" component="h2">
                  {employee.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {employee.employee_code}
                </Typography>
              </Box>
              <StatusChip status={employee.status} />
            </Box>
            <Box component="dl" sx={{ m: 0, display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: 2, rowGap: 0.5 }}>
              <Typography component="dt" variant="body2" color="text.secondary">
                Department
              </Typography>
              <Typography component="dd" variant="body2" sx={{ m: 0 }}>
                {employee.department}
              </Typography>
              <Typography component="dt" variant="body2" color="text.secondary">
                Email
              </Typography>
              <Typography component="dd" variant="body2" sx={{ m: 0 }}>
                {employee.email}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      ))}
    </Box>
  )
}

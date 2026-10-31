import { Stack } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { createEmployee } from '../../api/employees'
import { PageHeader } from '../../layout/PageHeader'
import type { NewEmployee } from '../../types/api'
import { messagesFromServer } from './employeeFormRules'
import { EmployeeForm, type SubmitResult } from './EmployeeForm'

export function AddEmployeePage() {
  const navigate = useNavigate()

  async function save(data: NewEmployee): Promise<SubmitResult> {
    try {
      const employee = await createEmployee(data)
      // Back to the list, which loads fresh and so includes the new employee, with a confirmation.
      navigate('/employees', {
        state: { notice: `${employee.name} (${employee.employee_code}) was added.` },
      })
    } catch (error) {
      if (!(error instanceof ApiError)) return { formError: 'Something went wrong. Please try again.' }

      const fieldErrors = messagesFromServer(error.status, error.fieldErrors)
      if (Object.keys(fieldErrors).length > 0) return { fieldErrors }
      // A conflict the backend could not pin on one field (two requests racing).
      if (error.status === 409) return { formError: 'That employee code or email is already in use.' }
      return { formError: error.message }
    }
  }

  return (
    <Stack spacing={{ xs: 2, md: 3 }}>
      <PageHeader title="Add Employee" description="Enter the details of the new employee." />
      <EmployeeForm onSubmit={save} />
    </Stack>
  )
}

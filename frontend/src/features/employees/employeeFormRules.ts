import type { NewEmployee } from '../../types/api'
import { characterCount, trimLikeBackend } from '../../utils/backendText'

export interface EmployeeFormValues {
  employee_code: string
  name: string
  department: string
  email: string
}

export type EmployeeFormField = keyof EmployeeFormValues
export type EmployeeFormErrors = Partial<Record<EmployeeFormField, string>>

/** The fields in the order they appear on the form (used to find the first one to fix). */
export const FORM_FIELDS: EmployeeFormField[] = ['employee_code', 'name', 'department', 'email']

export const EMPTY_FORM: EmployeeFormValues = { employee_code: '', name: '', department: '', email: '' }

/** Limits match the database columns and the backend schema (backend/app/schemas/employee.py). */
const MAX_LENGTH: Record<EmployeeFormField, number> = {
  employee_code: 20,
  name: 100,
  department: 100,
  email: 254,
}

const LABEL: Record<EmployeeFormField, string> = {
  employee_code: 'Employee code',
  name: 'Name',
  department: 'Department',
  email: 'Email',
}

// Exactly the backend's rule: EMP followed by digits (and only 0-9, not other kinds of digit).
const EMPLOYEE_CODE_PATTERN = /^EMP[0-9]+$/

/**
 * Checks one field the way the backend will. Surrounding spaces are ignored, as on the backend,
 * and there is deliberately no email format check: the backend only requires an email to be
 * present. Returns a message, or undefined when the value is fine.
 */
export function validateField(field: EmployeeFormField, value: string): string | undefined {
  const text = trimLikeBackend(value)
  if (text === '') return `${LABEL[field]} is required.`
  if (field === 'employee_code' && !EMPLOYEE_CODE_PATTERN.test(text)) {
    return 'Use EMP followed by digits, for example EMP106.'
  }
  if (characterCount(text) > MAX_LENGTH[field]) {
    return `${LABEL[field]} must be ${MAX_LENGTH[field]} characters or fewer.`
  }
  return undefined
}

export function validateEmployeeForm(values: EmployeeFormValues): EmployeeFormErrors {
  const errors: EmployeeFormErrors = {}
  for (const field of FORM_FIELDS) {
    const message = validateField(field, values[field])
    if (message) errors[field] = message
  }
  return errors
}

/** The request body: the four fields with surrounding spaces removed. No status is sent. */
export function toNewEmployee(values: EmployeeFormValues): NewEmployee {
  return {
    employee_code: trimLikeBackend(values.employee_code),
    name: trimLikeBackend(values.name),
    department: trimLikeBackend(values.department),
    email: trimLikeBackend(values.email),
  }
}

const CONFLICT_MESSAGE: Partial<Record<string, string>> = {
  employee_code: 'That employee code is already in use.',
  email: 'That email is already in use.',
}

/**
 * Turns the backend's per-field errors into messages for the form. Conflicts (409) become plain
 * sentences; anything else the backend rejects (422) gets a generic message, because the form
 * already checks the rules itself and the backend's own wording is technical.
 */
export function messagesFromServer(status: number, fieldErrors: Record<string, string>): EmployeeFormErrors {
  const errors: EmployeeFormErrors = {}
  for (const field of FORM_FIELDS) {
    if (!(field in fieldErrors)) continue
    errors[field] = (status === 409 && CONFLICT_MESSAGE[field]) || 'This value was not accepted.'
  }
  return errors
}

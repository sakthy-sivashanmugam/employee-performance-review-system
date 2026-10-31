import { useRef, useState, type FormEvent } from 'react'
import { Alert, Card, CardContent, Stack, TextField, Typography } from '@mui/material'
import { FormActions } from '../../components/FormActions'
import type { NewEmployee } from '../../types/api'
import {
  EMPTY_FORM,
  FORM_FIELDS,
  toNewEmployee,
  validateEmployeeForm,
  type EmployeeFormErrors,
  type EmployeeFormField,
} from './employeeFormRules'

/** What the page tells the form after trying to save. Nothing (undefined) means it worked. */
export type SubmitResult = void | { formError?: string; fieldErrors?: EmployeeFormErrors }

interface EmployeeFormProps {
  onSubmit: (data: NewEmployee) => Promise<SubmitResult>
}

const FIELD_CONFIG: Record<
  EmployeeFormField,
  { label: string; hint?: string; input?: Record<string, unknown> }
> = {
  employee_code: {
    label: 'Employee code',
    hint: 'EMP followed by digits, for example EMP106.',
    // A hint for phone keyboards; it does not change what is sent.
    input: { autoCapitalize: 'characters', spellCheck: false },
  },
  name: { label: 'Name' },
  department: { label: 'Department' },
  email: { label: 'Email', input: { inputMode: 'email', autoCapitalize: 'none', spellCheck: false } },
}

/**
 * The Add Employee form. It checks the input as the backend will (see employeeFormRules.ts), shows
 * each problem under its field, and puts the cursor on the first field that needs fixing. Saving
 * is up to the page, through `onSubmit`.
 */
export function EmployeeForm({ onSubmit }: EmployeeFormProps) {
  const [values, setValues] = useState(EMPTY_FORM)
  const [touched, setTouched] = useState<Partial<Record<EmployeeFormField, boolean>>>({})
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [serverErrors, setServerErrors] = useState<EmployeeFormErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const inputs = useRef<Partial<Record<EmployeeFormField, HTMLInputElement | null>>>({})
  // A ref, not state: it blocks a second submit in the same moment, before a re-render happens.
  const saving = useRef(false)

  const clientErrors = validateEmployeeForm(values)

  /** A message from the backend wins; otherwise a rule message once the field has been left or submitted. */
  function errorFor(field: EmployeeFormField): string | undefined {
    return serverErrors[field] ?? (touched[field] || submitAttempted ? clientErrors[field] : undefined)
  }

  function focusFirst(errors: EmployeeFormErrors) {
    const first = FORM_FIELDS.find((field) => errors[field])
    if (first) inputs.current[first]?.focus()
  }

  function handleChange(field: EmployeeFormField, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
    // A backend complaint is about the old value, so it goes away as soon as the value is edited.
    if (serverErrors[field]) setServerErrors(({ [field]: _removed, ...rest }) => rest)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (saving.current) return

    setSubmitAttempted(true)
    if (Object.keys(clientErrors).length > 0) {
      focusFirst(clientErrors)
      return
    }

    saving.current = true
    setSubmitting(true)
    setFormError(null)
    setServerErrors({})
    try {
      const result = await onSubmit(toNewEmployee(values))
      if (result) {
        setServerErrors(result.fieldErrors ?? {})
        setFormError(result.formError ?? null)
        focusFirst(result.fieldErrors ?? {})
      }
    } catch {
      setFormError('Something went wrong. Please try again.')
    } finally {
      saving.current = false
      setSubmitting(false)
    }
  }

  return (
    <Card component="form" noValidate aria-label="Add employee" onSubmit={handleSubmit} sx={{ maxWidth: 640 }}>
      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Stack spacing={3}>
          {formError && <Alert severity="error">{formError}</Alert>}

          {FORM_FIELDS.map((field) => {
            const { label, hint, input } = FIELD_CONFIG[field]
            const error = errorFor(field)
            return (
              <TextField
                key={field}
                id={`employee-${field}`}
                name={field}
                label={label}
                value={values[field]}
                required
                fullWidth
                error={Boolean(error)}
                helperText={error ?? hint}
                onChange={(event) => handleChange(field, event.target.value)}
                onBlur={() => setTouched((current) => ({ ...current, [field]: true }))}
                inputRef={(element: HTMLInputElement | null) => {
                  inputs.current[field] = element
                }}
                slotProps={{ htmlInput: { autoComplete: 'off', ...input } }}
              />
            )
          })}

          <Typography variant="body2" color="text.secondary">
            New employees start as Active.
          </Typography>

          <FormActions cancelTo="/employees" submitLabel="Add Employee" submittingLabel="Adding…" submitting={submitting} />
        </Stack>
      </CardContent>
    </Card>
  )
}

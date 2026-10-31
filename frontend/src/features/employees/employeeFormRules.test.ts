import {
  EMPTY_FORM,
  FORM_FIELDS,
  messagesFromServer,
  toNewEmployee,
  trimLikeBackend,
  validateEmployeeForm,
  validateField,
  type EmployeeFormValues,
} from './employeeFormRules'

const valid: EmployeeFormValues = {
  employee_code: 'EMP106',
  name: 'Chris Bell',
  department: 'Finance',
  email: 'chris.bell@corp.test',
}

describe('validateField: employee code', () => {
  it.each(['EMP1', 'EMP106', 'EMP000', 'EMP' + '9'.repeat(17)])('accepts %s', (code) => {
    expect(validateField('employee_code', code)).toBeUndefined()
  })

  it('ignores spaces around the code, as the backend does', () => {
    expect(validateField('employee_code', '  EMP106  ')).toBeUndefined()
  })

  it.each(['', '   ', '\t\n'])('requires a value (%j)', (code) => {
    expect(validateField('employee_code', code)).toBe('Employee code is required.')
  })

  it.each([
    'emp106', // lower case
    'Emp106',
    'EMP', // no digits
    'EMP10A',
    'EMP 106', // space inside
    'EMP-106',
    'XYZ106',
    '106',
    'EMP١٢٣', // Arabic-Indic digits are digits in some patterns, but not the backend's [0-9]
  ])('rejects the wrong format %j with an example', (code) => {
    expect(validateField('employee_code', code)).toBe('Use EMP followed by digits, for example EMP106.')
  })

  it('allows 20 characters but not 21', () => {
    expect(validateField('employee_code', 'EMP' + '1'.repeat(17))).toBeUndefined() // 20
    expect(validateField('employee_code', 'EMP' + '1'.repeat(18))).toBe(
      'Employee code must be 20 characters or fewer.',
    )
  })
})

describe('validateField: name and department', () => {
  it.each(['name', 'department'] as const)('%s is required, even if only spaces', (field) => {
    expect(validateField(field, '')).toMatch(/is required\.$/)
    expect(validateField(field, '   ')).toMatch(/is required\.$/)
  })

  it('names the field in the message', () => {
    expect(validateField('name', '')).toBe('Name is required.')
    expect(validateField('department', '')).toBe('Department is required.')
  })

  it.each(['name', 'department'] as const)('%s allows 100 characters but not 101', (field) => {
    expect(validateField(field, 'x'.repeat(100))).toBeUndefined()
    expect(validateField(field, 'x'.repeat(101))).toMatch(/must be 100 characters or fewer\.$/)
  })

  it('counts length after trimming, so padding spaces do not use up the limit', () => {
    expect(validateField('name', `  ${'x'.repeat(100)}  `)).toBeUndefined()
  })

  it('counts an emoji as one character, like the backend', () => {
    expect(validateField('name', '😀'.repeat(100))).toBeUndefined()
    expect(validateField('name', '😀'.repeat(101))).toBeDefined()
  })
})

describe('validateField: email', () => {
  it('is required', () => {
    expect(validateField('email', '')).toBe('Email is required.')
    expect(validateField('email', '  ')).toBe('Email is required.')
  })

  it('has no format check: the backend only requires it to be present', () => {
    for (const email of ['a', 'not an email', 'a@b', '@@', 'x@y.z']) {
      expect(validateField('email', email), email).toBeUndefined()
    }
  })

  it('allows 254 characters but not 255', () => {
    expect(validateField('email', 'a'.repeat(254))).toBeUndefined()
    expect(validateField('email', 'a'.repeat(255))).toBe('Email must be 254 characters or fewer.')
  })
})

describe('validateEmployeeForm', () => {
  it('has no errors for a valid form', () => {
    expect(validateEmployeeForm(valid)).toEqual({})
  })

  it('reports every problem at once, by field', () => {
    expect(validateEmployeeForm(EMPTY_FORM)).toEqual({
      employee_code: 'Employee code is required.',
      name: 'Name is required.',
      department: 'Department is required.',
      email: 'Email is required.',
    })
  })

  it('reports only the fields that are wrong', () => {
    expect(validateEmployeeForm({ ...valid, employee_code: 'emp1', department: ' ' })).toEqual({
      employee_code: 'Use EMP followed by digits, for example EMP106.',
      department: 'Department is required.',
    })
  })

  it('lists the fields in the order they appear on the form', () => {
    expect(FORM_FIELDS).toEqual(['employee_code', 'name', 'department', 'email'])
  })
})

describe('toNewEmployee', () => {
  it('trims every field and sends exactly four fields, with no status or average', () => {
    const body = toNewEmployee({
      employee_code: '  EMP106 ',
      name: ' Chris Bell\n',
      department: '\tFinance ',
      email: '  Chris.Bell@Corp.test  ',
    })

    // The email keeps its case here: lower-casing is the backend's job.
    expect(body).toEqual({
      employee_code: 'EMP106',
      name: 'Chris Bell',
      department: 'Finance',
      email: 'Chris.Bell@Corp.test',
    })
    expect(Object.keys(body).sort()).toEqual(['department', 'email', 'employee_code', 'name'])
  })

  it('keeps spaces inside a value', () => {
    expect(toNewEmployee({ ...valid, name: 'Mary  Jane Watson' }).name).toBe('Mary  Jane Watson')
  })
})

describe('messagesFromServer', () => {
  it('turns a 409 conflict into a plain sentence for the right field', () => {
    expect(messagesFromServer(409, { employee_code: "employee_code 'EMP101' already exists" })).toEqual({
      employee_code: 'That employee code is already in use.',
    })
    expect(messagesFromServer(409, { email: "email 'a@b.c' already exists" })).toEqual({
      email: 'That email is already in use.',
    })
  })

  it('handles both fields conflicting', () => {
    expect(messagesFromServer(409, { employee_code: 'x', email: 'y' })).toEqual({
      employee_code: 'That employee code is already in use.',
      email: 'That email is already in use.',
    })
  })

  it('gives a generic message for fields the backend rejected with a 422', () => {
    expect(messagesFromServer(422, { name: 'String should have at least 1 character' })).toEqual({
      name: 'This value was not accepted.',
    })
  })

  it('ignores fields that are not on the form', () => {
    expect(messagesFromServer(422, { status: 'Extra inputs are not permitted' })).toEqual({})
  })

  it('returns nothing when there are no field errors', () => {
    expect(messagesFromServer(409, {})).toEqual({})
  })
})

describe('trimLikeBackend', () => {
  it('removes the whitespace the backend removes from both ends', () => {
    // space, tab, newline, no-break space, em space, next-line (U+0085), ideographic space
    expect(trimLikeBackend(' \t\n  \u0085　EMP1　\u0085  \n\t ')).toBe('EMP1')
  })

  it('keeps spaces inside the text', () => {
    expect(trimLikeBackend('  Mary  Jane  ')).toBe('Mary  Jane')
  })

  it('does not strip U+FEFF (byte-order mark), unlike JavaScript trim(): the backend keeps it', () => {
    expect(trimLikeBackend('﻿EMP1')).toBe('﻿EMP1')
    expect('﻿EMP1'.trim()).toBe('EMP1') // the difference this function exists to avoid
  })

  it('strips U+0085 (next-line), unlike JavaScript trim(): the backend removes it', () => {
    expect(trimLikeBackend('\u0085EMP1')).toBe('EMP1')
    expect('\u0085EMP1'.trim()).toBe('\u0085EMP1')
  })

  it('does not strip invisible characters that are not whitespace', () => {
    expect(trimLikeBackend('​x​')).toBe('​x​') // zero-width space
  })

  it('returns an empty string for text that is only whitespace', () => {
    expect(trimLikeBackend(' \u0085　 ')).toBe('')
  })
})

describe('whitespace that JavaScript and the backend treat differently', () => {
  // Found by comparing this form's decisions with the real backend's on 70 tricky inputs.
  it('judges a code the way the backend does', () => {
    expect(validateField('employee_code', '\u0085EMP1')).toBeUndefined() // backend accepts
    expect(validateField('employee_code', '﻿EMP1')).toBe('Use EMP followed by digits, for example EMP106.') // backend rejects
  })

  it('judges a required value the way the backend does', () => {
    expect(validateField('name', '\u0085')).toBe('Name is required.') // backend: empty after stripping
    expect(validateField('name', '﻿')).toBeUndefined() // backend: not whitespace, so present
  })

  it('sends values with the same characters removed as the backend would remove', () => {
    expect(toNewEmployee({ ...valid, employee_code: '\u0085EMP106\u0085', name: '﻿Chris' })).toMatchObject({
      employee_code: 'EMP106',
      name: '﻿Chris',
    })
  })
})

import type { Employee } from '../../types/api'
import { filterEmployees, type EmployeeFilter } from './filterEmployees'

function employee(id: number, overrides: Partial<Employee> = {}): Employee {
  return {
    id,
    employee_code: `EMP${100 + id}`,
    name: `Person ${id}`,
    department: 'General',
    email: `person${id}@example.com`,
    status: 'Active',
    ...overrides,
  }
}

const alex = employee(1, { name: 'Alex Morgan', department: 'Engineering', email: 'alex.morgan@corp.test' })
const priya = employee(2, { name: 'Priya Nair', department: 'Marketing', email: 'priya@corp.test', status: 'Inactive' })
const sam = employee(3, { name: 'Sam Carter', department: 'engineering', email: 'sam@corp.test' })
const ALL = [alex, priya, sam]

const none: EmployeeFilter = { search: '', status: 'All' }

function names(filter: Partial<EmployeeFilter>, list = ALL) {
  return filterEmployees(list, { ...none, ...filter }).map((e) => e.name)
}

describe('filterEmployees', () => {
  it('returns everyone, in the original order, when nothing is filtered', () => {
    expect(names({})).toEqual(['Alex Morgan', 'Priya Nair', 'Sam Carter'])
  })

  it('does not change the list it was given', () => {
    const input = [...ALL]
    filterEmployees(input, { search: 'alex', status: 'Active' })

    expect(input).toEqual(ALL)
  })

  describe('status', () => {
    it('shows only Active or only Inactive employees', () => {
      expect(names({ status: 'Active' })).toEqual(['Alex Morgan', 'Sam Carter'])
      expect(names({ status: 'Inactive' })).toEqual(['Priya Nair'])
    })

    it('returns nothing when no employee has that status', () => {
      expect(names({ status: 'Inactive' }, [alex, sam])).toEqual([])
    })
  })

  describe('search', () => {
    it.each([
      ['name', 'morgan', ['Alex Morgan']],
      ['employee code', 'emp102', ['Priya Nair']],
      ['email', 'sam@corp', ['Sam Carter']],
      ['department', 'marketing', ['Priya Nair']],
    ])('matches on %s', (_field, search, expected) => {
      expect(names({ search })).toEqual(expected)
    })

    it('matches part of a word', () => {
      expect(names({ search: 'mor' })).toEqual(['Alex Morgan'])
    })

    it('ignores case in the text typed and in the data', () => {
      expect(names({ search: 'ALEX' })).toEqual(['Alex Morgan'])
      // "Engineering" and "engineering" are both found.
      expect(names({ search: 'ENGINEERING' })).toEqual(['Alex Morgan', 'Sam Carter'])
    })

    it('ignores spaces around the search text, and an all-space search matches everyone', () => {
      expect(names({ search: '   alex   ' })).toEqual(['Alex Morgan'])
      expect(names({ search: '     ' })).toHaveLength(3)
    })

    it('needs every word to match, in any field and any order', () => {
      expect(names({ search: 'alex engineering' })).toEqual(['Alex Morgan'])
      expect(names({ search: 'engineering alex' })).toEqual(['Alex Morgan'])
      expect(names({ search: 'alex marketing' })).toEqual([])
    })

    it('does not match across the boundary between two fields', () => {
      // Fields are checked in the order name, code, email, department. Priya's name ends "...nair"
      // and her code starts "emp102", so "nairemp102" would only match if the fields ran together.
      expect(names({ search: 'nairemp102' })).toEqual([])
      // Likewise her email ends "...corp.test" and her department starts "marketing".
      expect(names({ search: 'corp.testmarketing' })).toEqual([])
      // Each field on its own still matches.
      expect(names({ search: 'nair' })).toEqual(['Priya Nair'])
      expect(names({ search: 'emp102' })).toEqual(['Priya Nair'])
    })

    it('returns nothing when no employee matches', () => {
      expect(names({ search: 'zzz' })).toEqual([])
    })

    it('treats characters such as . and + literally, not as patterns', () => {
      expect(names({ search: 'alex.morgan' })).toEqual(['Alex Morgan'])
      expect(names({ search: 'a.x' })).toEqual([])
      expect(names({ search: '+' })).toEqual([])
    })
  })

  it('combines status and search', () => {
    expect(names({ search: 'engineering', status: 'Active' })).toEqual(['Alex Morgan', 'Sam Carter'])
    expect(names({ search: 'engineering', status: 'Inactive' })).toEqual([])
    expect(names({ search: 'marketing', status: 'Inactive' })).toEqual(['Priya Nair'])
  })

  it('handles an empty list', () => {
    expect(filterEmployees([], { search: 'x', status: 'Active' })).toEqual([])
  })
})

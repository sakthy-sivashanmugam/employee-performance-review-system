/**
 * Shapes of the backend API responses. Field names match the JSON exactly (snake_case), so the
 * data can be used as received without a mapping layer. Keep in sync with backend/app/schemas.
 */

export type EmployeeStatus = 'Active' | 'Inactive'
export type ReviewPeriodStatus = 'Open' | 'Closed'

/** GET /api/employees */
export interface Employee {
  id: number
  employee_code: string
  name: string
  department: string
  email: string
  status: EmployeeStatus
}

/** POST /api/employees body. There is no status: the backend always creates Active employees. */
export interface NewEmployee {
  employee_code: string
  name: string
  department: string
  email: string
}

/** GET /api/review-periods. Dates are ISO text (YYYY-MM-DD). */
export interface ReviewPeriod {
  id: number
  name: string
  start_date: string
  end_date: string
  status: ReviewPeriodStatus
}

/** GET /api/reviews: one row of the review register, newest first. */
export interface ReviewRegisterItem {
  id: number
  employee_id: number
  employee_code: string
  employee_name: string
  department: string
  review_period_id: number
  review_period_name: string
  quality_of_work: number
  delivery_ownership: number
  teamwork_collaboration: number
  /** Calculated by the backend; the frontend never submits it. */
  average_rating: number
  comments: string
  /** ISO timestamp with time zone. */
  submitted_at: string
}

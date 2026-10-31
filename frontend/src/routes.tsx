import { Route, Routes } from 'react-router-dom'
import { DashboardPage } from './features/dashboard/DashboardPage'
import { AddEmployeePage } from './features/employees/AddEmployeePage'
import { EmployeesPage } from './features/employees/EmployeesPage'
import { ComingSoonPage } from './features/placeholders/ComingSoonPage'
import { SubmitReviewPreviewPage } from './features/placeholders/SubmitReviewPreviewPage'
import { AppShell } from './layout/AppShell'

/** All screens. Every page sits inside AppShell (header and sidebar). */
export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<DashboardPage />} />
        <Route path="employees" element={<EmployeesPage />} />
        <Route path="employees/new" element={<AddEmployeePage />} />
        <Route
          path="review-periods"
          element={<ComingSoonPage title="Review Periods" description="Manage review periods." />}
        />
        <Route
          path="review-periods/new"
          element={
            <ComingSoonPage title="Create Review Period" description="Set up a new review period." />
          }
        />
        <Route
          path="review-register"
          element={
            <ComingSoonPage title="Review Register" description="View and filter submitted reviews." />
          }
        />
        <Route path="reviews/new" element={<SubmitReviewPreviewPage />} />
        <Route
          path="*"
          element={<ComingSoonPage title="Page not found" description="This page does not exist." />}
        />
      </Route>
    </Routes>
  )
}

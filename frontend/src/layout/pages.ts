/**
 * Every page of the application: its URL, title, parent (for breadcrumbs) and which sidebar item
 * it belongs to. Adding a screen means adding one entry here and one route in routes.tsx.
 */
export interface PageMeta {
  path: string
  title: string
  /** Sidebar item that is highlighted while this page is open. */
  navPath: string
  /** Page shown before this one in the breadcrumb trail. */
  parent?: string
}

export const PAGES: PageMeta[] = [
  { path: '/', title: 'Dashboard', navPath: '/' },
  { path: '/employees', title: 'Employees', navPath: '/employees', parent: '/' },
  { path: '/employees/new', title: 'Add Employee', navPath: '/employees', parent: '/employees' },
  { path: '/review-periods', title: 'Review Periods', navPath: '/review-periods', parent: '/' },
  {
    path: '/review-periods/new',
    title: 'Create Review Period',
    navPath: '/review-periods',
    parent: '/review-periods',
  },
  { path: '/review-register', title: 'Review Register', navPath: '/review-register', parent: '/' },
  {
    path: '/reviews/new',
    title: 'Submit Review',
    navPath: '/review-register',
    parent: '/review-register',
  },
]

export function findPage(pathname: string): PageMeta | undefined {
  return PAGES.find((page) => page.path === pathname)
}

/** The page and its ancestors, outermost first: Dashboard > Employees > Add Employee. */
export function breadcrumbTrail(page: PageMeta): PageMeta[] {
  const trail: PageMeta[] = [page]
  let parent = page.parent ? findPage(page.parent) : undefined
  while (parent) {
    trail.unshift(parent)
    parent = parent.parent ? findPage(parent.parent) : undefined
  }
  return trail
}

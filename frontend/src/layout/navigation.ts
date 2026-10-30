import type { SvgIconComponent } from '@mui/icons-material'
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined'
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined'
import EventNoteOutlinedIcon from '@mui/icons-material/EventNoteOutlined'
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined'

export interface NavItem {
  label: string
  path: string
  icon: SvgIconComponent
}

/** The sidebar entries, in display order. */
export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: DashboardOutlinedIcon },
  { label: 'Employees', path: '/employees', icon: PeopleOutlinedIcon },
  { label: 'Review Periods', path: '/review-periods', icon: EventNoteOutlinedIcon },
  { label: 'Review Register', path: '/review-register', icon: AssessmentOutlinedIcon },
]

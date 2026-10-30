import type { ReactElement } from 'react'
import { Chip, type ChipProps } from '@mui/material'
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined'
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined'
import LockOpenOutlinedIcon from '@mui/icons-material/LockOpenOutlined'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import type { EmployeeStatus, ReviewPeriodStatus } from '../types/api'

type Status = EmployeeStatus | ReviewPeriodStatus

const STATUS_STYLE: Record<Status, { color: ChipProps['color']; icon: ReactElement }> = {
  Active: { color: 'success', icon: <CheckCircleOutlinedIcon /> },
  Inactive: { color: 'default', icon: <BlockOutlinedIcon /> },
  Open: { color: 'success', icon: <LockOpenOutlinedIcon /> },
  Closed: { color: 'default', icon: <LockOutlinedIcon /> },
}

/** A status label. Each status has its own icon and its text, so colour is never the only cue. */
export function StatusChip({ status, size = 'small' }: { status: Status; size?: ChipProps['size'] }) {
  const { color, icon } = STATUS_STYLE[status]
  return <Chip label={status} color={color} icon={icon} size={size} variant="outlined" />
}

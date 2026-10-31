import { useEffect, useState } from 'react'
import { Alert } from '@mui/material'
import { useLocation, useNavigate } from 'react-router-dom'

/**
 * A confirmation sent by the previous screen through the navigation state, for example
 * "Chris Bell (EMP106) was added.". It is read once and then removed from the history entry, so
 * refreshing the page does not show it again. It can be dismissed.
 */
export function FlashNotice() {
  const location = useLocation()
  const navigate = useNavigate()
  const incoming = (location.state as { notice?: string } | null)?.notice
  const [notice, setNotice] = useState<string | null>(incoming ?? null)

  useEffect(() => {
    if (incoming) navigate(location.pathname, { replace: true, state: null })
  }, [incoming, location.pathname, navigate])

  if (!notice) return null
  return (
    <Alert severity="success" role="status" onClose={() => setNotice(null)}>
      {notice}
    </Alert>
  )
}

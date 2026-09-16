import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { clearToken } from '../../lib/api.js'
import { useSession } from '../../access/SessionContext.jsx'

export default function Logout() {
  const navigate = useNavigate()
  const { refresh } = useSession()

  useEffect(() => {
    clearToken()
    refresh()
    navigate('/login', { replace: true })
  }, [navigate, refresh])

  return null
}

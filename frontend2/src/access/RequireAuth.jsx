import { Navigate, Outlet } from 'react-router-dom'
import Shell from '../layouts/Shell.jsx'
import { useSession } from './SessionContext.jsx'

export default function RequireAuth() {
  const { session, loading } = useSession()

  if (loading) return null
  if (!session) return <Navigate to="/login" replace />

  return (
    <Shell>
      <Outlet />
    </Shell>
  )
}

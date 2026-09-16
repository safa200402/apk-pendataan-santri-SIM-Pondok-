import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSession } from './SessionContext.jsx'
import { PAGE_RULES } from './pageRules.js'

// Dipanggil di dalam tiap komponen halaman: useAccess('daftarSantri').
// Default (tanpa entry di PAGE_RULES): boleh asal ada sesi login -- lihat catatan di pageRules.js.
export function useAccess(pageKey) {
  const { session, loading } = useSession()
  const navigate = useNavigate()

  useEffect(() => {
    if (loading) return
    if (!session) {
      navigate('/login', { replace: true })
      return
    }
    const rule = PAGE_RULES[pageKey]
    const allowed = rule ? rule.allow(session) : true
    if (!allowed) {
      navigate('/beranda', { replace: true })
    }
  }, [pageKey, session, loading, navigate])

  return { session, loading }
}

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, getToken, clearToken } from '../lib/api.js'
import { loadAndApplyTheme } from '../lib/theme.js'
import { getRoleScopeOptions, getScopedSession, setRoleScope } from './roleScope.js'

const SessionContext = createContext(null)

export function SessionProvider({ children }) {
  const [rawSession, setRawSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [scopeTick, setScopeTick] = useState(0)

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setRawSession(null)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const data = await api('session')
      setRawSession(data.session || null)
      if (data.session) loadAndApplyTheme()
    } catch (error) {
      clearToken()
      setRawSession(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const session = useMemo(() => getScopedSession(rawSession), [rawSession, scopeTick])
  const scopeOptions = useMemo(() => getRoleScopeOptions(rawSession), [rawSession])
  const activeScopeLabel = session && session.scopeLabel ? session.scopeLabel : ''

  const selectScope = useCallback(
    (label) => {
      setRoleScope(rawSession, label)
      setScopeTick((t) => t + 1)
    },
    [rawSession]
  )

  return (
    <SessionContext.Provider value={{ session, rawSession, loading, refresh, scopeOptions, activeScopeLabel, selectScope }}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession dipanggil di luar <SessionProvider>.')
  return ctx
}
